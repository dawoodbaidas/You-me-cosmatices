-- Additive merchandising and immutable WhatsApp order snapshots. Run after 003.
begin;

alter table public.products add column original_price numeric(10,3);
alter table public.products add column discount_enabled boolean not null default false;
alter table public.products add column is_new boolean not null default false;
update public.products set original_price=coalesce(old_price,price),
 discount_enabled=old_price>price, is_new=coalesce(trim(badge) ~* '^(new|جديد)$',false)
 where old_price>price;
update public.products set original_price=price, is_new=coalesce(trim(badge) ~* '^(new|جديد)$',false) where original_price is null;
update public.products set old_price=null where not discount_enabled;
-- Variant prices are regular prices; preserve existing effective prices on upgrade.
update public.product_variants v set price=round(v.price*p.original_price/p.price,3)
 from public.products p where p.id=v.product_id and p.discount_enabled and p.price>0;
alter table public.products alter column original_price set not null;
alter table public.products add constraint products_discount_valid check (
 original_price>=0 and ((discount_enabled and original_price>0 and price>=0 and price<original_price and old_price=original_price)
 or (not discount_enabled and price=original_price and old_price is null)));

-- The save RPC also accepts the previous price/old_price payload during rollout.
create function public.normalize_product_pricing() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' and new.original_price is null then
   new.discount_enabled := coalesce(new.old_price>new.price,false);
   new.original_price := case when new.discount_enabled then new.old_price else new.price end;
 end if;
 if new.discount_enabled then new.old_price:=new.original_price;
 else new.price:=new.original_price; new.old_price:=null; end if;
 return new;
end; $$;
create trigger products_normalize_pricing before insert or update on public.products for each row execute function public.normalize_product_pricing();

create table public.home_sections (
 section text primary key check(section in ('hero','bestsellers')),
 updated_at timestamptz not null default now()
);
create table public.home_section_products (
 section text not null references public.home_sections(section) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 position integer not null check(position>=0),
 primary key(section,product_id), unique(section,position) deferrable initially deferred
);
insert into public.home_sections(section) values('hero'),('bestsellers');
-- Reproduce scene-products.ts's previous selection once. Empty lists stay empty.
with ordered as (
 select id,slug,is_featured,row_number() over(order by
  case slug when 'body-mist' then 0 when 'aloe-foam' then 1 when 'foundation' then 2 when 'mascara' then 3 when 'musk-tahara-oil' then 4 else 5 end,
  sort_order,id)-1 as position
 from public.products where is_active and image_url is not null
) insert into public.home_section_products select 'hero',id,position from ordered where position<5;
with cutouts as (
 select id, row_number() over(order by case slug when 'body-mist' then 0 when 'aloe-foam' then 1 when 'foundation' then 2 when 'mascara' then 3 when 'musk-tahara-oil' then 4 else 5 end,sort_order,id)-1 position
 from public.products where is_active and image_url is not null and slug in ('body-mist','aloe-foam','foundation','mascara','musk-tahara-oil')
), fallback as (
 select id,row_number() over(order by sort_order,id)-1 position from public.products
 where is_active and is_featured and image_url is not null and not exists(select 1 from cutouts)
) insert into public.home_section_products select 'bestsellers',id,position from (select * from cutouts union all select * from fallback) chosen where position<6;
alter table public.home_sections enable row level security;
alter table public.home_section_products enable row level security;
create policy home_sections_read on public.home_sections for select to anon,authenticated using(true);
create policy home_section_products_read on public.home_section_products for select to anon,authenticated using(true);
create policy home_sections_admin on public.home_sections for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy home_section_products_admin on public.home_section_products for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.home_sections,public.home_section_products to anon;
grant select,insert,update,delete on public.home_sections,public.home_section_products to authenticated;
create trigger home_sections_updated before update on public.home_sections for each row execute function public.set_updated_at();
create trigger home_sections_revision after insert or update or delete on public.home_section_products for each statement execute function public.bump_store_revision();

