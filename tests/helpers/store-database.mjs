import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

export async function storeDatabase() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    set check_function_bodies=off;
  `)
  for (const migration of ['001_initial_schema.sql','002_product_management.sql','003_store_catalogue.sql']) {
    let sql = await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8')
    sql = sql.replace('create extension if not exists "pgcrypto";', '')
    await db.exec(sql)
  }
  await db.exec(`grant usage on schema public,auth,storage to anon,authenticated;
    grant select on products,product_variants,site_settings to anon;
    grant select,insert,update,delete on all tables in schema public,storage to authenticated;
    revoke insert,update,delete on store_revision from authenticated;
    insert into admin_emails(email) values('test@example.com'); set role authenticated;`)
  await db.query("select set_config('test.uid',$1,false),set_config('test.jwt',$2,false)", [randomUUID(), JSON.stringify({ email:'test@example.com', app_metadata:{role:'admin'} })])
  return db
}
