# Production performance check

Measured locally on 2026-11-03 using Next 16.3.8 production builds (webpack for both isolated copies), Chrome, a 390×844 mobile viewport at DPR 2, CPU slowdown ×4, 1.6 Mbps download, 750 Kbps upload and 150 ms latency. The real repository also passes its default Turbopack production build. No deployment or real database writes occurred.

The database is the existing isolated PGlite/PostgREST fixture with 38 products. These numbers do **not** measure the deployed CDN, actual Supabase latency, or field Core Web Vitals. Each route gets a new browser context for the first visit, followed by a reload with browser cache enabled. Resources are collected through load + five seconds and the test interaction; this is an initial browsing budget, not the bytes needed to browse the entire catalogue. Image optimizer caches were warmed during baseline investigation; the final copy started with a new optimizer cache, so origin TTFB comparisons are not strictly cold-to-cold.

| Route / visit | LCP before → final | CLS before → final | Observed interaction before → final | Images before → final | JS before → final | Resource requests before → final |
| --- | --- | --- | --- | --- | --- | --- |
| Home / first | 1396 → 1536 ms | .0670 → .0668 | 104 → 208 ms | 312.1 → 91.8 KB | 284.5 → 240.1 KB | 39 → 27 |
| Home / repeat | 696 → 784 ms | .0508 → .0508 | 88 → 168 ms | .3 → 0 KB | 0 → 0 KB | 39 → 27 |
| Store / first | 1912 → 2500 ms | .0046 → .0046 | 80 → 160 ms | 323.0 → 191.4 KB | 285.0 → 240.6 KB | 45 → 37 |
| Store / repeat | 668 → 708 ms | 0 → 0 | 72 → 136 ms | .3 → 0 KB | 0 → 0 KB | 45 → 37 |

KB means 1000 bytes transferred, including resource response overhead. Request counts include cache-served resource entries. Baseline image bytes were recomputed from the retained raw resource list to include the plain JPEG logo; the original counter is retained as `originalImageCounter`.

The interaction column is the longest Event Timing duration observed for opening the cart in this short controlled session. It is **not field INP or a representative interaction distribution**. The 208 ms cold-home sample misses the 200 ms target; other investigation rounds varied, so no stable sub-200 ms claim is justified. CLS meets the requested threshold. Store LCP is exactly 2500 ms, so the strict below-2500 target is not yet met there. LCP did not improve in these final samples: the gain is reduced initial image/JS transfer, avoided database work, and reliable desktop image delivery. The final WebP choice trades somewhat larger files than AVIF for avoiding a reproduced cold desktop AVIF stall. The intentional hero entrance animation also contributes to when the main image paints.

## Causes and changes

- The home page fetched the same public database through both the legacy catalogue query and the revisioned catalogue. Both now share the request-deduplicated, tagged public catalogue. Public settings/categories/products alone use the cache; auth/admin/user data do not.
- `StorefrontMotion` imported GSAP/ScrollTrigger solely to refresh triggers; neither current editorial scene creates those triggers. Its DOM wrapper remains, while the existing `useSceneFrame` animation lifecycle and CSS hanging-tag animation remain intact. The installed packages and unrelated components are preserved.
- Search and product details now load their code when opened. The cart remains available immediately, preserving its existing drawer behavior.
- Listing photos use Next Image at quality 70 with the existing two-/three-column `sizes`. The first two catalogue photos retain high fetch priority; the first four catalogue photos render directly in server HTML, including the partly visible second row. Images farther below the screen load when within 400px. Homepage listing images receive no initial high priority.
- Only the main hero photo is preloaded. Scene images wait until approaching the viewport; hidden bestseller items beyond the active slide's neighbor retain their layout boxes without fetching every image at startup.
- The logo was downloading its entire ~104 KB JPEG at a tiny display size. Next Image now delivers a correctly sized version; the tested 96px WebP response body is 1612 bytes. The original logo and all product originals remain untouched. Next creates cached display derivatives.
- Reserved image aspect ratios/backgrounds provide an immediate lightweight placeholder. An experimental blur placeholder was removed because its hydration-dependent clearing delayed LCP under CPU throttling. An initial experiment also deferred second-row images too aggressively; these are now in server HTML. Intermediate measurement artifacts are kept for traceability; `final.json` is the final implementation.
- Next previously negotiated AVIF/WebP. A cold 640px AVIF request repeatedly stalled locally while the same WebP request completed in about 76 ms. Merely reordering both allowed formats still selected AVIF for Chrome's Accept header, so the final configuration negotiates WebP only. Verified an actual optimized response: `image/webp`, `Cache-Control: public, max-age=14400, must-revalidate`, `Vary: Accept`. AVIF should be benchmarked on the actual deployed image service before enabling it again. Existing admin uploads already convert to bounded 1600px WebP and create UUID image URLs with storage `cacheControl: 31536000`, so replacement images do not reuse an old object URL. No live hosting/CDN settings were changed.
- Existing local Tajawal weights 400/500/700 are used by the design and retained. Progressive catalogue rendering remains 12 products plus “show more”; the entire list is not mounted at once.

## Cache and checkout proof

The public catalogue keeps its existing `force-cache`, 300-second tagged cache and uncached revision check. Product/category/settings mutations already call `invalidateStoreCatalogue()` after successful writes; these hooks are preserved.

`performance-cache-check.mjs` ran against the real Next production cache in the isolated server: consecutive visits kept `catalogueReads` at 1, invoking the real invalidation function increased it to 2, and a committed price/stock change appeared on the next response. Existing database tests also exercise category create/rename/delete and mutation invalidation.

Checkout previously trusted the browser's loaded catalogue. A server action now reads the catalogue with `cache: no-store`, validates product and variant IDs, integer quantities, duplicate lines and aggregate stock, and creates the WhatsApp URL with current server prices/settings. The existing WhatsApp checkout is retained; it does not reserve inventory or charge a payment. An unavailable database fails closed. The production integration check confirmed that a newly sold-out product is rejected even before invalidating a previously populated display cache. Unit tests verify changed prices, deleted products/variants, insufficient stock, duplicate lines and malformed quantities.

## Validation and remaining limits

- Production build, TypeScript and ESLint pass. Nineteen focused image/cart/catalogue/admin-data tests pass.
- The full suite has 34 passing tests and one pre-existing Windows temporary-directory cleanup failure in `tests/environment-isolation.test.mjs`; the path safety guard refuses cleanup. It is unrelated to the storefront changes and was not bypassed.
- Browser checks cover cart additions through the hanging tag, cart drawer, deferred product details/search, loading images after scrolling, and page overflow at 390px and 1440px. Screenshots and resource logs are under `artifacts/performance/`.
- Deployed Supabase/storage/CDN latency, very large real catalogues and actual low-end devices remain unmeasured. Next/React, Supabase realtime and fonts still contribute transfer/hydration work. The cold-home interaction outlier needs broader real-device/field measurement; these short samples cannot certify field INP.

## Reproduce

Run `node scripts/performance-server.mjs` to build an isolated production copy and start it on loopback port 5090. It prints the dedicated test database URL. It never copies application `.env` files or uses live database credentials. A diagnostic cache/checkout route is written **only into that temporary copy**, not into `src/app` in this repository.

Run `node scripts/performance-measure.mjs final`, `node scripts/performance-functional.mjs`, then `node scripts/performance-cache-check.mjs <printed-loopback-database-url>`. The cache check mutates only its isolated fixture; run it after measurements. Browser scripts use the existing Windows Chrome/Puppeteer installation. Ctrl+C stops the server; isolated temporary copies are retained rather than bypassing the existing cleanup guard.