create function public.admin_save_home_section(p_section text,p_ids uuid[],p_expected_updated_at timestamptz) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 perform 1 from public.home_sections where section=p_section and updated_at=p_expected_updated_at for update;
 if not found then raise exception 'Section changed; reload' using errcode='40001'; end if;
 if p_ids is null or cardinality(p_ids)>(case when p_section='hero' then 5 else 100 end) or exists(select 1 from unnest(p_ids) id group by id having count(*)>1)
 or exists(select 1 from unnest(p_ids) id where not exists(select 1 from public.products p where p.id=id)) then raise exception 'Invalid products' using errcode='22023'; end if;
 delete from public.home_section_products where section=p_section;
 insert into public.home_section_products select p_section,id,position-1 from unnest(p_ids) with ordinality x(id,position);
 update public.home_sections set updated_at=now() where section=p_section;
end; $$;
revoke all on function public.admin_save_home_section(text,uuid[],timestamptz) from public,anon;
grant execute on function public.admin_save_home_section(text,uuid[],timestamptz) to authenticated;

create function public.admin_move_products(p_ids uuid[],p_target text) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_ids is null or cardinality(p_ids) not between 1 and 1000 or exists(select 1 from unnest(p_ids) id where not exists(select 1 from products p where p.id=id)) then raise exception 'Invalid products'; end if;
 if p_target is not null then perform 1 from public.store_categories where slug=p_target for key share;
 if not found then raise exception 'Target category missing'; end if; end if;
 perform 1 from public.products where id=any(p_ids) order by id for update;
 delete from public.product_categories where product_id=any(p_ids);
 if p_target is not null then insert into public.product_categories select distinct id,p_target from unnest(p_ids) id; end if;
 update public.products set updated_at=now() where id=any(p_ids);
end; $$;
revoke all on function public.admin_move_products(uuid[],text) from public,anon;
grant execute on function public.admin_move_products(uuid[],text) to authenticated;

create function public.admin_delete_category(p_slug text,p_expected_updated_at timestamptz,p_target text default null) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare affected uuid[];
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_target=p_slug then raise exception 'Target must differ'; end if;
 -- Serialize membership changes, including edits from other admin sessions.
 lock table public.product_categories in share row exclusive mode;
 perform 1 from public.store_categories where slug=p_slug and updated_at=p_expected_updated_at for update;
 if not found then raise exception 'Category changed; reload' using errcode='40001'; end if;
 if p_target is not null then perform 1 from public.store_categories where slug=p_target for key share;
 if not found then raise exception 'Target category missing'; end if; end if;
 select array_agg(product_id) into affected from public.product_categories where category_slug=p_slug;
 delete from public.product_categories where product_id=any(affected);
 if p_target is not null then insert into public.product_categories select id,p_target from unnest(affected) id; end if;
 -- Reparent children rather than deleting their products or categories.
 update public.store_categories set parent_slug=(select parent_slug from public.store_categories where slug=p_slug) where parent_slug=p_slug;
 delete from public.store_categories where slug=p_slug;
 update public.products set updated_at=now() where id=any(affected);
end; $$;
revoke all on function public.admin_delete_category(text,timestamptz,text) from public,anon;
grant execute on function public.admin_delete_category(text,timestamptz,text) to authenticated;

create function public.admin_category_counts() returns table(slug text,product_count bigint) language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 return query select c.slug,count(pc.product_id) from public.store_categories c left join public.product_categories pc on pc.category_slug=c.slug group by c.slug;
end; $$;
revoke all on function public.admin_category_counts() from public,anon;
grant execute on function public.admin_category_counts() to authenticated;

-- Original files are retained when background removal is off.
update storage.buckets set allowed_mime_types=array['image/webp','image/png','image/jpeg','image/gif','image/avif','image/tiff'] where id='product-images';
drop policy product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_admin() and name ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|png|jpg|gif|avif|tiff)$');
drop policy product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_admin()) with check(bucket_id='product-images' and public.is_admin() and name ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|png|jpg|gif|avif|tiff)$');

