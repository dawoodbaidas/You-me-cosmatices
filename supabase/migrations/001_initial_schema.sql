-- You & Me Cosmetics — initial schema
-- Products, variants and storefront settings live in Supabase Postgres.
-- Public visitors can read; only whitelisted admin accounts can write.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ helpers

-- Returns true when the current JWT belongs to a listed admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and coalesce(
      (auth.jwt() -> 'app_metadata') ->> 'role' = 'admin',
      false
    )
    and (
      select exists (
        select 1
        from public.admin_emails
        where email = lower(auth.jwt() ->> 'email')
          and is_active
      )
    );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------------ tables

create table if not exists public.admin_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  note        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name_ar        text not null,
  name_en        text not null,
  description    text,
  category       text not null,
  category_label text not null,
  price          numeric(10, 3) not null check (price >= 0),
  old_price      numeric(10, 3) check (old_price is null or old_price >= price),
  image_url      text,
  badge          text,
  benefits       jsonb not null default '[]'::jsonb,
  is_active      boolean not null default true,
  is_featured    boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint products_category_check check (
    category in ('packages', 'mist', 'skincare', 'makeup', 'lips')
  )
);

create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order);

create index if not exists products_category_idx
  on public.products (category);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  label       text not null,
  price       numeric(10, 3) not null check (price >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint product_variants_product_label_key unique (product_id, label)
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id, sort_order);

create table if not exists public.site_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------ triggers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- RLS

alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.site_settings     enable row level security;
alter table public.admin_emails      enable row level security;

-- storefront: anyone may read active rows
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select
  using (is_active or public.is_admin());

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
  for select
  using (is_active or public.is_admin());

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select
  using (true);

-- catalogue writes: admins only
drop policy if exists products_admin_insert on public.products;
create policy products_admin_insert on public.products
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete to authenticated
  using (public.is_admin());

drop policy if exists product_variants_admin_insert on public.product_variants;
create policy product_variants_admin_insert on public.product_variants
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists product_variants_admin_update on public.product_variants;
create policy product_variants_admin_update on public.product_variants
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_variants_admin_delete on public.product_variants;
create policy product_variants_admin_delete on public.product_variants
  for delete to authenticated
  using (public.is_admin());

drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The admin allow-list is not publicly readable. Only admins may read or
-- manage it; it holds e-mail addresses, so anon access is denied entirely.
drop policy if exists admin_emails_admin_read on public.admin_emails;
create policy admin_emails_admin_read on public.admin_emails
  for select to authenticated
  using (public.is_admin());

drop policy if exists admin_emails_admin_write on public.admin_emails;
create policy admin_emails_admin_write on public.admin_emails
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------------- first admin
-- Two steps, both run from the Supabase SQL editor (service role, bypasses RLS):
--
--   1) allow-list the address (already seeded below — edit the value first):
insert into public.admin_emails (email, note)
values ('admin@gmail.com', 'owner — replace if needed')
on conflict (email) do update set note = excluded.note;

--   2) promote the matching auth user to admin (app_metadata is not user-writable
--      from the client, so it can only be set here or from the dashboard):
--
--      update auth.users
--         set raw_app_meta_data =
--               coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonbFp
--       where email = 'youme.work20@gmail.com';
--
--   To add another admin later:
--
--      insert into public.admin_emails (email, note) values ('...', 'staff');
--      update auth.users
--         set raw_app_meta_data =
--               coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--       where email = '...';
