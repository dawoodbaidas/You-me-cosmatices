# Existing catalogue images: WebP migration

## Inspection and current execution status

Inspected live Supabase using the existing local server credential, including inactive rows, `public/products`, the original `../products_from_html.json` mapping, the preview snapshot, admin image conversion, Storage configuration, and source references.

- 38 database products and 56 variants; all 38 image paths resolve to local source files.
- Original inspection: 38 sources required conversion; none were WebP or missing/unmatched.
- Actual source bytes are JPEG even for the files named `.png`. Detection uses Sharp decoding, not filename extensions.
- Existing public `product-images` bucket: 4 MiB object limit, WebP MIME restriction.
- Dry run completed with 0 uploads, 0 database updates, 0 failures and unchanged product/variant fingerprints.
- 38 local WebP copies were created: 12,288,335 source bytes → 7,133,198 output bytes (42% smaller). All originals remain.
- Verification was corrected to use the authenticated Supabase Storage `download()` API. Public URL propagation and the storefront optimizer no longer gate database updates. The rerun verified 38 objects, with 0 failures, conversions or uploads. All 38 database URLs were already WebP at the rerun's initial snapshot, so it correctly performed 0 further updates. Report: `.image-migration-reports/2026-10-05T06-59-21.337Z-migrate.json`.

The dry-run snapshot includes current flags; the script never changes activation. Counts of active products can change through normal admin use between inspections.

## Commands and prerequisites

Use Node 24 (tested on 24.19.0), or Node 22.18+ for native TypeScript imports. No new packages were added; the script imports the same `convertProductImage()` used by the admin.

The project already has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and a local **`SUPABASE_SECRET_KEY`**. No new variable is required with the explicit `--use-secret` mode below. The key is loaded from ignored local environment files; it is never logged, used in browser code, or sent to image URLs. Do not add it to `NEXT_PUBLIC_*` or commit environment files.

Prefer an authenticated admin session when available: set the optional local `MIGRATION_ADMIN_ACCESS_TOKEN` to an unexpired Supabase access token from the existing admin account, then omit `--use-secret`. The script calls `public.is_admin()` and existing RLS applies. An expired/non-admin token fails before migration. Anonymous-only migration is deliberately refused because it cannot inspect inactive products. `getBucket` metadata may be unavailable to an authenticated admin; actual object writes and reads use the existing Storage policies.

1. Deploy the existing Next.js configuration and the local WebP files/reference changes to the current Netlify site. Preserve the Supabase public environment variables. There is no new SQL migration, bucket or Storage policy for this task. Do not run `seed.sql`, `seed:build`, or reset the database.
2. Run the read-only plan:

   ```sh
   npm run images:migrate-webp -- --dry-run --use-secret
   ```

3. Review every product's name, UUID, current path, resolved source, detected format/dimensions, conversion requirement, intended Storage path and intended public URL. The complete report and catalogue baseline are stored under the ignored `.image-migration-reports/` directory.
4. Run the migration manually:

   ```sh
   npm run images:migrate-webp -- --use-secret
   ```

5. The command prints the exact report filename. Use it for verification:

   ```sh
   npm run images:migrate-webp -- --verify-only --use-secret --baseline ".image-migration-reports/<timestamp>-migrate.json"
   ```

   Replace `<timestamp>-migrate.json` with the actual filename printed by step 4. `--verify-only` performs no uploads or updates. A nonzero exit means at least one image or data-preservation check failed.

For another deployment, pass `--storefront-url https://your-deployed-site.example`. This sets the allowed origin for remotely hosted source images, not the database project. Storefront delivery is a separate post-migration check and does not gate Storage verification or database updates.

## Safety and repeatability

- Fetches every product and variant with pagination. No seeds, inserts, deletes, product recreation or variant writes.
- Local paths are resolved inside `public/products`, including symlink checks. Unknown external hosts are reported and skipped; only the configured Supabase and storefront HTTPS origins are read, without credentials. Redirects are rejected. Missing sources are not guessed from other products.
- Uses the existing Sharp converter: EXIF rotation, aspect-preserving fit within 1600 × 1600, no upscaling, WebP quality 84 and metadata removal. Decode limit remains 50 million pixels. Remote/local source limit is 32 MiB; stored result limit is 4 MiB.
- Already decoded, metadata-free, single-frame WebP images within size/dimension limits are reused byte-for-byte. Encoder quality cannot reliably be inferred from an existing WebP; compliant bytes are preserved rather than recompressed merely to claim quality 84.
- Deterministic destination: `products/{existing-product-uuid}/{content-hash-formatted-as-uuid}.webp`. This matches existing admin Storage policies and managed-image cleanup. It avoids overwriting cached images. Duplicate objects are reused only after hash verification.
- Check prior reports for the same product and current source URL → authenticated Storage download → non-empty/size check → MIME check (`image/webp`, when available) → SHA-256 equality → full WebP decode/optimization checks → guarded database update → database recheck. Valid prior uploads are reused without reading or converting originals. When no object exists, upload once with `upsert: false` and verify through the same authenticated download API before updating. Arbitrary Storage authorization/network errors never count as a missing object. No public HTTP verification is required; therefore public propagation cannot produce a false migration failure.
- The SQL update payload contains **only `image_url`**, guarded by the original UUID, URL and `updated_at`. The existing database trigger automatically advances `updated_at`; disabling that trigger would break admin concurrency checks, so it is deliberately preserved. Names, prices, descriptions, categories, sorting, flags, IDs and variants are not written.
- Full product/variant baseline is written before processing; reports update after every product via temporary file and rename. Before/after fingerprints exclude only product image URLs and their automatic update timestamps. Any other content change, including a concurrent admin edit, is reported for investigation rather than silently restored.
- Per-image failure keeps the original URL when upload/verification/update fails and continues to the next product. A lost response after a committed update is recorded as uncertain; refresh/verify before retrying. No source or destination objects are automatically deleted, including unreferenced uploads after a failed database update.
- Re-running is safe: migrated optimized managed images are verified and skipped. Previous reports in `.image-migration-reports/` let interrupted runs locate and hash-check exact existing objects without reconversion or duplicate uploads. Keep these reports. The report includes products checked, already uploaded, verified, already WebP, conversion required, converted, uploaded, records updated, skipped, missing sources and failures with exact slugs/UUIDs/reasons.
- The migration is not referenced by `dev`, `build` or `start`.

