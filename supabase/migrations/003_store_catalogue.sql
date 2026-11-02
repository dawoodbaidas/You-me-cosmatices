-- Database-owned store departments, explicit inventory and revisioned catalogue.
-- Additive: preserves every existing product, variant, price and image URL.
begin;

create table public.store_categories (
  slug text primary key check (length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug <> 'all'),
  name_ar text not null check (length(trim(name_ar)) between 1 and 150),
  parent_slug text references public.store_categories(slug) on update cascade on delete restrict,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  check (parent_slug is null or parent_slug <> slug)
);
create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_slug text not null references public.store_categories(slug) on update cascade on delete cascade,
  primary key (product_id, category_slug)
);
create index product_categories_category_idx on public.product_categories(category_slug, product_id);
alter table public.products add column stock_quantity integer check (stock_quantity >= 0);
comment on column public.products.stock_quantity is 'NULL = not recorded, never an invented quantity. Set by the administrator.';
alter table public.products drop constraint products_category_check;
alter table public.products add constraint products_category_check check (length(trim(category)) between 1 and 150);

-- Move the existing delivery fee out of the client; preserve configured values.
insert into public.site_settings(key,value) values('store_shipping_fee','2.5') on conflict(key) do nothing;

-- Migrate the pre-existing navigation classifications once. These are existing
-- department definitions, not demo products. Runtime never infers membership.
create temporary table migrated_categories on commit drop as
with flags as (
  select p.*, category_label ~ 'رجال' as men,
    (category_label ~ 'نسائ' or slug = 'boutique-baby-powder') as women,
    (category = 'mist' or category_label ~ 'عطور|معطرات الجسم') as fragrance,
    category_label ~ 'الحقائب|الإكسسوارات الرجالية' as bags,
    (category_label ~ 'باقات|باكيجات|مجموعات العناية' or slug = 'boutique-baby-powder') as gifts,
    (category in ('makeup','lips') and slug <> 'eye-mask') as makeup
  from public.products p
), classified as (
  select *, ((category_label ~ 'العناية|البشرة|الوجه|الجسم|اليدين|القدمين|الاستحمام|العرق|الشمس|تونر|أجهزة'
    or slug in ('eye-mask','baby-powder-pink-brightening-cream')) and not fragrance and not bags and not gifts) as care
  from flags
)
select p.id as product_id, c.* from classified p cross join lateral (values
  ('men','رجالي',null::text,0,p.men),
  ('women','نسائي',null,1,p.women),
  ('perfumes','العطور',null,2,p.fragrance),
  ('makeup','المكياج',null,3,p.makeup),
  ('care','العناية',null,4,p.care),
  ('bags','الشنط والمحافظ',null,5,p.bags),
  ('gifts','الهدايا والبكجات',null,6,p.gifts),
  ('men-fragrance','العطور','men',0,p.men and p.fragrance),
  ('men-accessories','الشنط والمحافظ','men',1,p.men and p.bags),
  ('women-fragrance','العطور','women',0,p.women and p.fragrance),
  ('fragrance-men','رجالي','perfumes',0,p.fragrance and p.men),
  ('fragrance-women','نسائي','perfumes',1,p.fragrance and p.women),
  ('fragrance-other','عطور ومسك','perfumes',2,p.fragrance and not p.men and not p.women),
  ('lips','منتجات الشفاه','makeup',0,p.slug in ('lipstick-set','lip-liner-marker-rm','lip-oil','sence-lip-balm','moist-lip')),
  ('lipstick','روج','makeup',1,p.slug = 'lipstick-set'),
  ('mascara','مسكارا','makeup',2,p.slug in ('mascara','essence-mascara')),
  ('foundation','كريم أساس','makeup',3,p.slug in ('foundation','bb-7in1-foundation')),
  ('blush','بلاشر','makeup',4,p.slug = 'blush-palette'),
  ('eye','مكياج العيون','makeup',5,p.slug = 'eyebrow-pencil'),
  ('body','العناية بالجسم','care',0,p.care and p.category_label ~ 'الجسم|الاستحمام|القدمين|اليدين|العرق'),
  ('skin','العناية بالبشرة','care',1,p.care and p.category_label !~ 'الجسم|الاستحمام|القدمين|اليدين|العرق|أجهزة'),
  ('devices','أجهزة العناية','care',2,p.care and p.category_label ~ 'أجهزة'),
  ('wallets','المحافظ','bags',0,p.slug in ('dovis-leather-classical-mens-wallet','mens-classic-leather-wallet')),
  ('handbags','الشنط','bags',1,p.slug in ('mens-waterproof-crossbody-bag','mens-crossbody-bag-usb')),
  ('other','غير مصنف',null,7,not (p.men or p.women or p.fragrance or p.makeup or p.care or p.bags or p.gifts))
) c(slug,name_ar,parent_slug,sort_order,matches) where c.matches;

