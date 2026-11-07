# Implementation progress

> Latest checkpoint: see **Priority navigation fixes verified — 2026-11-07** below. The previously failed browser-history gate is now resolved. Earlier Task 1 status tables and failure reports are historical. Task 1 caching and Task 2 image optimizations remain preserved; image benchmarks were not repeated.

Verified 2026-11-07 against `plan.md`, at Git HEAD `c691a9e`.

## Checkpoint and scope

The working tree was clean at the start of this verification. No previous progress file existed. The numbered plan was first committed in `c691a9e`; the retained performance measurements predate that plan. No entire numbered implementation task can be certified complete from the available evidence. Task 1 is partially implemented, with several earlier changes already committed. This verification preserves them and does not restart implementation or begin Task 2.

Completed, reusable work:

- `770f0fd` (2026-11-03): shared revision-keyed catalogue, reduced initial media/JS transfer, deferred search/details code, fresh server checkout validation, performance harness, retained before/final measurements and report.
- `fbeb3fa` (2026-11-06): navigation-only shared layout data and product-by-ID API for cross-category cart hydration. Cart quantity-only edits keep the same sorted product-ID key and therefore do not trigger the hydration effect.
- `c691a9e` (2026-11-07): current plan and existing loading/skeleton work, plus presentation fixes. These changes remain untouched.
- Existing tests exercise database cache invalidation after committed writes, stock/price changes, admin authorization/concurrency, immutable order snapshots and fail-closed checkout.

These are completed pieces, not evidence that all acceptance criteria of Task 0 or Task 1 passed. Later admin/image functionality in the repository also predates this execution of the plan and is preserved.

## Confirmed issues fixed in this verification

1. `useStoreRefresh` previously set a permanent `refreshing` flag until its revision prop changed. An aborted/failed route refresh, or a response retaining the old revision, could prevent all subsequent checks. Refresh suppression now expires after 30 seconds; concurrent revision reads remain deduplicated. The regression test covers unchanged revision, history events, failed revision reads, suppressed duplicate events, a retry after an unacknowledged refresh, and cleanup.
2. Reproduced the performance server build failure: generated `qa-performance/route.ts` called `prepareCheckout(input.items)` although the current action requires an expectation argument (`TS2554`). The isolated diagnostic route now forwards `input.expected`.
3. Updated the associated cache/checkout integration check to request and accept the current quote using a fresh order UUID. Sold-out and duplicate-line checks now supply valid expectations, so rejection cannot pass merely because the expectation was missing.

No public query redesign, image reuse work, database migration, push or deployment was performed.

## Task 1 status: not yet accepted

Source evidence still shows these unfinished requirements:

| Requirement | Current evidence / remaining work |
| --- | --- |
| Request-deduplicated revision reads | `readStoreRevision` itself is not wrapped in React `cache`. Identical fetches may be memoized by Next during rendering, but the retained measurements do not establish per-render revision request counts. |
| Narrow category/product/home reads | Category, product-by-slug and home routes still call `getStoreCatalogue()`. `getCategoryProducts` exists but is uncached and does not replace these route reads. |
| Remove catalogue dependency for cart route | `/cart` still loads `getStoreCatalogue()` solely to supply route data. |
| Missing/stale-only cart hydration | `Storefront` fetches every cart ID on ID-set or revision changes, including products already known from the page. No shared in-flight request cache exists. |
| Revision-aware reconciliation | Page products overwrite cart/search records by array merge order, without revision comparison. |
| Search cache | Opening search requests the full products endpoint each time. Search records are not explicitly invalidated when the revision changes. |
| Bounded display caching | Catalogue/navigation caches retain 300-second revalidation; uncached revision checks select new cache keys. The plan's explicit 30-second public-read policy has not been implemented/proven across narrow reads. |
| Refresh recovery | Permanent lockout fixed here; healthy-connectivity freshness still needs end-to-end timing proof. A 30-second polling interval alone is not proof that rendering finishes within 30 seconds. |

Known-product details and opening the cart drawer use loaded client products, but adding a known product to the cart still triggers the ID hydration request. Quantity-only changes already avoid that request; preserve this behavior. Existing unit tests do not establish the complete browser request-count, cross-category, reconnect, concurrent-fetch or back/forward acceptance matrix.

Per the request to resume verification only, the unfinished query/cache architecture above was documented rather than implemented. Task 1 must not be marked passed or followed by Task 2.

## Retained performance comparison

Source: `artifacts/performance/before.json` versus `final.json`, committed together in `770f0fd`; methodology and limitations: `docs/performance-report.md`. `after.json` and `after-origin-cold.json` are intermediate experiments, not additional final repetitions.

