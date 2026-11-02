-- Additive production upgrade. Do not run the initial seed again.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 4194304, allowed_mime_types = array['image/webp'];

create policy product_images_admin_select on storage.objects for select to authenticated
using (bucket_id = 'product-images' and public.is_admin());
create policy product_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin() and name ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy product_images_admin_update on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin() and name ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy product_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- Keep anon reads independent of is_admin(), whose execution is restricted to
-- authenticated users. Restrict variant reads to active parent products too.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (is_active);
create policy products_admin_read on public.products for select to authenticated using (public.is_admin());
drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants for select to anon, authenticated
using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy product_variants_admin_read on public.product_variants for select to authenticated using (public.is_admin());

-- Defer label uniqueness until commit, permitting label swaps without changing IDs.
alter table public.product_variants drop constraint product_variants_product_label_key;
alter table public.product_variants add constraint product_variants_product_label_key
unique (product_id, label) deferrable initially deferred;

create or replace function public.admin_save_product(p_product jsonb, p_variants jsonb, p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  target_id uuid := (p_product->>'id')::uuid;
  previous_image text;
  saved public.products;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 100 then
    raise exception 'Invalid variants' using errcode = '22023';
  end if;
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
    is_active = (p_product->>'is_active')::boolean, is_featured = (p_product->>'is_featured')::boolean,
    sort_order = (p_product->>'sort_order')::integer,
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
  return jsonb_build_object('id', saved.id, 'updated_at', saved.updated_at, 'previous_image', previous_image);
end;
$$;
revoke all on function public.admin_save_product(jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.admin_save_product(jsonb, jsonb, timestamptz) to authenticated;
create or replace function public.admin_save_product_prices(p_id uuid, p_price numeric, p_old_price numeric, p_variants jsonb, p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  perform 1 from public.products where id = p_id and updated_at = p_expected_updated_at for update;
  if not found then raise exception 'Product changed; reload before saving' using errcode = '40001'; end if;
  if exists (select 1 from jsonb_each_text(p_variants) v
    where not exists (select 1 from public.product_variants pv where pv.id = v.key::uuid and pv.product_id = p_id)) then
    raise exception 'Variant does not belong to this product' using errcode = '22023';
  end if;
  update public.products set price = p_price, old_price = p_old_price where id = p_id;
  update public.product_variants pv set price = v.value::numeric
    from jsonb_each_text(p_variants) v where pv.id = v.key::uuid and pv.product_id = p_id;
end;
$$;
revoke all on function public.admin_save_product_prices(uuid, numeric, numeric, jsonb, timestamptz) from public, anon;
grant execute on function public.admin_save_product_prices(uuid, numeric, numeric, jsonb, timestamptz) to authenticated;
commit;