create table public.store_orders (
 id uuid primary key,
 created_at timestamptz not null default now(),
 currency text not null,
 subtotal numeric(14,3) not null check(subtotal>=0),
 shipping numeric(10,3) check(shipping>=0),
 total numeric(14,3) not null check(total=subtotal+coalesce(shipping,0)),
 snapshot jsonb not null
);
create table public.store_order_items (
 order_id uuid not null references public.store_orders(id) on delete restrict,
 position integer not null,
 product_id uuid references public.products(id) on delete set null,
 variant_id uuid references public.product_variants(id) on delete set null,
 name_ar text not null,
 variant_label text,
 quantity integer not null check(quantity between 1 and 99),
 unit_price numeric(10,3) not null check(unit_price>=0),
 primary key(order_id,position)
);
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
create policy store_orders_admin_read on public.store_orders for select to authenticated using(public.is_admin());
create policy store_order_items_admin_read on public.store_order_items for select to authenticated using(public.is_admin());
grant select on public.store_orders,public.store_order_items to authenticated;
revoke insert,update,delete on public.store_orders,public.store_order_items from anon,authenticated;

-- Public checkout can only create a current-price snapshot, never submit prices.
create function public.create_store_order(p_id uuid,p_lines jsonb,p_expected_total numeric) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 item jsonb; p public.products; v public.product_variants; amount numeric; regular numeric;
 qty integer; subtotal numeric:=0; shipping numeric; threshold numeric; total numeric;
 changed boolean:=false; items jsonb:='[]'; saved jsonb; settings jsonb; seen text[]:='{}'; line_key text;
begin
 if p_id is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid cart' using errcode='22023'; end if;
 -- A retry of this random checkout token returns the same immutable order.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select snapshot into saved from public.store_orders where id=p_id;
 if found then return saved; end if;
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
  if not found then raise exception 'Product unavailable'; end if;
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