insert into public.store_categories(slug,name_ar,parent_slug,sort_order)
select distinct slug,name_ar,parent_slug,sort_order from migrated_categories where parent_slug is null;
insert into public.store_categories(slug,name_ar,parent_slug,sort_order)
select distinct c.slug,c.name_ar,c.parent_slug,c.sort_order from migrated_categories c
where c.parent_slug is not null and exists (select 1 from public.store_categories p where p.slug = c.parent_slug);
insert into public.product_categories(product_id,category_slug)
select distinct product_id,slug from migrated_categories where exists (select 1 from public.store_categories c where c.slug = migrated_categories.slug);

create trigger store_categories_set_updated_at before update on public.store_categories
for each row execute function public.set_updated_at();

create function public.check_store_category_parent() returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(736841,1);
  if new.parent_slug is not null and (exists (select 1 from public.store_categories where slug = new.parent_slug and parent_slug is not null)
    or exists (select 1 from public.store_categories where parent_slug = new.slug)) then
    raise exception 'Only one subdepartment level is supported' using errcode = '23514';
  end if;
  return new;
end; $$;
create trigger store_category_parent before insert or update on public.store_categories
for each row execute function public.check_store_category_parent();

alter table public.store_categories enable row level security;
alter table public.product_categories enable row level security;
create policy store_categories_public_read on public.store_categories for select to anon,authenticated using (is_active);
create policy store_categories_admin on public.store_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_categories_public_read on public.product_categories for select to anon,authenticated
using (exists (select 1 from public.products p where p.id=product_id and p.is_active)
  and exists (select 1 from public.store_categories c where c.slug=category_slug and c.is_active));
create policy product_categories_admin on public.product_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.store_categories,public.product_categories to anon;
grant select,insert,update,delete on public.store_categories,public.product_categories to authenticated;

create table public.store_revision (id integer primary key check (id=1), version bigint not null default 1);
insert into public.store_revision(id) values(1);
alter table public.store_revision enable row level security;
create policy store_revision_public_read on public.store_revision for select to anon,authenticated using(true);
grant select on public.store_revision to anon,authenticated;

create function public.bump_store_revision() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.store_revision set version=version+1 where id=1;
  return null;
end; $$;
revoke all on function public.bump_store_revision() from public;
create trigger products_store_revision after insert or update or delete on public.products for each statement execute function public.bump_store_revision();
create trigger variants_store_revision after insert or update or delete on public.product_variants for each statement execute function public.bump_store_revision();
create trigger categories_store_revision after insert or update or delete on public.store_categories for each statement execute function public.bump_store_revision();
create trigger memberships_store_revision after insert or update or delete on public.product_categories for each statement execute function public.bump_store_revision();
create trigger settings_store_revision after insert or update or delete on public.site_settings for each statement execute function public.bump_store_revision();

-- One SQL snapshot: products, memberships, categories and settings are consistent.
create function public.get_store_catalogue(p_revision text default null) returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
 select jsonb_build_object(
  'revision',(select version::text from public.store_revision where id=1),
  'products',coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object(
    'product_variants',coalesce((select jsonb_agg(to_jsonb(v) order by v.sort_order,v.id) from public.product_variants v where v.product_id=p.id and v.is_active),'[]'::jsonb),
    'product_categories',coalesce((select jsonb_agg(jsonb_build_object('category_slug',pc.category_slug)) from public.product_categories pc where pc.product_id=p.id),'[]'::jsonb)
   ) order by p.sort_order,p.id) from public.products p where p.is_active),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.slug) from public.store_categories c where c.is_active),'[]'::jsonb),
  'settings',coalesce((select jsonb_agg(jsonb_build_object('key',key,'value',value)) from public.site_settings),'[]'::jsonb)
 );
$$;
revoke all on function public.get_store_catalogue(text) from public;
grant execute on function public.get_store_catalogue(text) to anon,authenticated;

-- Realtime transmits only a revision number, never inventory/admin records.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.store_revision;
  end if;
end $$;

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

commit;
