# Product management production upgrade

This extends the existing authenticated admin, products, variants and settings. The storefront layout, animations, cart IDs and WhatsApp checkout are unchanged. Catalogue edits are read from Supabase on the next storefront request; an already-open tab needs a refresh. No catalogue rebuild or redeploy is needed after this one-time upgrade.

## Apply to the existing Supabase project

1. Open the existing project's **SQL Editor**.
2. Run **only** `supabase/migrations/002_product_management.sql`, once, as a single script. It is transactional. Do not rerun `001_initial_schema.sql`, `seed.sql`, `seed:build`, or `supabase db reset` against production.
3. Verify Storage contains the public `product-images` bucket. The migration creates it with a 4 MiB limit and `image/webp` MIME restriction; there is no additional bucket setup.
4. Keep the current admin user, `admin_emails` allow-list and `app_metadata.role = admin`. Both remain mandatory through the unchanged `public.is_admin()` function.

The migration adds authenticated-admin Storage policies and invoker-rights transactional RPCs (`admin_save_product`, `admin_save_product_prices`). RPCs explicitly check `is_admin()` and also obey table RLS; anon cannot execute them. It separates active-row public read policies from authenticated admin reads, and prevents public reads of variants belonging to inactive products. The existing variant-label unique constraint becomes deferred so labels can be swapped without changing variant UUIDs. No catalogue rows are seeded, reset or replaced by the migration. Existing product deletion continues to cascade to variants.

