import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { PGlite } from '@electric-sql/pglite'
import { convertProductImage, managedImagePath } from '../src/lib/products/images.ts'
import { validateProduct } from '../src/lib/products/editor.ts'
import { mapProduct } from '../src/lib/products/map.ts'

const id = randomUUID()
const draft = { id, updatedAt: null, slug: 'test-product', name_ar: 'منتج', name_en: 'Product', description: null, category: 'skincare', category_label: 'العناية', price: 12.345, old_price: 15, badge: null, benefits: ['ترطيب'], is_active: true, is_featured: false, sort_order: 1, variants: [] }

test('admin sees inactive variants while storefront only receives active variants', () => {
  const row = { ...draft, image_url: null, updated_at: '2026-10-05T00:00:00Z', product_variants: [
    { id: randomUUID(), product_id: id, label: 'Hidden', price: '3', is_active: false, sort_order: 1 },
    { id: randomUUID(), product_id: id, label: 'Visible', price: '5', is_active: true, sort_order: 0 },
  ] }
  assert.equal(mapProduct(row).variants.length, 1)
  assert.equal(mapProduct(row, true).variants.length, 2)
  assert.equal(mapProduct(row, true).variants[0].label, 'Visible')
  assert.equal(mapProduct(row, true).updatedAt, row.updated_at)
})

test('validation rejects bad prices, duplicate labels and unsupported fields', () => {
  validateProduct(draft)
  for (const patch of [{ price: -1 }, { price: NaN }, { price: 1.0001 }, { old_price: 1 }, { category: '' }, { is_active: 'true' }, { sort_order: 1.5 }, { slug: 'bad slug' }, { benefits: {} }, { stock_quantity: -1 }, { stock_quantity: 1.5 }, { category_slugs: ['all'] }, { category_slugs: ['care', 'care'] }]) assert.throws(() => validateProduct({ ...draft, ...patch }))
  validateProduct({ ...draft, stock_quantity: null, category_slugs: [] })
  validateProduct({ ...draft, category: 'database-defined', stock_quantity: 5, category_slugs: ['database-defined'] })
  const v = { id: randomUUID(), label: 'A', price: 2, is_active: true, sort_order: 0 }
  assert.throws(() => validateProduct({ ...draft, variants: [v, { ...v, id: randomUUID() }] }))
})

test('actual WebP conversion, resize, aspect ratio, alpha and metadata removal', async () => {
  for (const format of ['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff']) {
    const input = await sharp({ create: { width: 2400, height: 1200, channels: 4, background: '#ff338880' } }).toFormat(format).withMetadata().toBuffer()
    const output = await convertProductImage(input)
    const meta = await sharp(output).metadata()
    assert.equal(meta.format, 'webp')
    assert.equal(meta.width, 1600)
    assert.equal(meta.height, 800)
    assert.equal(meta.exif, undefined)
    assert.equal(meta.icc, undefined)
    if (format === 'png') assert.equal(meta.hasAlpha, true)
  }
  const tiny = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'red' } }).png().toBuffer()
  assert.equal((await sharp(await convertProductImage(tiny)).metadata()).width, 20)
  await assert.rejects(convertProductImage(Buffer.from('not an image')))
  await assert.rejects(convertProductImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')))
})

test('cleanup only accepts this project, bucket and product folder', () => {
  const base = 'https://example.supabase.co'
  const path = `products/${id}/${randomUUID()}.webp`
  assert.equal(managedImagePath(`${base}/storage/v1/object/public/product-images/${path}`, id, base), path)
  for (const url of ['/products/legacy.png', `https://evil.test/storage/v1/object/public/product-images/${path}`, `${base}/storage/v1/object/public/other/${path}`, `${base}/storage/v1/object/public/product-images/products/${randomUUID()}/x.webp`]) assert.equal(managedImagePath(url, id, base), null)
})

