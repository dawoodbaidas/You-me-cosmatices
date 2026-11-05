-- Existing slug values remain immutable relationship keys; url_slug is public and mutable.
begin;
alter table public.store_categories add column id uuid not null default gen_random_uuid() unique,
 add column url_slug text, add column image_path text,
 add column is_featured boolean not null default false,
 add column created_at timestamptz not null default now();
create index store_categories_parent_idx on public.store_categories(parent_slug,sort_order);
create table public.category_url_slugs(slug text primary key, category_id uuid not null references public.store_categories(id) on delete cascade);
create table public.category_paths(path text primary key, category_id uuid not null references public.store_categories(id) on delete cascade);
create index category_paths_category_idx on public.category_paths(category_id);
alter table public.category_paths enable row level security;
alter table public.category_url_slugs enable row level security;
create policy category_paths_read on public.category_paths for select to anon,authenticated using(exists(select 1 from public.store_categories c where c.id=category_id and c.is_active));
create policy category_paths_admin on public.category_paths for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy category_url_slugs_admin on public.category_url_slugs for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.category_paths to anon,authenticated;
grant select,insert,update,delete on public.category_paths,public.category_url_slugs to authenticated;

create function public.category_url_slug(value text) returns text language sql immutable set search_path=public,pg_temp as $$
 select coalesce(nullif(trim(both '-' from regexp_replace(lower(normalize(trim(value),NFKC)), '[^a-z0-9ء-غف-ي٠-٩]+','-','g')),''),'category');
$$;
create or replace function public.check_store_category_parent() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare base text; candidate text; suffix integer:=1;
begin
 -- All hierarchy writes serialize, including direct admin API writes.
 perform pg_advisory_xact_lock(57423005);
 if tg_op='UPDATE' and (new.slug<>old.slug or new.id<>old.id) then raise exception 'Category identity is immutable'; end if;
 if new.parent_slug is not null and (new.parent_slug=new.slug or exists(
  with recursive parents as (select slug,parent_slug from public.store_categories where slug=new.parent_slug
   union all select c.slug,c.parent_slug from public.store_categories c join parents p on c.slug=p.parent_slug)
  select 1 from parents where slug=new.slug)) then raise exception 'Circular category relationship'; end if;
 if new.image_path is not null and new.image_path !~ '^categories/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' then raise exception 'Invalid category image'; end if;
 if tg_op='INSERT' or new.name_ar is distinct from old.name_ar or old.url_slug is null then
  base:=left(public.category_url_slug(new.name_ar),150); candidate:=base;
  while exists(select 1 from public.category_url_slugs where slug=candidate and category_id<>new.id)
   or exists(select 1 from public.store_categories where url_slug=candidate and id<>new.id) loop
   suffix:=suffix+1; candidate:=base||'-'||suffix;
  end loop;
  new.url_slug:=candidate;
 else new.url_slug:=old.url_slug;
 end if;
 return new;
end; $$;

create function public.record_category_paths() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.category_url_slugs select url_slug,id from public.store_categories where url_slug is not null on conflict do nothing;
 insert into public.category_paths(path,category_id)
 with recursive tree as (
  select id,slug,url_slug::text path from public.store_categories where parent_slug is null
  union all select c.id,c.slug,t.path||'/'||c.url_slug from public.store_categories c join tree t on c.parent_slug=t.slug
 ) select path,id from tree where path is not null on conflict do nothing;
 return null;
end; $$;
create trigger category_paths_record after insert or update on public.store_categories for each row execute function public.record_category_paths();
-- Update one at a time to reserve duplicate names safely.
do $$ declare c record; begin for c in select slug from public.store_categories order by slug loop update public.store_categories set name_ar=name_ar where slug=c.slug; end loop; end $$;
alter table public.store_categories alter column url_slug set not null;
alter table public.store_categories add constraint category_url_slug_unique unique(url_slug);

