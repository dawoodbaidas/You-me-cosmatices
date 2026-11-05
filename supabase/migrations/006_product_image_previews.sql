begin;
create table public.product_image_previews(
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null,
 expected_updated_at timestamptz,
 original_url text not null,
 processed_url text not null,
 created_at timestamptz not null default now()
);
alter table public.product_image_previews enable row level security;
create policy product_image_previews_admin on public.product_image_previews for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,delete on public.product_image_previews to authenticated;

alter function public.admin_save_product(jsonb,jsonb,timestamptz) rename to admin_save_product_v4;
revoke execute on function public.admin_save_product_v4(jsonb,jsonb,timestamptz) from public,anon;
create function public.admin_save_product(p_product jsonb,p_variants jsonb,p_expected_updated_at timestamptz) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare preview public.product_image_previews; current_product public.products; result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
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
 if preview.id is not null then
  update public.products set original_image_url=preview.original_url,processed_image_url=preview.processed_url where id=preview.product_id;
  delete from public.product_image_previews where id=preview.id;
 end if;
 return result;
end; $$;
revoke all on function public.admin_save_product(jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.admin_save_product(jsonb,jsonb,timestamptz) to authenticated;
commit;
