# Product image workflow verification

- Migration: `009_any_product_image.sql`, applied after 008, tested twice in PGlite (real PostgreSQL execution). Remote Supabase was not migrated.
- Database: processed image activation and original restoration survive rereads; Hero and Best-Selling membership persists; stale product/section revisions, duplicate IDs, missing active images and unauthorized writes remain rejected. Client-written verification flags remain untrusted.
- API: ordinary upload bytes are unchanged; processed uploads preserve their original source and use the existing atomic save RPC.
- Browser: actual FullProductEditor with controlled local transport, using `node artifacts/image-workflow-qa.mjs`: preview creates no save; ordinary uploads save without extra approval; successful approval sends the processed image; failed approval followed by ordinary save retains the original.
- Checks: full suite (17 tests) passed; added selection validation test and reran all 8 affected tests successfully. TypeScript, ESLint and production build passed. Existing middleware/edge deprecation warnings remain.
- No remote deployment, push, database migration or image deletion performed. Storage transport was mocked for these tests; a live Supabase end-to-end run was not performed.