| Route / visit | LCP before -> final (ms) | Observed interaction (ms) | Images (bytes) | JS (bytes) | Resource entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home / cold browser | 1396 -> 1536 | 104 -> 208 | 312110 -> 91762 | 284517 -> 240115 | 39 -> 27 |
| Home / warm browser | 696 -> 784 | 88 -> 168 | 300 -> 0 | 0 -> 0 | 39 -> 27 |
| Store / cold browser | 1912 -> 2500 | 80 -> 160 | 322989 -> 191378 | 284976 -> 240567 | 45 -> 37 |
| Store / warm browser | 668 -> 708 | 72 -> 136 | 300 -> 0 | 0 -> 0 | 45 -> 37 |

Cold-browser image transfer fell 70.6% on home and 40.7% on store; JS fell about 15.6% on both. LCP increased on all four retained final samples. CLS was effectively unchanged (home .0670 -> .0668 cold and .0508 warm; store .0046 cold and zero warm). Home cold interaction exceeded the 200ms target. Store cold LCP equals the plan's <=2500ms target, but the older report used a strict below-2500 threshold.

These are single samples per route/visit from an older implementation and an isolated 38-product fixture, not the five-run real-public-data baseline requested by Task 0. Optimizer cache states were not identical; origin TTFB is not a controlled cold-to-cold comparison. The interaction measurement is a short Event Timing sample, not field INP. No median/worst distribution or current-HEAD Task 1 speedup can be inferred. Measurements were not rerun because both historical datasets exist, the requested scope excludes completing Task 1 architecture, and a new current-head run would not repair the missing original matched baseline. Raw artifacts were preserved.

## Validation