test('migration, atomic CRUD/pricing, stable IDs, concurrency, cascade and RLS', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      set check_function_bodies = off;
    `)
    let initial = await readFile(new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url), 'utf8')
    initial = initial.replace('create extension if not exists "pgcrypto";', '')
    await db.exec(initial)
    const legacyId = randomUUID()
    await db.query("insert into products(id,slug,name_ar,name_en,category,category_label,price,image_url) values($1,'legacy','قديم','Legacy','lips','Lips',2,'/products/legacy.png')", [legacyId])
    const legacy = (await db.query('select * from products where id=$1', [legacyId])).rows[0]
    await db.exec(await readFile(new URL('../supabase/migrations/002_product_management.sql', import.meta.url), 'utf8'))
    assert.deepEqual((await db.query('select * from products where id=$1', [legacyId])).rows[0], legacy)
    await db.exec(await readFile(new URL('../supabase/migrations/003_store_catalogue.sql', import.meta.url), 'utf8'))
    const migrated = (await db.query('select * from products where id=$1', [legacyId])).rows[0]
    assert.equal(migrated.image_url, legacy.image_url)
    assert.equal(migrated.stock_quantity, null)
    await db.query('delete from products where id=$1', [legacyId])
    await db.exec(`grant usage on schema public, auth, storage to anon, authenticated;
      grant select, insert, update, delete on all tables in schema public, storage to anon, authenticated;
      insert into public.admin_emails(email) values ('test@example.com');
      set role authenticated;`)
    await db.query("select set_config('test.uid', $1, false), set_config('test.jwt', $2, false)", [randomUUID(), JSON.stringify({ email: 'test@example.com', app_metadata: { role: 'admin' } })])
    const variant = { id: randomUUID(), label: 'A', price: 5, is_active: true, sort_order: 0 }
    const otherVariant = { ...variant, id: randomUUID(), label: 'B', is_active: false }
    const save = async (p, variants, version) => (await db.query('select public.admin_save_product($1::jsonb,$2::jsonb,$3::timestamptz) as result', [JSON.stringify(p), JSON.stringify(variants), version])).rows[0].result
    const first = await save(draft, [variant, otherVariant], null)
    const firstRevision = (await db.query('select version from store_revision')).rows[0].version
    const updated = await save({ ...draft, name_en: 'Changed' }, [{ ...variant, label: 'B' }, { ...otherVariant, label: 'A' }], first.updated_at)
    assert.ok(Number((await db.query('select version from store_revision')).rows[0].version) > Number(firstRevision))
    assert.equal((await db.query('select id from product_variants where label = $1', ['B'])).rows[0].id, variant.id)
    await assert.rejects(save({ ...draft, price: 99 }, [], first.updated_at), /Product changed/)
    await assert.rejects(save({ ...draft, price: 13 }, [{ ...variant, price: -1 }], updated.updated_at))
    assert.equal(Number((await db.query('select price from products where id=$1', [id])).rows[0].price), draft.price)
    assert.equal((await db.query('select count(*)::int as n from product_variants')).rows[0].n, 2)
    await assert.rejects(db.query('select admin_save_product_prices($1,20,25,$2::jsonb,$3)', [id, JSON.stringify({ [randomUUID()]: 2 }), updated.updated_at]), /does not belong/)
    await db.query('select admin_save_product_prices($1,13,15,$2::jsonb,$3)', [id, JSON.stringify({ [variant.id]: 6 }), updated.updated_at])
    assert.equal(Number((await db.query('select price from product_variants where id=$1', [variant.id])).rows[0].price), 6)
    const version = (await db.query('select updated_at from products where id=$1', [id])).rows[0].updated_at
    const stocked = await save({ ...draft, stock_quantity: 7, category_slugs: ['makeup'] }, [variant, otherVariant], version)
    assert.equal((await db.query('select stock_quantity from products where id=$1', [id])).rows[0].stock_quantity, 7)
    const snapshot = (await db.query('select get_store_catalogue(null) as data')).rows[0].data
    assert.equal(snapshot.products[0].stock_quantity, 7)
    assert.deepEqual(snapshot.products[0].product_categories, [{ category_slug: 'makeup' }])
    await assert.rejects(save({ ...draft, stock_quantity: -1, category_slugs: ['makeup'] }, [variant], stocked.updated_at))
    await assert.rejects(save({ ...draft, stock_quantity: 0, category_slugs: ['does-not-exist'] }, [variant], stocked.updated_at))
    assert.equal((await db.query('select stock_quantity from products where id=$1', [id])).rows[0].stock_quantity, 7)
    await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', ['product-images', `products/${id}/${randomUUID()}.webp`])
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', ['product-images', 'bad.jpg']))
    await db.exec('set role anon')
    assert.equal((await db.query('select get_store_catalogue(null) as data')).rows[0].data.products[0].stock_quantity, 7)
    await assert.rejects(db.query("insert into store_categories(slug,name_ar) values('forbidden','مرفوض')"))
    assert.equal((await db.query('select count(*)::int as n from products')).rows[0].n, 1)
    assert.equal((await db.query('select count(*)::int as n from product_variants')).rows[0].n, 1)
    await assert.rejects(save(draft, [], null), /permission denied/)
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', ['product-images', `products/${id}/${randomUUID()}.webp`]))
    await db.exec('set role authenticated')
    await db.query("select set_config('test.jwt', $1, false)", [JSON.stringify({ email: 'outsider@example.com', app_metadata: { role: 'admin' } })])
    await assert.rejects(save(draft, [], null), /Admin access required/)
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', ['product-images', `products/${id}/${randomUUID()}.webp`]))
    assert.equal((await db.query("delete from storage.objects where bucket_id='product-images' returning id")).rows.length, 0)
    await db.query("select set_config('test.jwt', $1, false)", [JSON.stringify({ email: 'test@example.com', app_metadata: {} })])
    await assert.rejects(save(draft, [], null), /Admin access required/)
    await db.query("select set_config('test.jwt', $1, false)", [JSON.stringify({ email: 'test@example.com', app_metadata: { role: 'admin' } })])
    await db.query('update products set is_active=false where id=$1', [id])
    await db.exec('set role anon')
    assert.equal((await db.query('select count(*)::int as n from products')).rows[0].n, 0)
    assert.equal((await db.query('select count(*)::int as n from product_variants')).rows[0].n, 0)
    await db.exec('set role authenticated')
    await db.query('delete from products where id=$1', [id])
    assert.equal((await db.query('select count(*)::int as n from product_variants')).rows[0].n, 0)
  } finally { await db.close() }
})
