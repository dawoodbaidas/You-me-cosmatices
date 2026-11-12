-- Apply after 008. Repeatable: replace only image eligibility functions.
-- Keep receipts, originals, triggers, RLS, ordering and revision/row locks intact.
begin;
create or replace function public.verified_scene_image(p public.products) returns text
language sql immutable set search_path=public,pg_temp as $$
  select nullif(btrim(p.image_url), '');
$$;
create or replace function public.admin_save_home_section(p_section text,p_ids uuid[],p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  perform 1 from public.home_sections where section=p_section and updated_at=p_expected_updated_at for update;
  if not found then raise exception 'Section changed; reload' using errcode='40001'; end if;
  if p_ids is null or cardinality(p_ids)>(case when p_section='hero' then 5 else 100 end)
    or exists(select 1 from unnest(p_ids) id group by id having count(*)>1)
    or exists(select 1 from unnest(p_ids) id where id is null or not exists(select 1 from public.products p where p.id=id))
  then raise exception 'Invalid products' using errcode='22023'; end if;
  perform 1 from public.products where id=any(p_ids) order by id for share;
  if exists(select 1 from public.products p where p.id=any(p_ids) and public.verified_scene_image(p) is null)
  then raise exception 'This section requires a product image' using errcode='23514'; end if;
  delete from public.home_section_products where section=p_section;
  insert into public.home_section_products select p_section,id,position-1 from unnest(p_ids) with ordinality x(id,position);
  update public.home_sections set updated_at=now() where section=p_section;
end $$;

-- Cover direct membership writes as well as RPC saves.
create or replace function public.check_home_section_image() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare p public.products;
begin
  select * into p from public.products where id=new.product_id for share;
  if public.verified_scene_image(p) is null then
    raise exception 'This section requires a product image' using errcode='23514';
  end if;
  return new;
end $$;


create or replace function public.check_selected_product_image() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.image_url is distinct from old.image_url and public.verified_scene_image(new) is null
    and exists(select 1 from public.home_section_products where product_id=new.id)
  then raise exception 'Selected products require an active image' using errcode='23514'; end if;
  return new;
end $$;



notify pgrst, 'reload schema';
commit;