- `npm test`: **55 passed, 0 failed** on the initial tree, including environment isolation (the old report's Windows cleanup failure did not reproduce).
- `npm run typecheck`: passed on the initial tree.
- `node --test tests/store-refresh.test.mjs`: passed after the refresh retry fix.
- `npm run lint`: passed after the changes; no lint errors reproduced.
- `node --check scripts/performance-cache-check.mjs`: passed.
- `git diff --check`: passed for tracked changes.
- Corrected isolated production build (`node scripts/performance-server.mjs`, webpack): passed compilation, TypeScript, page generation and startup on loopback. No application environment files were copied.
- `node scripts/performance-cache-check.mjs http://127.0.0.1:62928`: passed against that isolated server. Consecutive route responses held catalogue reads at 1; real invalidation increased them to 2. Accepted fresh quote produced a WhatsApp order URL; a subsequent fixture stock change was rejected before display-cache invalidation; updated price/stock appeared after invalidation. Only the ephemeral fixture was mutated.

## Remaining tasks and next checkpoint

- Task 0: historical baseline exists, but the plan's five cold/five warm real-public-data protocol and full bottleneck attribution are not complete.
- Task 1: preserve committed partial work and the fixes above; complete the remaining public-data/cache ownership requirements before claiming acceptance. Then run targeted request-count/freshness/history browser checks and matched production measurements with documented server/browser cache states.
- Tasks 2-9: not started by this verification; retain existing overlapping functionality and assess it before implementing each numbered task. Do not advance to Task 2 until Task 1 passes.

Next checkpoint: Task 1 verification cannot close as passed on the current architecture. Use the requirement table above to scope the remaining implementation, then collect the missing end-to-end evidence. No production mutations, push or deployment are authorized here.

## Task 2 resumed final QA — 2026-11-07

Resumed the existing dirty working tree at the user's explicit direction. All existing Task 2 component changes, shared media policy/cache, scene retention/framing work, prior refresh fixes, and measurement artifacts were preserved. No Task 2 implementation was repeated and Task 3 was not started. This session changed only the image QA script, derived measurement summary, QA artifacts, and this progress log.

### Verified results

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test -- --test-concurrency=1`: **57 passed, 0 failed**. The initial default-concurrency run exhausted process/WebAssembly memory while multiple PGlite fixtures and build checks were running; the limited-worker retry passed. No product-code change was made for this environmental failure.
- `npm run build`: passed the regular Next.js 16.3.8 Turbopack production build, TypeScript and page generation.
- `node scripts/performance-server.mjs`: isolated webpack production build, TypeScript, page generation and startup passed. The reported isolated build/configuration failure did **not** reproduce; no configuration workaround or skipped type checking was introduced. The existing home-directory lockfile warning remains nonfatal.
- `node scripts/task2-image-qa.mjs --functional-only`: passed against the isolated production server at **390×900 and 1440×900, DPR 2**. The test uses the existing local catalogue fixture and real local product artwork; no production database is involved.
- Verified loaded listing imagery in quick view, retained preview under a blocked detail upgrade (mobile), distinct-source isolation, successful detail upgrade, cached cart drawer and cart-page renditions, quantity increment/decrement, removal to the empty state, and no horizontal document overflow.
- Same mounted image component with a replacement source URL clears the old artwork while the replacement is blocked; returning to the original source succeeds; missing source produces the neutral fallback.
- Best-Selling initially mounts media only for active/adjacent items; returning from item 5 to item 1 retains the final loaded image node with **zero repeated alpha scans** at both widths under reduced motion. Hero shine mask uses the loaded Hero image's exact rendition.
- **No repeated network body transfer for an identical optimized image URL** in the tested listing/modal/cart flow at either width. A larger detail rendition remains a legitimate distinct request.
- No uncaught browser exceptions in the completed run. Raw results: `artifacts/performance/task2/functional.json`; screenshots are alongside it.

| Viewport | Warm modal image + buy control (ms) | Warm cart image (ms) |
| --- | ---: | ---: |
| 390px | 54.8 | 78.4 |
| 1440px | 32.3 | 36.1 |

These are single unthrottled functional observations from activation to a requestAnimationFrame observing the decoded image (and modal buy control), not five-run latency distributions, end-of-animation timings, or field INP. Both observed openings meet the 100ms visible-response target; the modal control is present within 200ms.

QA assertions were corrected to account for legitimate behavior: desktop listing/detail can share the exact optimizer URL and finish the handoff immediately; a temporary preview and final image can coexist inside one scene media component; node retention is checked after the temporary preview has finished upgrading. Cart quantity/removal and warm-cart timing checks were added. An intermediate run timed out waiting for modal media; a subsequent complete run passed without an application change, so occasional QA timing sensitivity remains a harness limitation.

### Retained five-run Task 2 measurements

The existing **20 samples** (five cold/five warm visits on each route) were reused without rerunning any benchmarks. `measurements.json` remains byte-for-byte unchanged, SHA-256 `b273fda00b14f64fbe4878127d7e75a023e9506b544bea2b76590f0ddb6dd872`. Derived medians/worst values are saved in `artifacts/performance/task2/summary.json`.

Profile: 390×844, DPR 2, 4× CPU slowdown, 150ms network latency, 1.6Mbps down / 750Kbps up, isolated production fixture. Cold means a fresh browser context; optimizer/server caches were shared across runs, not reset to cold for every sample.

| Route / visit | LCP median / worst (ms) | CLS median / worst | Event Timing median / worst (ms) | Image bytes median | JS bytes median |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home / cold | 2084 / 2368 | .0936 / .0970 | 96 / 128 | 209998 | 246780 |
| Home / warm | 724 / 1052 | .0852 / .0852 | 48 / 64 | 0 | 0 |
| Catalogue / cold | 2008 / 2196 | .0017 / .0017 | 40 / 80 | 201784 | 246780 |
| Catalogue / warm | 780 / 832 | 0 / 0 | 32 / 40 | 0 | 0 |

All retained samples fall within the stated LCP/CLS/lab interaction targets under this fixture/profile. They are not a controlled before/after comparison with the older historical measurements, nor real-public-data or field INP evidence. Home LCP was the body-mist Hero image; catalogue LCP was the LAVERNE package image. The raw resource entries retain optimizer URL/width/quality, transfer bytes and resource timing evidence.

### Remaining limits and issues

- The earlier Task 0/1 architecture and real-public-data acceptance gaps remain; these QA results do not certify those tasks or the entire plan.
- Physical devices, the full seven-viewport matrix, all requested portrait/square/landscape visual cases, and normal-motion scene transitions were not comprehensively revalidated here. Scene retention checks used reduced motion for deterministic selection.
- The final desktop flow used an identical listing/detail URL, so its blocked-upgrade case is reported as not exercised; the failed larger upgrade was verified on mobile.
- Existing quick-view toolbar copy renders question marks (`?????? ??????` in `ProductQuickView.tsx`), visible in the retained screenshot. This predates the resumed work and remains an unrelated presentation issue. Screenshots captured during drawer motion are not final-animation layout certification.
- Warm opening checks establish image reuse/visible controls, not the absence of all public-data requests; the known Task 1 cart hydration behavior remains documented above.
- No push, deployment, migration, production database write, or Task 3 work was performed.

## Task 1 public-data completion and integration verification — 2026-11-07

Implemented the remaining public-data/cache requirements on top of the existing Task 2 tree. **The scoped data changes and image integration are verified; full Task 1 acceptance remains open because the browser history/loading gate fails.** No navigation/loading-boundary implementation from Task 3 was attempted. The history failure has not been attributed to a particular pre-existing change or framework behavior.

### Implemented behavior

| Requirement | Result |
| --- | --- |
| Request-deduplicated revision reads | `readStoreRevision` uses React `cache`. Production HTTP checks observed exactly one revision read per layout/page render on home, cart, product, child category and catalogue routes. |
| Narrow public reads | Product detail filters by slug; ID hydration filters by deduplicated IDs; category reads filter through an aliased membership relation while retaining **all** product memberships. Home reads merchandising selections and only their selected products. Parent categories retain their existing navigation-only behavior. |
| Remove unnecessary catalogue loading | Home, product detail, category, cart, favourites and public products API no longer call the full-catalogue RPC. `/cart` and `/favorites` supply no catalogue payload; their saved IDs hydrate on the client. `/category/all` and deliberate search legitimately request all active display products. |
| Bounded shared server caching | Navigation, product, selection and legacy display reads use 30-second cache lifetimes, revision-specific identities and the existing shared invalidation tag. Product/cart/favourite paths were added to mutation invalidation. No authenticated response is added to these caches. |
| Known-product cart reuse | One `PublicProductCache` per mounted storefront stores current-revision display records. Page products seed it; only missing/expired saved IDs fetch. Adding a known item, opening its modal/cart, navigating to cart and editing quantity need no product request. A full cart reload requests stored IDs only. Favourites use the same ID path. |
| Concurrent request deduplication | Concurrent search opens share one promise. Overlapping ID batches share pending per-ID requests, with batches capped at 100 IDs. Failures release their pending entries and can retry. Shared requests survive an individual effect's cleanup without an aborted consumer cancelling other consumers. |
| Revision-aware reconciliation | New revisions clear old display/search records. Older page, search and ID responses cannot relabel stale data as current. Within a revision, newer row timestamps win; missing/deactivated IDs receive tombstones so delayed pages cannot resurrect them. Big-integer revision strings compare without numeric precision loss. |
| Search caching/invalidation | Successful search results are shared for 30 seconds, reused on reopen and invalidated on revision changes. Open search reloads after a new revision; failed reads are shown inside the dialog and retried. |
| Freshness/recovery | Visible-tab revision polling runs every 15 seconds, plus existing realtime/focus/reconnect/history events. An observed revision invalidates client records immediately while the route refreshes. Failed/unacknowledged refresh suppression expires after 5 seconds. Cart/favourite hydration and open search retry bounded display reads; failures are visible in cart/search instead of hidden behind modal layers. |
| Checkout authority | The existing `readStoreCatalogue(true)` path remains an uncached server snapshot for checkout; the transactional database order function remains authoritative. Client display caches never determine checkout price/stock. No schema or checkout-contract change was required. |

### Verification

- `node --test --test-concurrency=1 tests/*.test.mjs`: **63 passed, 0 failed**, including new public-cache, narrow-query, browser-fetch binding, stale-response, deleted-product, image identity and refresh tests; existing checkout, authorization, concurrency and immutable-order tests remain green.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed the regular Turbopack production build, TypeScript and page generation on the final application code.
- `node scripts/performance-server.mjs`: final isolated webpack production build, TypeScript, generation and loopback startup passed. No application environment files were copied. The nonfatal parent-directory lockfile warning remains.
- `git diff --check` and syntax checks for the QA scripts: passed.
- `node scripts/performance-cache-check.mjs http://127.0.0.1:64531`: passed. Repeated display reads reused the product cache; real tag expiration caused a new read; a current accepted quote created an order in the **ephemeral fixture only**; a subsequent stock change was rejected by checkout before display invalidation; updated price/stock appeared after invalidation; duplicate lines were rejected. Evidence: `artifacts/performance/task1/checkout.json`.
- `node scripts/task1-data-qa.mjs http://127.0.0.1:64531`: collected production-mode browser data checks at 390×900 and 1440×900, DPR 2. **Data/image checks pass; history/loading gate fails at both widths**, recorded explicitly as `historyReconciliation: false`. The harness now exits nonzero for that gate. Evidence: `artifacts/performance/task1/functional.json` and screenshots alongside it.

| Browser observation | 390px | 1440px |
| --- | ---: | ---: |
| Product requests for known add/modal/cart/quantity actions | 0 | 0 |
| Product requests for concurrent search opens | 1 | 1 |
| Additional ID-only request after direct cart reload | 1 | 1 |
| Polling update of open modal after image/price/stock mutation | 13,589ms | 13,965ms |
| Replacement image + revised data in modal/cart/search | Passed | Passed |
| Fresh price after offline/reconnect/focus | Passed | Passed |
| Back from cart to catalogue after revision refresh | **Failed: loading skeleton persists** | **Failed: loading skeleton persists** |

HTTP-only production checks observed one product query for each cold home/product/child-category/catalogue route, zero product queries on the cart route, and **zero full-catalogue RPC reads** on all five display routes. These checks exclude browser hydration and prefetching. Browser polling observations are single unthrottled lab checks of the local fixture, not a universal 30-second SLA or before/after performance benchmark.

### Task 1 / Task 2 image integration

- A database fixture mutation replaced the same product's source URL while its modal was open. The new revision reached the client, and the old LAVERNE image disappeared from the modal. Modal, cart and search then displayed the replacement body-mist source with the new price and stock limit at both widths.
- Delayed older page/search/ID data cannot overwrite the replacement URL; same-revision older row data is also rejected. The new source cannot find the old source's decoded-image record. A replacement URL also fails the old local scene asset's exact-source identity check.
- Price/stock-only revisions retain decoded imagery for the same immutable URL. Revision changes invalidate **product data**; source changes select different **image records**. The Task 2 source-keyed image cache, preview handoff, framing, quality/sizes and scene retention were preserved.
- Task 2's original 20 benchmark samples remain byte-for-byte unchanged: SHA-256 `b273fda00b14f64fbe4878127d7e75a023e9506b544bea2b76590f0ddb6dd872`. No Task 2 benchmark or implementation was repeated.

### Remaining gate and limitations

1. **Browser history/loading gate remains open.** After a revision refresh, navigating from the catalogue to cart and then back reaches `/category/all` but can remain on `CategorySkeleton` with no product cards. This was also observed with a 30-second wait during diagnosis; final diagnostic captures record the state after five seconds. Directly loading the route recovers and displays the correct current data. Both widths reproduce it. Stale-record rejection is proven independently by unit tests, but this route-level failure prevents full Task 1 back/forward acceptance. Loading-boundary/router work is explicitly deferred under the user's prohibition on Task 3; it is not reported as passed or silently fixed by a forced reload.
2. Browser data reads use the anonymous role against the isolated PostgreSQL fixture and actual local product artwork. No real production/staging mutation, physical-device run or complete seven-viewport matrix was performed. The fixture emulates PostgREST filtering; live production PostgREST query plans/latency were not measured here.
3. Checkout deliberately retains its fresh full server snapshot and transactional order validation. The removed catalogue loads are public display/cart/search dependencies, not a redesign of checkout authority.
4. During QA, the native browser fetch receiver error in the new cache was fixed and regression-tested. The loopback fixture's CORS response was updated to accept headers sent by the current Supabase client; its earlier whitelist prevented browser revision reads. Sandboxed Chrome renderer startup timed out; approved unsandboxed headless Chrome runs completed the data checks. None of these changes relaxes production application security/configuration.

Task 0's original real-public-data performance evidence and the previously documented broader Task 2 visual coverage limits remain historical limitations, not newly claimed passes. No Task 3 implementation, push, deployment, migration or production database write was performed.

## Priority navigation fixes verified — 2026-11-07

The user's priority navigation request is implemented and verified at **390px and 1440px**. The previously open history/loading gate now passes at both widths. No other planned feature, push or deployment was started.

### Reproduction and causes

- Before changing application code, browser automation held actual destination Flight responses. After clicking Home → Categories, the previous Hero remained mounted for at least 1.5 seconds (five Hero images at 390px; one initially loaded image at 1440px), with no destination fallback. Categories → Home similarly retained the Categories heading for the held response. Evidence: `artifacts/performance/navigation-before/reproduction.json`, `reverse.json`, `pending-categories-*.png`, and `pending-home-*.png`.
- The shared layout kept the last server page tree while the destination loaded. Its client renderer trusted the old page's `mode` without checking which pathname owned the payload. The shared shell also imported and composed the homepage scenes. The existing `loading.tsx` is below the asynchronous shared layout; it alone could not remove the retained page immediately when a navigation began.
- The stuck skeleton was isolated with a controlled production comparison: category revision refresh → cart → Back resolved without a modal, but the shallow `?product=` modal/refresh/close sequence restored a tree with no usable catalogue payload or new catalogue request. The history snapshot retained `renderedSearch: ''` while the refresh had requested the modal query URL. The installed Next.js router suspends indefinitely when the restored RSC cache node has no payload. The failure is recorded in the prior Task 1 evidence and the navigation reproduction. A copy of the prior failed data report is retained at `navigation-before/task1-prior.json`.
- Active Hero/Best-Selling motion uses `useSceneFrame` (RAF, intersection and resize observers), including on desktop. The separate GSAP `DesktopHero` is not mounted by the current `Hero`; its existing `matchMedia().revert()` cleanup is intact. GSAP was not responsible for the restored missing payload. Inspection did identify queued scene callbacks and Header theme observers that could read detached scene elements; their teardown is now guarded.

### Fixes

1. **Route-owned content.** Every `StorePage` receives its owning pathname from the server route. `StoreNavigation` records real client navigation intent through Next Link's `onNavigate`, programmatic store navigation, and browser history. Only the matching route payload may render. During a pending destination the old page unmounts and the existing `CategorySkeleton` renders; completed intent resets when the pathname commits so it cannot reactivate on Back. Cancelled product-overlay links and modified/native external navigations are not misidentified as route changes.
2. **Homepage-only scene ownership.** `HomeScenes` is imported and composed by the homepage route. The persistent `Storefront` supplies services and retains the same product/cart/favourite caches, but no longer imports or renders Hero/Best-Selling. Their JSX, CSS, dimensions, product-image policy and animation draw functions remain unchanged. Route changes clear transient dialogs so a previous homepage quick view cannot reopen on a later return.
3. **Consistent URL/cache ownership.** New in-place product overlays use `#product=...` history, preserving Back/Forward without making transient UI a different server query snapshot or issuing product-data requests. Existing `?product=` deep links remain readable; closing one uses a proper router replacement. Sorting and applied filters use App Router navigation; applying several filters is one URL/history update, rather than several shallow native query restores. Server display caching stays enabled and retains its existing revision keys and tags.
4. **Animation/observer teardown.** Scene render/schedule callbacks stop after disposal, even if an observer callback or RAF was already queued. Header theme observation follows the active destination and ignores disconnected sections. No global GSAP teardown, animation redesign, forced document reload, disabled cache, or application navigation timeout/delay was introduced.

### Verified browser matrix

`node scripts/navigation-transition-qa.mjs http://127.0.0.1:58147` passed against the final isolated production build. The original `scripts/navigation-qa.mjs` was preserved; the new regression runner uses the shared native CDP helper.

| Check | 390px | 1440px |
| --- | --- | --- |
| Held Home → Categories response: old Hero/Best-Selling removed within two animation frames | Passed | Passed |
| Held Categories → Home response: old category content absent | Passed | Passed |
| Category hierarchy → product overlay → Back → Forward → close → Home | Passed | Passed |
| Three repeated category/Home Back/Forward cycles | Passed | Passed |
| Rapid superseded Home/Categories/Home/Categories requests | Passed | Passed |
| Direct product route → Home → Back → Forward | Passed | Passed |
| Filter query + revision refresh → cart → Back | Passed | Passed |
| Best-Selling scroll/dot animation reaches the selected item | Passed | Passed |
| Reduced-motion navigation | Passed | Passed |
| Frames showing another route's content | **0** | **0** |
| Detached scene geometry reads after teardown | **0** | **0** |
| Forced document reloads during client navigation | **0** | **0** |
| Skeletons remaining after responses resolve | **0** | **0** |

Normal Hero marquee animation was observed running before departure; no scene RAF reads survived departure. Hero layout dimensions matched before and after the round trip after font/layout readiness: mobile scene width 390px, pin height 752px, main product box 117×288px; desktop scene width 1425px (1440px viewport minus scrollbar), pin height 828px, main product box 183.891×441px. No Hero or Best-Selling stylesheet/draw-function changes were needed.

Evidence: `artifacts/performance/navigation-after/results.json` and screenshots for initial Home, pending Categories/Home, resolved Categories, product overlay, direct product route, Best-Selling and rapid-navigation destination. Mobile pending and desktop Home screenshots were also visually inspected. The browser run recorded **no uncaught JavaScript exceptions**. Delays used by the diagnostic tests hold network responses deliberately; they are not application fixes.

### Task 1 and Task 2 regression validation

- `node scripts/task1-data-qa.mjs http://127.0.0.1:58147`: **passed**, including the previously failed `historyReconciliation` gate at both widths (`historyIssue: null`). Known modal/cart/add/quantity actions still issue **zero** product requests; concurrent search opens share **one** request; a direct cart reload issues **one ID-only** request. Fresh image/price/stock revisions reached the open modal in **13,802ms mobile / 14,224ms desktop**, and modal/cart/search all showed the replacement source. Offline/reconnect/focus and current-data Back checks passed.
- `node scripts/performance-cache-check.mjs http://127.0.0.1:58147`: passed cache reuse, immediate tag expiration, updated display price/stock, accepted fresh quote, and fresh checkout rejection of sold-out products and duplicate lines. Only the ephemeral fixture was mutated. The new results are saved in `artifacts/performance/task1/functional.json` and `checkout.json`.
- Task 1 server/client cache implementation and Task 2 image policy, decoded-source records, framing, preview handoff and immutable source matching were preserved. The existing Task 2 measurement file is unchanged: SHA-256 `b273fda00b14f64fbe4878127d7e75a023e9506b544bea2b76590f0ddb6dd872`. No successful five-run benchmark was repeated.

### Final checks and limits

- Full suite: **66 tests passed, 0 failed** with one test worker, including new link-cancellation, overlay URL identity and scene-teardown tests and all existing data/image/checkout tests.
- TypeScript, ESLint, regular Turbopack production build, isolated webpack production build, QA script syntax checks and `git diff --check`: passed.
- The browser matrix uses current Chrome, DPR 2 and the isolated anonymous-role database fixture with real local product artwork. It does not establish physical-device, all-browser or live production-network behavior. The existing unrelated toolbar text and broader plan limitations remain recorded above; no navigation failure remains in the requested tested flows.
- A QA screenshot attempt hit a full disk. With approval, six explicitly identified stopped temporary QA copies were removed through the existing validated cleanup helper; the workspace, saved evidence, shared dependencies and active server were excluded. The completed runs were rerun successfully. Nonfatal lockfile warnings remain unchanged.
- No push, deployment, production database mutation or later feature work was performed.

## Task 5 admin navigation restructure — 2026-11-07

Implemented Task 5 only on top of the verified Task 1–4 tree at `69aca46`, preserving the existing server actions, Supabase access, inventory rules and storefront. The working-tree plan revision (which removes the admin orders section and moves the logo entrance to Task 7) was followed; no Task 6 or later feature work was started. No commit, push, deployment or migration was performed.

### Implemented behavior

- Added request-cached `requireAdmin()` in `src/lib/admin.ts`, called by the admin layout and every admin page so a page never relies on the layout alone. Unauthenticated or non-admin visitors redirect to `/admin/login`; an authenticated non-admin now sees a sign-out action there.
- Replaced the single tabbed admin page with a route group that keeps the same URLs: `/admin` overview, `/admin/products`, `/admin/categories`, `/admin/storefront`, `/admin/settings`. `/admin/login` remains outside the authenticated layout. No `/admin/orders` route was added, per the revised plan.
- Overview uses count-only queries (`head: true`, no product rows) for total/active/unavailable products and categories, plus links to each section. Legacy `/admin?q=...&page=...` links redirect to `/admin/products` with the same query.
- Data loading is route-owned:
  - Products loads only the current product page, the category list needed for assignment, and currency settings.
  - Categories loads only `store_categories` and `admin_category_counts`.
  - Storefront loads only the selected `hero` or `bestsellers` section.
  - Settings loads only `site_settings`.
- Added `AdminShell`: responsive RTL sidebar on desktop, mobile header/drawer with scroll lock and Escape close, active-section navigation, store link, signed-in email and sign-out. Mobile navigation closes on route change.
- Storefront subsections are URL-backed via `/admin/storefront?section=hero|bestsellers`; product search and pagination remain URL-backed via `q`/`page`.
- Added unsaved-edit coordination: `AdminEditingProvider`, `AdminLink`, and `beforeunload` warning. Product, category, storefront and settings editors report dirty state through context; the optional `onEditingChange` test prop remains supported.
- Removed `src/app/admin/page.tsx` and `src/components/admin/AdminDashboard.tsx`. Added `MenuIcon` to the shared icon set.

### Verification

- `node --test --test-concurrency=1 tests/*.test.mjs`: **69 passed, 0 failed**. Earlier the same suite OOM'd with `NODE_OPTIONS=--max-old-space-size=4096`; without that option it passed. Each file that OOM'd in the earlier run also passed individually without code changes.
- `npx tsc --noEmit`: passed.
- `npx eslint`: passed.
- `npx next typegen`: passed after the route move, clearing stale generated route types.
- `npx next build`: passed the Next.js 16.3.8 Turbopack production build, TypeScript and page generation. The route table shows separate dynamic `/admin`, `/admin/products`, `/admin/categories`, `/admin/storefront` and `/admin/settings` routes plus `/admin/login`.
- Data-isolation proof is source-level: the categories and settings pages import/query only their own managers and tables; no product-editor or merchandising dataset is requested on those routes. The build output confirms separate route modules.

### Limits

- No authenticated staging browser pass was performed, so responsive layout, mobile drawer behavior, unsaved-edit prompts and zero horizontal overflow were not re-verified in a real browser in this session.
- The revised plan intentionally has no admin orders view; order snapshots and checkout behavior are unchanged. Task 6 and later tasks remain unstarted.
- `plan.md` in the working tree already contains the revised plan with reformatted Markdown; it was not edited as part of Task 5.
- No commit, push, deployment, production database mutation or Task 6 work was performed.

## Task 6 — Admin Management UX Improvements — 2026-11-07

Implemented Task 6 on top of the existing uncommitted Task 5 changes. No later task, commit, push, deployment, migration, or production database write was performed.

### Implemented

- Products retain 30-row server pagination and now support URL-backed category and availability filters alongside search. Pagination retains the filters. Availability distinguishes purchasable active products, manual/quantity-based stock exhaustion, and unpublished products. A separate filtered relation preserves all category memberships in each returned product. Changing filters/pages resets local row selection to prevent accidentally moving unseen selections.
- Product editing is organized into basic information, pricing/discounts, images, main/subcategory assignment, stock/availability, visibility/order, and the existing variants section. All submitted fields, background removal, approval/restoration, uploads, variant controls, bulk movement, version checks and feedback remain. Category selectors and assignment labels show full ancestry.
- Categories render as expandable parent groups, recursively including deeper descendants, with optimized thumbnails, direct product counts, visibility, order and existing public paths. Populated categories offer an explicit reassignment/deletion workflow instead of ordinary deletion. Confirmation remains disabled until transfer or detach is explicitly selected. Existing target exclusions, atomic database deletion/reassignment and cycle protections are unchanged.
- Hero and Best-Selling retain separate URL-backed interfaces and save contracts. Added selection counts, search empty states, duplicate-selection feedback, stock badges in results/selections, and thumbnail previews of draft ordering. Preview omits unpublished products while retaining sold-out active products. Reorder buttons have 44px minimum targets and announce moves; native dragging and keyboard/touch controls remain. Numeric counts use isolated direction and currency is not duplicated.
- Preserved the Task 5 authenticated layout, section-specific loading, navigation, unsaved-edit protection and Supabase integration. Lint exposed two pre-existing synchronous state resets inside effects in AdminEditing/AdminShell; moved those resets to conditional pathname-change state adjustment, preserving the navigation behavior without suppressing lint.

### Verification

- `node --test --test-concurrency=1 tests/*.test.mjs`: **72 passed, 0 failed**. Includes CRUD/concurrency, category parent changes/cycle rejection, atomic reassignment/deletion, image replacement/approval/restoration, duplicate merchandising selections, stale saves, persisted ordering, inventory, public cache and checkout regressions.
- Three new focused tests cover server filters and pagination, complete category memberships, ancestry labels/cycle tolerance, and retention of submitted product fields and the image editor.
- `npm run typecheck`, `npm run lint`, final `npm run build` (Next.js 16.3.8 Turbopack), and `git diff --check`: passed. Existing nonfatal lockfile/module-type/line-ending warnings remain.
- `node tests/admin-management-browser.mjs`: passed in isolated Chrome at **390px and 1440px**. Verified no horizontal overflow in product list/editor, category workflow and both merchandising interfaces; expandable categories; disabled deletion confirmation until an explicit choice; keyboard reordering in both interfaces at both widths; touch reordering at 390px; and previews excluding unpublished products while retaining sold-out products.
- Evidence: `artifacts/admin-task6/results.json` and product/editor/category/Hero/Best-Selling screenshots at both widths. Mobile product/editor and desktop merchandising screenshots were visually inspected. The browser harness uses a temporary copy with fixture data and no real database credentials. Chrome required approved execution outside the sandbox. Test input simulation was corrected to send Enter text and settle scrolling before touch coordinates; final checks passed.

### Limits

- Browser checks exercise actual client components with fixture data, not authenticated staging Supabase. Mutation, permission and concurrency coverage comes from isolated database/API tests. No live save-to-public propagation timing or physical-device test was performed; existing invalidation and revision freshness were preserved, not newly benchmarked.
- The preview shows ordered thumbnails, price and availability; it does not recreate storefront animation. No new schema, order-management UI, dependencies or Task 7 entrance work was introduced.
