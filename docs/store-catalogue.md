# Database-owned store catalogue

Apply `supabase/migrations/003_store_catalogue.sql` after migrations 001 and 002. Do **not** rerun the sample seed on a live database. The upgrade preserves product/variant IDs, descriptions, prices, image URLs and existing navigation membership, moving department definitions and membership into `store_categories` and `product_categories` once. No sample product is inserted. The schema supports a department and one subdepartment level.

The admin now manages departments (name, stable URL, parent, visibility and order), product membership, product order and product-level stock. Existing stock is NULL because no quantity was previously recorded. NULL means inventory tracking is not configured and does **not** block purchasing or invent a stock count; the existing 99-per-line cart limit remains. A recorded zero displays “نفدت الكمية” and disables adding/checkout. A positive recorded stock limits quantities across all variants of that product. Cards and product details use the selected database option and its current price. WhatsApp requests do not automatically decrement/reserve inventory; administrators must record confirmed stock changes.

Storefront lists, department pages, search, cart and product detail data use only the public database catalogue. Missing configuration/data produces an empty state; failed database reads produce an unavailable state. No preview products, product substitutions, inferred department rules, replacement images or translations of stored product copy are used in that path. Store settings use database values, including delivery fees; an unrecorded delivery fee is labelled as pending confirmation. The existing delivery fee is migrated to `site_settings` if absent.

## Caching and freshness

- An uncached, small `store_revision` read selects the current committed catalogue version. Database triggers increment it for product, variant, department, membership and settings mutations.
- `get_store_catalogue` returns a consistent public SQL snapshot. Native Next.js fetch caching shares that snapshot between department pages for five minutes, keyed by the revision. Anonymous credentials and RLS are used; no administrator session data enters the shared cache.
- Successful admin create/update/delete, pricing, visibility and settings operations call `invalidateStoreCatalogue`: immediate tag expiry (`expire: 0`) plus department, home and admin path invalidation. A changed revision also prevents reuse of an older cached snapshot, including updates committed outside the application.
- A Supabase Realtime subscription to the public revision number refreshes open pages; focus, reconnect and browser history navigation refresh missed updates. The migration adds only `store_revision` to the existing `supabase_realtime` publication when it exists. Ensure that publication is enabled on the target project for live cross-device updates. Navigation and refresh still read the current revision without Realtime.
- Admin uploads already use a new UUID WebP URL with a one-year immutable storage cache. A replacement URL bypasses old browser/CDN/optimizer entries. Store images use Next.js responsive optimization at quality 90, lazy loading outside explicitly opened details/cart, and reserved 4:5 tiles (1:1 in the existing single-column layout). Missing/failed images have an honest neutral state.

## Motion scope

Department navigation immediately replaces the previous list with the matching product skeleton when data is pending. Enter animation is 180ms with a 6px movement. Browser history works through Next.js links; departments open at the top. Reduced motion disables both entry/pulse animations and wheel smoothing.

Wheel smoothing applies only to desktop fine pointers over the shop list, reduces wheel distance to 85%, and uses native browser smooth scrolling. Touch/mobile, keyboard, zoom, dialogs and nested scrollers retain their native behavior. Homepage scene boundaries are explicitly excluded.

`Hero`, `MobileHero`, `BestSellers`, `SceneProductImage`, `useSceneFrame`, `scroll-scenes.module.css`, `scene-products` and the legacy scene catalogue loader are untouched. Only those two editorial scenes continue using their original source, selection, assets and movement. Their preview/cutout assets remain solely for that exception and existing tests.

## Verification and rollback

`npm test` exercises the real SQL migrations, atomic product/category writes, RLS, concurrency conflicts, stock validation and revision increments. All database write tests use a new in-memory PGlite instance. The cache integration test injects a private test environment and replaces all network/database clients; it never loads or changes the application's environment. The scroll test proves the mobile/reduced-motion exclusions, protected scene boundaries and native keyboard behavior.

`npm run test:store-browser` starts a loopback-only fixture and a **separate temporary application copy**, on a separate port and with its own Next output/types. Its allowlisted file copy excludes every `.env*` file, and its child process receives only system variables plus explicit loopback QA credentials. Real Supabase variables and secrets are never inherited. The original `.env.local`, main server and build output are not modified. Ctrl+C stops the QA process tree and cleans only its validated temporary directory, unlinking the dependencies junction before cleanup. Environment-isolation tests verify that a sentinel application's `.env.local` remains byte-for-byte unchanged and reject remote QA database URLs.

For the real store, run `npm run dev` normally with the project's own `.env.local`. `node scripts/verify-store-readonly.mjs` performs only GET/HEAD checks against that project and reports status/counts without URLs, keys or raw error bodies. It never imports admin mutation handlers. Do not run write/delete tests against a real project.

Before applying the migration to production, keep the normal database backup. To roll back the UI, restore the previous application release and leave the additive columns/tables in place; preserve/export department membership and stock before any later schema cleanup. No destructive down migration is run automatically.

The configured real project was verified read-only: 81 active products, 24 active department rows, the revision/snapshot endpoints and two source images returned successful responses. The main store displayed 81 products. Admin mutations and immediate cache invalidation were exercised only against isolated local PostgreSQL, never by modifying real products.
