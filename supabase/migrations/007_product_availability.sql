begin;

alter table public.products add column is_out_of_stock boolean not null default false;
comment on column public.products.is_out_of_stock is 'Independent purchase stop; never changes stock_quantity or public visibility.';

-- Extend the existing image-preview wrapper; retain the atomic v4 product,
-- variant and category save, its row lock, RLS and optimistic concurrency.
create or replace function public.admin_save_product(p_product jsonb,p_variants jsonb,p_expected_updated_at timestamptz) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare preview public.product_image_previews; current_product public.products; result jsonb; saved_version timestamptz;
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_product ? 'is_out_of_stock' and jsonb_typeof(p_product->'is_out_of_stock') is distinct from 'boolean' then
  raise exception 'Invalid availability' using errcode='22023';
 end if;
 if p_product ? 'image_preview_id' then
  select * into preview from public.product_image_previews where id=(p_product->>'image_preview_id')::uuid and product_id=(p_product->>'id')::uuid for update;
  if not found or preview.expected_updated_at is distinct from p_expected_updated_at then raise exception 'Image preview is stale' using errcode='40001'; end if;
  p_product:=p_product||jsonb_build_object('image_url',preview.processed_url);
 elsif coalesce((p_product->>'restore_image')::boolean,false) then
  select * into current_product from public.products where id=(p_product->>'id')::uuid for update;
  if current_product.original_image_url is null then raise exception 'Original image missing'; end if;
  p_product:=p_product||jsonb_build_object('image_url',current_product.original_image_url);
 end if;
 result:=public.admin_save_product_v4(p_product,p_variants,p_expected_updated_at);
 if p_product ? 'is_out_of_stock' then
  update public.products set is_out_of_stock=(p_product->>'is_out_of_stock')::boolean
   where id=(p_product->>'id')::uuid and is_out_of_stock is distinct from (p_product->>'is_out_of_stock')::boolean;
 end if;
 if preview.id is not null then
  update public.products set original_image_url=preview.original_url,processed_image_url=preview.processed_url where id=preview.product_id;
  delete from public.product_image_previews where id=preview.id;
 end if;
 select updated_at into saved_version from public.products where id=(p_product->>'id')::uuid;
 return result||jsonb_build_object('updated_at',saved_version);
end; $$;
revoke all on function public.admin_save_product(jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.admin_save_product(jsonb,jsonb,timestamptz) to authenticated;

-- Keep trusted fresh pricing and snapshot writes. Idempotent retries must
-- validate the same cart's CURRENT availability before returning its snapshot.
create or replace function public.create_store_order(p_id uuid,p_lines jsonb,p_expected_total numeric) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 item jsonb; p public.products; v public.product_variants; amount numeric; regular numeric;
 qty integer; subtotal numeric:=0; shipping numeric; threshold numeric; total numeric;
 changed boolean:=false; items jsonb:='[]'; saved jsonb; previous_order jsonb; settings jsonb; seen text[]:='{}'; line_key text;
begin
 if p_id is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid cart' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select snapshot into previous_order from public.store_orders where id=p_id;
 if previous_order is not null and
  (select jsonb_agg(jsonb_build_array((x->>'productId')::uuid,(x->>'variantId')::uuid,(x->>'quantity')::numeric) order by (x->>'productId')::uuid,(x->>'variantId')::uuid) from jsonb_array_elements(p_lines) x)
  is distinct from
  (select jsonb_agg(jsonb_build_array((x->>'productId')::uuid,(x->>'variantId')::uuid,(x->>'quantity')::numeric) order by (x->>'productId')::uuid,(x->>'variantId')::uuid) from jsonb_array_elements(previous_order->'lines') x)
 then raise exception 'Checkout token belongs to another cart' using errcode='22023'; end if;
 perform 1 from public.products where id in (select (x->>'productId')::uuid from jsonb_array_elements(p_lines) x) order by id for share;
 perform 1 from public.product_variants where product_id in (select (x->>'productId')::uuid from jsonb_array_elements(p_lines) x) order by id for share;
 perform 1 from public.site_settings order by key for share;
 select coalesce(jsonb_object_agg(key,value),'{}') into settings from public.site_settings;
 for item in select value from jsonb_array_elements(p_lines) loop
  if jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric)
    or (item->>'quantity')::numeric not between 1 and 99 then raise exception 'Invalid quantity'; end if;
  qty:=(item->>'quantity')::integer;
  line_key:=concat(item->>'productId',':',item->>'variantId');
  if line_key=any(seen) then raise exception 'Duplicate line'; end if;
  seen:=array_append(seen,line_key);
  select * into p from public.products where id=(item->>'productId')::uuid and is_active;
  if not found or p.is_out_of_stock then raise exception 'Product unavailable'; end if;
  if p.stock_quantity is not null and p.stock_quantity<(select sum((x->>'quantity')::numeric) from jsonb_array_elements(p_lines) x where x->>'productId'=item->>'productId') then raise exception 'Stock unavailable'; end if;
  v:=null;
  if item->>'variantId' is not null then
   select * into v from public.product_variants where id=(item->>'variantId')::uuid and product_id=p.id and is_active;
   if not found then raise exception 'Variant unavailable'; end if;
  elsif exists(select 1 from public.product_variants where product_id=p.id and is_active) then raise exception 'Variant required'; end if;
  regular:=coalesce(v.price,p.original_price);
  amount:=case when v.id is null then p.price when p.discount_enabled then round(v.price*p.price/p.original_price,3) else v.price end;
  if (item->>'unitPrice')::numeric is distinct from amount then changed:=true; end if;
  subtotal:=subtotal+amount*qty;
  items:=items||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'nameAr',p.name_ar,'variantLabel',v.label,'quantity',qty,'unitPrice',amount));
 end loop;
 if previous_order is not null then return previous_order; end if;
 threshold:=nullif(settings->>'store_free_shipping_threshold','')::numeric;
 shipping:=case when threshold>0 and subtotal>=threshold then 0 else nullif(settings->>'store_shipping_fee','')::numeric end;
 total:=subtotal+coalesce(shipping,0);
 saved:=jsonb_build_object('id',p_id,'lines',items,'subtotal',subtotal,'shipping',shipping,'total',total,'currency',coalesce(settings->>'currency','JOD'),'whatsappNumber',settings->>'whatsapp_number','whatsappMessage',settings->>'whatsapp_message');
 if changed or total is distinct from p_expected_total then return saved||jsonb_build_object('changed',true); end if;
 insert into public.store_orders(id,currency,subtotal,shipping,total,snapshot) values(p_id,saved->>'currency',subtotal,shipping,total,saved);
 insert into public.store_order_items(order_id,position,product_id,variant_id,name_ar,variant_label,quantity,unit_price)
 select p_id,ordinality-1,(value->>'productId')::uuid,(value->>'variantId')::uuid,value->>'nameAr',value->>'variantLabel',(value->>'quantity')::integer,(value->>'unitPrice')::numeric from jsonb_array_elements(items) with ordinality;
 return saved;
end; $$;
revoke all on function public.create_store_order(uuid,jsonb,numeric) from public;
grant execute on function public.create_store_order(uuid,jsonb,numeric) to anon,authenticated;

commit;