create or replace function public.admin_save_product(p_product jsonb, p_variants jsonb, p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  target_id uuid := (p_product->>'id')::uuid;
  previous_image text;
  saved public.products;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if exists(select 1 from jsonb_each(p_product) x where x.key in ('price','old_price','original_price') and x.value<>'null'::jsonb and ((x.value#>>'{}')::numeric<>round((x.value#>>'{}')::numeric,3) or (x.value#>>'{}')::numeric not between 0 and 100000)) then raise exception 'Invalid price precision' using errcode='22023'; end if;
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 100 then
    raise exception 'Invalid variants' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_variants) v where (v->>'price')::numeric not between 0 and 100000 or (v->>'price')::numeric<>round((v->>'price')::numeric,3)) then raise exception 'Invalid variant price precision' using errcode='22023'; end if;
  if p_expected_updated_at is null then
    insert into public.products (id, slug, name_ar, name_en, category, category_label, price)
    values (target_id, p_product->>'slug', p_product->>'name_ar', p_product->>'name_en', p_product->>'category', p_product->>'category_label', (p_product->>'price')::numeric);
  else
    select image_url into previous_image from public.products
      where id = target_id and updated_at = p_expected_updated_at for update;
    if not found then raise exception 'Product changed; reload before saving' using errcode = '40001'; end if;
  end if;

  update public.products set
    slug = p_product->>'slug', name_ar = p_product->>'name_ar', name_en = p_product->>'name_en',
    description = p_product->>'description', category = p_product->>'category', category_label = p_product->>'category_label',
    price = (p_product->>'price')::numeric, old_price = (p_product->>'old_price')::numeric,
    badge = p_product->>'badge', benefits = p_product->'benefits',
    original_price = coalesce((p_product->>'original_price')::numeric, (p_product->>'old_price')::numeric, (p_product->>'price')::numeric),
    discount_enabled = coalesce((p_product->>'discount_enabled')::boolean, (p_product->>'old_price')::numeric > (p_product->>'price')::numeric, false),
    is_new = coalesce((p_product->>'is_new')::boolean, is_new),
    is_active = (p_product->>'is_active')::boolean, is_featured = (p_product->>'is_featured')::boolean,
    sort_order = (p_product->>'sort_order')::integer,
    stock_quantity = case when p_product ? 'stock_quantity' then (p_product->>'stock_quantity')::integer else stock_quantity end,
    image_url = case when p_product ? 'image_url' then p_product->>'image_url' else image_url end
  where id = target_id returning * into saved;

  if exists (select 1 from jsonb_to_recordset(p_variants) as v(id uuid)
    join public.product_variants existing on existing.id = v.id where existing.product_id <> target_id) then
    raise exception 'Variant belongs to another product' using errcode = '22023';
  end if;

  delete from public.product_variants where product_id = target_id
    and id not in (select (v->>'id')::uuid from jsonb_array_elements(p_variants) v);
  insert into public.product_variants (id, product_id, label, price, is_active, sort_order)
    select v.id, target_id, trim(v.label), v.price, v.is_active, v.sort_order
    from jsonb_to_recordset(p_variants) as v(id uuid, label text, price numeric, is_active boolean, sort_order integer)
  on conflict (id) do update set label = excluded.label, price = excluded.price,
    is_active = excluded.is_active, sort_order = excluded.sort_order;
  if p_product ? 'category_slugs' then
    if jsonb_typeof(p_product->'category_slugs') <> 'array' then raise exception 'Invalid departments' using errcode = '22023'; end if;
    delete from public.product_categories where product_id=target_id;
    insert into public.product_categories(product_id,category_slug)
      select target_id, value from jsonb_array_elements_text(p_product->'category_slugs');
  end if;
  return jsonb_build_object('id', saved.id, 'updated_at', saved.updated_at, 'previous_image', previous_image);
end;
$$;
revoke all on function public.admin_save_product(jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.admin_save_product(jsonb, jsonb, timestamptz) to authenticated;


create or replace function public.get_store_catalogue(p_revision text default null) returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
 select jsonb_build_object(
  'revision',(select version::text from public.store_revision where id=1),
  'products',coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object(
    'product_variants',coalesce((select jsonb_agg(to_jsonb(v) order by v.sort_order,v.id) from public.product_variants v where v.product_id=p.id and v.is_active),'[]'::jsonb),
    'product_categories',coalesce((select jsonb_agg(jsonb_build_object('category_slug',pc.category_slug)) from public.product_categories pc where pc.product_id=p.id),'[]'::jsonb)
   ) order by p.sort_order,p.id) from public.products p where p.is_active),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.slug) from public.store_categories c where c.is_active),'[]'::jsonb),
  'home_sections',coalesce((select jsonb_object_agg(s.section,coalesce((select jsonb_agg(h.product_id order by h.position) from public.home_section_products h where h.section=s.section),'[]'::jsonb)) from public.home_sections s),'{}'::jsonb),
  'settings',coalesce((select jsonb_agg(jsonb_build_object('key',key,'value',value)) from public.site_settings),'[]'::jsonb)
 );
$$;
revoke all on function public.get_store_catalogue(text) from public;
grant execute on function public.get_store_catalogue(text) to anon,authenticated;


create or replace function public.admin_save_product_prices(p_id uuid,p_price numeric,p_old_price numeric,p_variants jsonb,p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 perform 1 from public.products where id=p_id and updated_at=p_expected_updated_at for update;
 if not found then raise exception 'Product changed; reload' using errcode='40001'; end if;
 if p_price is null or p_price<>round(p_price,3) or p_price not between 0 and 100000 or (p_old_price is not null and (p_old_price<=p_price or p_old_price>100000 or p_old_price<>round(p_old_price,3))) then raise exception 'Invalid prices'; end if;
 if exists(select 1 from jsonb_each_text(p_variants) v where v.value::numeric<>round(v.value::numeric,3) or v.value::numeric not between 0 and 100000 or not exists(select 1 from public.product_variants pv where pv.id=v.key::uuid and pv.product_id=p_id)) then raise exception 'Invalid variant'; end if;
 update public.products set price=p_price,original_price=coalesce(p_old_price,p_price),old_price=p_old_price,discount_enabled=p_old_price is not null where id=p_id;
 update public.product_variants pv set price=v.value::numeric from jsonb_each_text(p_variants) v where pv.id=v.key::uuid and pv.product_id=p_id;
end; $$;
commit;