Public bucket objects are publicly downloadable; public visitors receive no upload, update or delete policy. This follows [Supabase public bucket behavior](https://supabase.com/docs/guides/storage/buckets/fundamentals). Check for any pre-existing broad policies on `storage.objects`: this migration does not remove unrelated bucket policies.

## Netlify deployment

1. Commit the application changes, migration and `package-lock.json`; push the existing site's connected production branch when ready to deploy.
2. In the existing Netlify site's build settings, keep the base/package directory pointing to this `web-app` package (the directory containing `package.json`). Set the build command to **`npm run build`** and publish directory to **`.next`**, relative to that directory.
3. Use a supported Node version; this change was tested on **Node 24.19.0**. Node 24 or a recent Node 22 (22.18+ for the TypeScript test runner) can run the tests. Keep Netlify's current automatic OpenNext/Next.js adapter enabled. This app needs its Node server functions, not a static export. See [Netlify's Next.js guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) and [adapter deployment settings](https://opennext.js.org/netlify).
4. Preserve **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** in both build and Functions runtime scopes. The latter accepts the project's existing public anon/publishable key. No new application environment variables or secret/service-role keys are required. Keep `PREVIEW_WITHOUT_SUPABASE` unset/false in production.
5. Apply migration 002 before using the new admin. Trigger a normal Netlify production deployment. Do not upload a Windows `node_modules` directory: Netlify installs Sharp's Linux native package from the lockfile. Do not omit optional npm dependencies, which include Sharp's platform binaries.
6. Confirm the deployment build succeeds and test `/admin`, `/api/admin/products` via the editor, and a fresh anonymous storefront visit. Existing local image paths keep working. New Supabase image URLs are allowed by the narrowly scoped `next/image` configuration.

If Git auto-deploy is enabled, apply the migration before pushing the application commit. Migration 002 is compatible with the previous storefront/admin; a code rollback does not require deleting the new Storage bucket or catalogue data.

## Image behavior and operational limits

- Input: JPEG, PNG, WebP, GIF, AVIF and TIFF supported by Sharp. Invalid/unsupported files are rejected by decoding the actual bytes, not trusting the filename or MIME type. Animated inputs become a still image.
- Source file maximum: **4 MiB**. The request has an additional bounded allowance for fields/multipart overhead. Netlify documents an effective binary limit around 4.5 MB due to base64 encoding, hence this conservative limit: [function limits](https://docs.netlify.com/build/functions/configuration/?fn-language=js).
- Decode limit: **50 million pixels**. Oversized dimensions and corrupt images return an Arabic error.
- Sharp applies EXIF orientation, fits within **1600 × 1600**, preserves aspect ratio/alpha, avoids enlargement, strips metadata and encodes **WebP quality 84**. Conversion happens on upload only. Normal `next/image` responsive delivery remains enabled.
- Storage path: `products/{product-uuid}/{random-uuid}.webp`, with immutable URLs and a long cache lifetime.
- Save ordering: upload converted image → atomically save product and variants → delete the previous managed object only if no product still references it. Local/external images are never deleted. Failed cleanup is reported as a warning after a successful save.
- Known database rollbacks clean up the new unreferenced image. Ambiguous network failures deliberately retain it, because the database may have committed. After an interrupted save, refresh the admin before retrying. If needed, inspect the product's `image_url` and remove only unreferenced objects from that product's Storage folder. No automatic cleanup deletes potentially referenced files.
- Product and variant edits are atomic. Concurrent edits are rejected using `updated_at`; reload and reapply the draft when this happens. A stable draft product UUID prevents duplicate creation on retries.

## Validation performed

`npm test` runs image conversion/validation checks and a disposable PostgreSQL-compatible PGlite database. It applies the schema and new migration, verifies existing data preservation, tests atomic rollback, stable variant IDs/label swaps, pricing ownership checks, concurrency, cascades, public visibility, and admin/ordinary-user/anon RLS restrictions. It uses simulated Supabase auth/storage schemas locally and never writes to production.

Also run `npm run typecheck`, `npm run lint`, and `npm run build`. The real Supabase Storage service, Netlify runtime and authenticated browser flows still require the following post-migration checks; automated tests are not a claim that a production deployment was performed.

## Manual acceptance checklist

- [ ] Existing admin can log in/out; anon and authenticated non-admin users cannot edit catalogue/settings or upload/delete Storage objects. Test an allow-listed user without the metadata role and a role-bearing user absent from the allow-list.
- [ ] Create a product with Arabic/English names, unique slug, description, category/label, prices, badge, multiline benefits, active/featured flags and order. Refresh admin and storefront and verify all values persist.
- [ ] Upload JPG and transparent PNG; preview appears before save, progress transitions to conversion/save, stored file is actual WebP, transparency/aspect ratio are preserved. Test an existing WebP, a large image, a corrupt file and a file over 4 MiB.
- [ ] Replace an existing managed image; verify the new image and URL work before the old unreferenced object disappears. Replacing a legacy local image must not delete any local asset.
- [ ] Simulate upload/save failure; old image and database values remain intact, an error appears, and controls become usable again. A successful save with failed cleanup must display a warning.
- [ ] Add, rename, reprice, reorder, deactivate, reactivate and delete variants. Existing variant IDs survive edits; duplicate labels reject the entire save.
- [ ] Existing pricing tab saves base/old/variant prices together. Invalid old prices and negative prices fail. Inactive variants remain editable.
- [ ] Open the same product in two sessions; save one, then save the stale session. Verify the stale save is rejected.
- [ ] Cancel product/variant deletion and confirm nothing changes. Confirm deletion and verify product/variants disappear; check stale cart lines drop out after storefront refresh.
- [ ] Deactivate/reactivate a product and verify visibility after refresh. Change ordering and featured status and confirm persistence.
- [ ] Existing settings (all nine fields) still save and feed the storefront, contacts, free-shipping messaging and WhatsApp checkout.
- [ ] At mobile widths, check product search/cards/editor, all fields, image picker, variant controls, loading states, cancel/discard confirmation, errors and success toast. Keyboard navigation and labels should remain usable.
- [ ] Storefront cards, category filters, quick view, responsive images, favourites, cart quantities/totals and WhatsApp checkout retain their behavior. No catalogue edit requires a Netlify redeploy.

## Changed files and dependencies

New runtime dependency: `sharp`. New dev-only dependency: `@electric-sql/pglite` for isolated SQL/RLS tests.

Created:
- `src/app/api/admin/products/route.ts`
- `src/components/admin/ProductManager.tsx`
- `src/lib/products/editor.ts`
- `src/lib/products/images.ts`
- `supabase/migrations/002_product_management.sql`
- `tests/product-management.test.mjs`
- `docs/product-management.md`

Modified:
- `src/app/admin/actions.ts`
- `src/app/admin/page.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/lib/products/map.ts`
- `src/types/product.ts`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `README.md`