## Local references and originals

Created all 38 `.webp` siblings in `public/products/` and changed only image paths in `Hero.tsx`, `StorySection.tsx` and `preview-products.json`. The import utility now prefers a WebP sibling when present; it was **not run**. The existing `seed.sql` remains untouched and still contains old image references.

The repeatable local-only helper is:

```sh
npm run images:prepare-local-webp
```

It creates missing WebP copies, verifies existing copies instead of overwriting them, and replaces exact paths only in the three known reference files. It never connects to Supabase or regenerates catalogue content.

No cleanup command is provided: originals are intentionally retained, including for old deployments and the historical seed. Before any separately reviewed cleanup:

1. Ensure the migration and `--verify-only --baseline ...` report have zero failures, every intended URL matches and catalogue fingerprints remain unchanged.
2. Confirm anonymous public access, real WebP bytes, no old JPG/PNG URLs for migrated products, and working Next.js image delivery.
3. On desktop and mobile, inspect cards, hero/story imagery, quick view, cart thumbnails, totals and WhatsApp checkout. Compare layout/aspect ratios to the previous deployment.
4. Search all source files, preview mappings, original import inputs and archived deployment dependencies for each proposed original filename. `rg -n '\.(jpg|jpeg|png)' src scripts supabase` includes the historical seed; do not run that seed to update references.
5. Keep the original files and report backups through a rollback window. Do not bulk-delete the old folder or Storage objects. Any cleanup must be a separate, explicitly reviewed operation.

## Files changed by this image-only task

Validation completed: `npm run typecheck`, `npm run lint`, `npm run build`, and 12 automated tests passed. Local production-server smoke checks decoded all 38 WebP images through `next/image` at 128px, 384px and 640px (114 successful requests); the storefront returned HTTP 200 with the new hero references. These checks do not replace the post-migration production/browser checklist above.

Created: `scripts/migrate-product-images-to-webp.mjs`, `scripts/lib/product-image-migration.mjs`, `scripts/prepare-local-product-webp.mjs`, `tests/image-migration.test.mjs`, `docs/image-migration.md`, and the 38 files listed below.

Modified: `.gitignore`, `package.json`, `scripts/build-import.mjs`, `src/data/preview-products.json`, `src/components/Hero.tsx`, `src/components/StorySection.tsx`, `README.md`.

```text
public/products/aloe-foam.webp
public/products/aloe-gel.webp
public/products/bb-7in1-foundation.webp
public/products/blush-palette.webp
public/products/body-mist.webp
public/products/body-scrub-cqk.webp
public/products/boutique-baby-powder.webp
public/products/contour-palette.webp
public/products/cqk-bamboo-charcoal-mask.webp
public/products/essence-mascara.webp
public/products/eye-mask.webp
public/products/eyebrow-pencil.webp
public/products/flawless-filter-primer.webp
public/products/foundation.webp
public/products/hand-mask-aloe.webp
public/products/hyaluronic-cream.webp
public/products/khamria-pure-sweet.webp
public/products/lip-liner-marker-rm.webp
public/products/lip-oil.webp
public/products/lipstick-set.webp
public/products/mascara.webp
public/products/moist-lip.webp
public/products/musk-ard-alharamain.webp
public/products/musk-tahara-oil.webp
public/products/nivea-deo-72h.webp
public/products/nose-strips.webp
public/products/package-cherry-trap-boutique.webp
public/products/package-dalal.webp
public/products/package-laverne-you-miracle.webp
public/products/package-muzhla.webp
public/products/package-naqaa.webp
public/products/package-nasma.webp
public/products/primer.webp
public/products/rose-water.webp
public/products/sence-lip-balm.webp
public/products/sheglam-spf90.webp
public/products/vgr-shaver-trimmer-2in1.webp
public/products/you-miracle-sexy-clothes-duo.webp
```
