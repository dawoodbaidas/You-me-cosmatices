# Store identity and navigation verification — 2026-11-02

The only available artwork is `public/brand/logo.jpg`, a 1254 × 1254 sRGB JPEG with an opaque pink square background and the name already inside it. The project has no transparent logo asset. The square image is not used in the storefront; the English **You&Me** wordmark appears by itself in the header, footer and menu until a suitable transparent logo is supplied. The original image remains unchanged.

## Measured result

Production builds, Chrome headless, desktop 1440 × 900 and mobile 390 × 844, isolated local PostgreSQL-compatible test database. Six consecutive category clicks per device: perfumes → care → all, repeated twice. Timing starts before the automated click and ends when the destination URL and listing have rendered; it includes browser automation overhead. Images are not awaited. These are local measurements, not measurements of the deployed site or real mobile hardware.

| Device | Before, mean | After, mean | Reduction |
| --- | ---: | ---: | ---: |
| Desktop | 446 ms | 191 ms | 57% |
| Mobile | 435 ms | 206 ms | 53% |

Raw samples: `test-results/navigation-before.json` and the current design run `test-results/navigation-final.json`. Timing still includes browser automation overhead. Details read the already loaded catalogue and issue no product fetch; the design run waits for the database image before taking its detail screenshot.

## Diagnosis and changes

- Category routes are dynamic. Default Next Link prefetch loaded their loading boundary rather than their full data. Explicit full-route prefetch now prepares the destination listing before the click. Home links also prefetch the full route; a root loading boundary handles cold navigation.
- Links already used client navigation. This behavior is retained: the tests recorded one document load per browsing session, with an in-memory marker surviving all category transitions.
- Catalogue caching already worked in the production baseline: only one full catalogue read occurred. The fix does not claim otherwise. Routes now use `revalidate = 0` to retain request-time revision checks while respecting explicit data caching.
- Back/focus/online previously triggered an unconditional `router.refresh()` after 120 ms. The hook now checks the small database revision in the background, deduplicates overlapping checks, and refreshes the catalogue only when its revision changes. No timer blocks navigation.
- Modal closure previously waited for a 320 ms exit animation. Closure now releases the modal immediately; opening motion lasts 120 ms and starts at full opacity. Category heading motion lasts 120 ms and never blocks interactions or product rendering.
- Existing admin invalidation remains intact (`revalidateTag` with immediate expiry and route invalidation). The database remains the source of products, categories, prices and stock.

## Verification

- Production build, TypeScript and ESLint passed.
- Existing 30 tests passed, including cart arithmetic/persistence, stock limits, WhatsApp checkout, admin authorization/concurrency and cache invalidation. An additional refresh-hook test passed: unchanged revision causes no refresh; concurrent checks deduplicate; failed checks remain retryable; changed revision refreshes.
- Browser checks passed on desktop and mobile: independent category URLs, browser back, retained cart quantity, English header/footer wordmark and English hero wordmark. Mobile menu and footer were visually checked. The square JPEG is intentionally not presented as the transparent logo requested.
- A held category response immediately showed a skeleton with zero previous-category product cards. Releasing the response rendered the empty destination category.
- A stock mutation in the isolated database updated the cached storefront and disabled the sold-out product. Full catalogue reads increased from one to two only after this mutation; lightweight revision checks are separate requests.
- The original JPEG bytes, BestSellers and StoreScroll files are unchanged. MobileHero and DesktopHero contain only the requested English wordmark text edits; their product selection and animation logic are unchanged. No environment files or database configuration were edited.

Reproduce with `node tests/measure-navigation.mjs after` with Playwright installed, or set `PLAYWRIGHT_MODULE` to its ESM module URL. The runner uses a separate temporary application copy and database and never copies `.env` files.