create function public.admin_save_category(p_category jsonb,p_expected_updated_at timestamptz) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(57423005);
 if p_expected_updated_at is null then
  insert into public.store_categories(slug,name_ar,parent_slug,sort_order,is_active,is_featured,image_path)
  values(p_category->>'slug',p_category->>'name_ar',p_category->>'parent_slug',(p_category->>'sort_order')::integer,(p_category->>'is_active')::boolean,coalesce((p_category->>'is_featured')::boolean,false),p_category->>'image_path');
 else
  update public.store_categories set name_ar=p_category->>'name_ar',parent_slug=p_category->>'parent_slug',sort_order=(p_category->>'sort_order')::integer,
   is_active=(p_category->>'is_active')::boolean,is_featured=coalesce((p_category->>'is_featured')::boolean,false),image_path=p_category->>'image_path'
   where slug=p_category->>'slug' and updated_at=p_expected_updated_at;
  if not found then raise exception 'Category changed; reload' using errcode='40001'; end if;
 end if;
end; $$;
revoke all on function public.admin_save_category(jsonb,timestamptz) from public,anon;
grant execute on function public.admin_save_category(jsonb,timestamptz) to authenticated;

create or replace function public.admin_delete_category(p_slug text,p_expected_updated_at timestamptz,p_target text default null) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(57423005);
 lock table public.product_categories in share row exclusive mode;
 perform 1 from public.store_categories where slug=p_slug and updated_at=p_expected_updated_at for update;
 if not found then raise exception 'Category changed; reload' using errcode='40001'; end if;
 if p_target is not null then
  if p_target=p_slug or exists(with recursive descendants as(select slug from public.store_categories where parent_slug=p_slug union all select c.slug from public.store_categories c join descendants d on c.parent_slug=d.slug) select 1 from descendants where slug=p_target) then raise exception 'Invalid target'; end if;
  perform 1 from public.store_categories where slug=p_target for key share;
  if not found then raise exception 'Target missing'; end if;
  insert into public.product_categories select product_id,p_target from public.product_categories where category_slug=p_slug on conflict do nothing;
 end if;
 -- Preserve all other memberships. Explicit detach also detaches child categories.
 update public.products set updated_at=now() where id in(select product_id from public.product_categories where category_slug=p_slug);
 delete from public.product_categories where category_slug=p_slug;
 update public.store_categories set parent_slug=p_target where parent_slug=p_slug;
 delete from public.store_categories where slug=p_slug;
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('category-images','category-images',true,4194304,array['image/webp']) on conflict(id) do nothing;
create policy category_images_read on storage.objects for select to anon,authenticated using(bucket_id='category-images');
create policy category_images_insert on storage.objects for insert to authenticated with check(bucket_id='category-images' and public.is_admin() and name ~ '^categories/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy category_images_delete on storage.objects for delete to authenticated using(bucket_id='category-images' and public.is_admin());

alter table public.products add column original_image_url text, add column processed_image_url text;
update public.products set original_image_url=image_url;
create function public.track_product_image() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.image_url is distinct from old.image_url and new.image_url is distinct from new.original_image_url and new.image_url is distinct from new.processed_image_url then
  new.original_image_url:=new.image_url; new.processed_image_url:=null;
 end if;
 return new;
end; $$;
create trigger product_image_original before update on public.products for each row execute function public.track_product_image();
create function public.admin_set_product_image(p_id uuid,p_expected_updated_at timestamptz,p_original text,p_processed text,p_active text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_original is null or (p_active is distinct from p_original and p_active is distinct from p_processed) then raise exception 'Invalid active image'; end if;
 update public.products set original_image_url=p_original,processed_image_url=p_processed,image_url=p_active where id=p_id and updated_at=p_expected_updated_at;
 if not found then raise exception 'Product changed; reload' using errcode='40001'; end if;
end; $$;
revoke all on function public.admin_set_product_image(uuid,timestamptz,text,text,text) from public,anon;
grant execute on function public.admin_set_product_image(uuid,timestamptz,text,text,text) to authenticated;
commit;
