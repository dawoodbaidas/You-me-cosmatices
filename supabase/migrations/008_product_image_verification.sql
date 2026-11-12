-- Apply before the matching application release. No existing image is declared
-- transparent without decoding its bytes. Existing images are verified lazily.
-- Forward-only: rollback the app first; retain receipts and validation on rollback.
begin;

alter table public.products add column if not exists image_verifications jsonb not null default '{}';

create table public.product_image_verifications (
  product_id uuid not null,
  source text not null,
  verification jsonb not null,
  primary key(product_id,source),
  check (coalesce(jsonb_typeof(verification)='object'
    and verification->'version'='1'::jsonb
    and jsonb_typeof(verification->'transparent')='boolean'
    and (verification->>'width')::integer>0
    and (verification->>'height')::integer>0
    and verification->>'sha256' ~ '^[a-f0-9]{64}$', false))
);
-- No FK: a new product's image is uploaded and verified before its first save.
alter table public.product_image_verifications enable row level security;
revoke all on public.product_image_verifications from public,anon,authenticated;
grant select,insert,update,delete on public.product_image_verifications to service_role;

-- The deployed database has an out-of-repository predicate. Fail clearly rather
-- than dropping a differently typed function (and its dependent protections).
do $$ begin
  if to_regprocedure('public.verified_scene_image(public.products)') is not null
    and (select prorettype from pg_proc where oid=to_regprocedure('public.verified_scene_image(public.products)')) <> 'text'::regtype
  then raise exception 'Inspect deployed verified_scene_image definition: expected text return type; do not drop it CASCADE'; end if;
end $$;

create or replace function public.verified_scene_image(p public.products) returns text
language sql immutable set search_path=public,pg_temp as $$
  select case when p.image_url is not null
    and p.image_verifications->p.image_url->'version'='1'::jsonb
    and p.image_verifications->p.image_url->'transparent'='true'::jsonb
    and p.image_verifications->p.image_url->>'sha256' ~ '^[a-f0-9]{64}$'
    then p.image_url end;
$$;

create function public.sync_product_image_verification() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare receipt jsonb;
begin
  -- Ignore client-written verification flags. Only the server receipt for the
  -- exact active source can establish eligibility; retain historical receipts.
  new.image_verifications := case when TG_OP='INSERT' then '{}'::jsonb else coalesce(old.image_verifications,'{}'::jsonb) end;
  if new.image_url is not null then
    select verification into receipt from public.product_image_verifications
      where product_id=new.id and source=new.image_url;
    new.image_verifications := new.image_verifications - new.image_url;
    if receipt is not null then
      new.image_verifications := new.image_verifications || jsonb_build_object(new.image_url,receipt);
    end if;
  end if;
  return new;
end $$;
revoke all on function public.sync_product_image_verification() from public;
-- Runs before existing image tracking/validation triggers. Metadata and active
-- URL become visible in the SAME row update, including the v4 save wrapper.
create trigger aaa_product_image_verification before insert or update on public.products
for each row execute function public.sync_product_image_verification();

create function public.refresh_product_image_verification(p_id uuid,p_source text,p_expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
  update public.products set image_url=image_url
    where id=p_id and image_url=p_source and updated_at=p_expected_updated_at;
  if not found then raise exception 'Product changed; reload' using errcode='40001'; end if;
end $$;
revoke all on function public.refresh_product_image_verification(uuid,text,timestamptz) from public,anon;
grant execute on function public.refresh_product_image_verification(uuid,text,timestamptz) to authenticated;

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
  then raise exception 'This section requires a verified transparent product image' using errcode='23514'; end if;
  delete from public.home_section_products where section=p_section;
  insert into public.home_section_products select p_section,id,position-1 from unnest(p_ids) with ordinality x(id,position);
  update public.home_sections set updated_at=now() where section=p_section;
end $$;

-- Cover direct membership writes as well as RPC saves.
create function public.check_home_section_image() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare p public.products;
begin
  select * into p from public.products where id=new.product_id for share;
  if public.verified_scene_image(p) is null then
    raise exception 'This section requires a verified transparent product image' using errcode='23514';
  end if;
  return new;
end $$;
create trigger home_section_verified_image before insert or update on public.home_section_products
for each row execute function public.check_home_section_image();

create function public.check_selected_product_image() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.image_url is distinct from old.image_url and public.verified_scene_image(new) is null
    and exists(select 1 from public.home_section_products where product_id=new.id)
  then raise exception 'Remove product from home sections before activating an opaque image' using errcode='23514'; end if;
  return new;
end $$;
create trigger zzz_selected_product_image before update on public.products
for each row execute function public.check_selected_product_image();

notify pgrst, 'reload schema';
commit;
