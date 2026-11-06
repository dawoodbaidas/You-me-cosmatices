# Category navigation and images — verification

## Confirmed baseline

- The shared store layout fetched `get_store_catalogue`, including all products, for every category route. The main-category render could show its child circles plus a product grid. The isolated `care` main page rendered 12 product cards.
- `CategoryCircles` already supported a compact strip, but no shared header rendered it. The measured strip count was zero.
- Existing internal category links already used Next Link. Click, direct URL and reload did not reproduce a home-page flash; an in-page document marker survived a category click before the changes.
- The old upload handler silently ignored a zero-byte image and reported save success. Empty files now fail validation in both the file picker and API, preserving the previous image.
- Read-only checks against the configured Supabase project returned HTTP 200 for the category table and catalogue RPC. Two child categories (`body`, `fragrance-men`) had saved `image_path` values. Both public Storage objects returned HTTP 200, WebP, 127730 bytes. All visible root categories had null image paths. No Storage/RLS failure was established by these checks.

## Ownership and compatibility

- Writer: `CategoryManager` sends a file and category draft to the admin-only categories endpoint. Upload uses a fresh UUID path; `admin_save_category` commits the record with its existing optimistic concurrency check. The previous file is retained, including for older cached pages.
- Readers: `image_path` → `categoryImage` → `storeCollections` → `CategoryCircles`, including the shared header and home/category content.
- Shared layout now reads categories/settings only, cached by store revision. Route pages own their product data. Roots do not query products; child queries use direct `product_categories` membership, not descendants.
- Cart hydration requests only persisted cart product IDs. Search loads the catalogue when explicitly opened. Home, product, cart and favorites pages retain their existing catalogue behavior.
- The header and cart remain in the shared layout. Server-provided route props render page content immediately; the client registration effect only supplies products to shared interactions, not route selection.
- Existing category URLs and historical redirects remain compatible. No schema or Storage policy changes are needed. Deployment and rollback consist of deploying/reverting application files; existing records and image objects are untouched.

## Executed checks

- Existing test suite: 47 passed; added category image test passed (48 total after addition).
- `typecheck`, `lint`, production `build`, and `git diff --check` passed.
- Added test executes the real upload handler, real Sharp conversion and migrated PGlite SQL with simulated Storage. It covers root/child first upload, replacement URL, upload failure, stale save failure, cleanup of the uncommitted upload, retained previous image, success invalidation only after commit, and non-admin denial.
- Browser checks ran against isolated development and production copies. Production runner: `npm run test:store-browser -- --production`.
- Viewports: 390×844 (DPR 2, touch/mobile) and 1440×900. Main → child (two matching products) → other main → browser back/forward passed. Direct child URL in a new tab and ordinary reload showed the correct child, two cards, no home hero, and one header strip.
- Main-page production counters initially: `catalogueReads=0`, `productReads=0`, `categoryReads=1`. After child navigation and switching/back/forward: `catalogueReads=0`, `productReads=1`, `categoryReads=1`. Header DOM identity and document marker were unchanged across internal transitions.
- Empty root displayed `لا توجد أقسام فرعية حاليًا`; empty child displayed `لا توجد منتجات حاليًا` in the initial isolated fixture.
- Image updates through the isolated fixture use the real SQL save function. First image and replacement appeared after ordinary reload in development and production without cache clearing. Header/home resolved the same root image URL. Header image used a 128px optimized resource at DPR 2; child circle used 384px. Loaded images were square with `object-fit: cover`.
- No horizontal page overflow at either viewport. Constraining the RTL strip confirmed independent negative `scrollLeft` scrolling. The strip was present once on home, main, child, product and cart pages. Home hero/bestsellers remained present. Adding a product, reloading, and navigating to a main category retained the cart badge.

## Live verification still required

No authenticated production admin session was available. Actual Supabase Storage upload through the admin UI was **not** executed; its read-only public image delivery was checked. No production data was mutated. To finish live acceptance:

1. Sign into `/admin`, choose a root category without an image, upload a JPG/PNG/WebP and save. Wait for the success message.
2. Open the store as a visitor and reload normally. Confirm the same image on home and in the header.
3. Replace that image, then repeat for a child category. Confirm the child circle on its parent page and distinct image URLs after replacement.
4. If save fails, keep the shown Arabic message and server log (`Category image upload failed` or `Category record save failed`). Do not broaden Storage permissions. Existing migration 005 owns the admin-only bucket and save function; the public checks show its image columns are already present on this project.

One optional isolated production build initially ran out of memory while two development QA servers were still running; after stopping those servers, the isolated production build and browser checks succeeded.
