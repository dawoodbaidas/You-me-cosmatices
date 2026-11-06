# You & Me Cosmetics — Performance, Inventory, Navigation, and Admin Plan

## 1. Audit findings and evidence limits

No files were changed during this planning pass. The working tree contains earlier uncommitted image, modal, cart, and category-navigation work; implementation must preserve unrelated edits and establish a baseline from this exact tree.

### Current architecture

## Area Observed implementation Implication

App Router Shared (store)layout.tsx loads navigation and mounts a persistent client Storefront; route pages supply StorePage data. Keep persistent cart state, but reduce the shared shell’s responsibilities.
Public data store-catalogue.ts reads an uncached revision before a revision-keyed, tagged catalogue RPC cached for 300 seconds. React cache() deduplicates catalogue and navigation calls separately. Caching already exists. Revision requests, payload size, and route dependencies need investigation before changing TTLs.
Categoryproduct routes Inspected category and product routes request the complete catalogue. A product detail or category navigation can serialize substantially more data than it needs.
Client state Storefront merges page, search, and cart products; persistent stores retain cart and favourites. Reuse existing state infrastructure rather than adding a caching library.
Cart hydration Fetches products by IDs whenever cart IDs or revision change, including products potentially already available on the page. There is a concrete opportunity to avoid redundant hydration requests. Opening the drawer itself does not fetch the entire catalogue.
Search Opening search can request the full public product list. Cache this public result by revision and deduplicate concurrent requests.
Images Scene images may use local scene assets; ordinary media uses product.imageUrl. Listings request quality 70, ordinary media 90, and scenes use the Next.js default. The same product can produce different source URLs and optimization URLs. A shared component alone will not solve reuse.
Best-Selling Only active and adjacent scene images are mounted. Returning to an item remounts its media and framing work, even if network bytes are cached.
Scene framing SceneProductImage can inspect transparency with canvas and uses resize observation. Measure repeated decodingframing cost; do not assume every visual delay is network latency.
Shared JavaScript Storefront statically imports Hero, Best-Selling, and other homepage code. Verify route chunks, then move homepage-only imports out of the persistent shell.
Navigation A new, uncommitted store loading boundary and category skeleton already exist. Test and complete this fix; do not add another competing loading mechanism.
Freshness useStoreRefresh uses realtime, focusreconnectback navigation checks, and 30-second polling. Retain bounded freshness while removing redundant refreshes and stalled refresh states.
Admin Products already have server pagination at 30 rows; all section datasets are fetched together. UI uses four local tabs. Reorganize and split data loading, rather than rebuilding CRUD or adding pagination from scratch.
Merchandising HeroBest-Selling search, selection, ordering, and persistence already exist. Improve presentation, stock visibility, and section isolation while preserving existing save contracts.
Categories Existing parent relationships, hierarchy migration, deletionreassignment logic, and Storage policies exist. Reuse the actual hierarchy and database protections.
Inventory Nullable stock_quantity, shared cart limits, fresh checkout reads, and database order validation exist. Add an independent availability override throughout the existing validation chain.
Orders store_orders, store_order_items, and create_store_order already exist, with admin read policies. Add a read-only admin order-history view; do not imply payment or fulfilment tracking.
Storage Category uploads use unique object paths and a one-year cache lifetime. Product upload paths include lossless approved WebP processing. Preserve immutable URLs; measure source sizes before proposing upload changes.

### Confirmed versus unconfirmed causes

Confirmed code-level problems or costs

- Different sourcequalitysize policies prevent guaranteed image-cache reuse across scenes, cards, modal, and cart.
- Best-Selling media remounts outside the active neighborhood.
- Inspected detailcategory routes load complete catalogue data.
- The persistent storefront imports homepage-specific components.
- Admin loads products, settings, categories, merchandising selections, and counts together.
- Product data merges do not explicitly enforce a revision-aware freshness policy.
- Recent quick-view styling adds another layer over several legacy stylesheets; its production visual quality remains unverified.

Hypotheses requiring traces

- Image optimization misses are responsible for visible modal delays.
- Source image size, canvas processing, or decoding dominates Hero appearance time.
- Client context updates materially rerender unrelated product cards.
- GSAP or route lifecycle cleanup contributes to navigation flashing.
- Current upload dimensions are excessive for frequently displayed assets.

Runtime evidence

- Read-only access outside the sandbox returned 81 active products and 17 active categories.
- All 81 products had image URLs; two sampled image requests returned successful image responses.
- Sandbox access returned EACCES. The earlier local HTTP 503 therefore does not establish a production database outage.
- No current coldwarm performance trace establishes LCP, INP, duplicate transfers, or modal latency. Earlier buildtest passes are not performance evidence.

## 2. Architecture and implementation decisions

### Public data and cache ownership

- Keep Supabase as the source of truth and existing tagged server caching.
- Deduplicate revision reads within a server render.
- Keep navigation, route products, and merchandising reads separate; use narrow cached queries rather than transferring the full catalogue to every route.
- Cache public display reads for up to 30 seconds and invalidate their tags immediately after successful admin mutations.
- Retain revision-triggered refresh for already-open tabs, with polling fallback while visible. Reconcile page, search, and cart caches together when revision changes.
- Never put authenticated admin responses or checkout results in public caches.
- Checkout continues to bypass display caches and validate current product, variant, quantity, price, and availability in trusted serverdatabase code.
- Use existing React stores and a small revision-aware public product cache; no new client-cache dependency.

### Image reuse

Introduce a shared image policy and a bounded in-memory record of successfully loaded images

- Key records by canonical source URL, not product ID alone.
- Record the loaded currentSrc, decoded dimensions, and successful load state.
- Use consistent quality 75 for ordinary storefront display variants; retain a higher-resolution option only if visual review proves it necessary.
- Define responsive size policies for thumbnail, listing, scene, and detail contexts. Different resolutions remain legitimate requests.
- Render a previously loaded suitable image immediately in quick view while the requested detail variant loads and decodes; replace it only after success.
- Keep the previous image visible if the upgrade fails.
- Never display an old-source image after an admin image replacement.
- Prefetch detail media only on deliberate intent pointer hover, keyboard focus, or a selected scene item approaching interaction. Respect reduced-data signals.
- Do not eagerly fetch every catalogue image.
- Keep uncertainpromotional images contained. Explicit cover remains opt-in.
- Preserve scene-specific visual assets where needed for the existing animation; do not silently substitute a different composition in product details. Reuse requires verified source identity.

Bound the loaded-image record to 100 entries, with least-recently-used eviction and no persistent binary cache or service worker.

### Inventory

Add products.is_out_of_stock boolean not null default false.

Effective purchase availability requires

- Product is active.
- Manual out-of-stock override is false.
- Selected variant remains valid and active.
- Numeric stock and existing quantity limits permit the purchase.

Turning off the override preserves recorded numeric stock. A product with quantity zero remains unavailable until quantity is restored.

Unavailable active products remain visible everywhere, including configured Hero and Best-Selling selections. Public visibility must not be implemented through is_active.

### Admin

Use authenticated App Router sections

- admin — الرئيسية
- adminproducts — المنتجات
- admincategories — الأقسام
- adminstorefront — واجهة المتجر
- adminorders — الطلبات
- adminsettings — الإعدادات

A shared server-authenticated layout supplies sidebarmobile navigation. Each section fetches only its own data. Search, filters, pagination, and storefront subtab belong in URL parameters.

Orders are read-only snapshots with line items and totals. No invented payment, delivery, or fulfilment statuses.

### Entrance animation

Homepage-only, first eligible homepage entry per tab session

- Reuse the existing logo and GSAP dependency.
- Two cream panels open outward with a subtle centred logo treatment.
- Target 1.2 seconds; no artificial hold.
- Start only when hydration and the critical visible Hero image are ready promptly.
- Skip if readiness takes more than 500ms after hydration, reduced motiondata is requested, or session storage is unavailable.
- Mark the session before starting.
- Keep homepage loading independent; never wait for noncritical assets.
- Make the overlay decorative and non-focusable. Any user interaction dismisses it immediately.
- Clean up timelines and overlay on completion, route changes, errors, or unmount.
- If controlled testing shows measurable LCP regression, ship the performance-safe skipped behavior until the reveal is corrected.

## 3. Executable tasks in dependency order

### Task 0 — Establish the baseline and verify contracts

Goal Separate actual bottlenecks from assumptions.

Files inspected Current route tree; next.config.ts; store-catalogue.ts; existing performancebrowser scripts; migrations 001–006; local Next.js caching, Image, loading, and routing documentation.

Changes proposed Add a reproducible read-only profiling harness and report. Capture URL, source identity, optimizer widthquality, cache headers, transfer bytes, timings, request initiator, and loaded image dimensions. Inventory actual bundle sizes and scene assets. Inspect current GSAP hooks and cleanup owners.

Dependencies None.
Risk Low.
Verification Production-mode local server with real public Supabase reads; five cold and five warm runs per principal flow.
Acceptance Saved traces identify the LCP element, duplicate transfers, database request counts, modal delay components, and baseline route JavaScript. No secrets in artifacts.

### Task 1 — Correct public data ownership and redundant reads

Goal Reduce route latency and payload without weakening checkout freshness.

Files srclibstore-catalogue.ts, srclibstore-cache.ts, public store route pages, srcappapistoreproductsroute.ts, srccomponentsStorefront.tsx, srccomponentsuseStoreRefresh.ts.

Exact changes

- Request-deduplicate revision access.
- Add narrow category, product-by-slug, product-by-ID, and homepage-selection reads.
- Cache public reads with shared invalidation tags and bounded freshness.
- Remove the full-catalogue dependency used solely to resolve cart lines.
- Hydrate only missingstale cart IDs; deduplicate in-flight requests.
- Reconcile public product records by revision and prevent older page data overwriting fresher records.
- Clearreload stale search data after revision changes.
- Retry failed refreshes without permanent refreshing lockout.
- Preserve fail-closed checkout behavior and clear public-data error states.

Dependencies Task 0.
Risk High.
Verification Request counts, cross-category cart, price changes, reconnect, concurrent requests, failed refresh, and backforward tests.
Acceptance Opening a known product or cart requires no catalogue request; quantity-only changes make no product-fetch request; public changes appear within 30 seconds under healthy connectivity.

### Task 2 — Implement image reuse and efficient scene loading

Goal Show already-loaded imagery immediately and reduce unnecessary decodingtransfers.

Files ProductMedia.tsx, ProductImage.tsx, SceneProductImage.tsx, ProductLens.tsx, ProductQuickView.tsx, MobileHero.tsx, BestSellers.tsx, srclibscene-products.ts, next.config.ts; new srclibproduct-media.ts.

Exact changes

- Centralize quality and responsive size policies.
- Record successful decoded currentSrc values by source identity.
- Add cached-image-to-detail-image handoff without blank intermediate frames.
- Remove unnecessary image keysremounts where identity has not changed.
- Memoize transparency-framing metadata by source instead of repeating canvas work on every mount.
- Retain successfully visited Best-Selling media for the current lineup; initially load only activeadjacent items.
- Bias upcoming-image loading toward scroll direction.
- Prioritize only the visible critical Hero asset; preserve geometry and animation timings.
- Preserve card outer dimensions, tags, controls, and animations.
- Keep immutable Storage URLs and existing image content.

Dependencies Task 0; integrate with Task 1 product identity.
Risk Medium–high.
Verification Network traces and screenshots using promotional backpack, transparent cutout, portrait, square, and landscape products. Test image failure and source replacement.
Acceptance No duplicate network body transfer for the identical optimized URL in warm flows; cached preview appears without a blank frame; high-resolution upgrades are distinguishable from redundant requests.

### Task 3 — Isolate homepage code and complete navigation fixes

Goal Keep animation code out of unrelated initial routes and eliminate stale homepage flashes.

Files Storefront.tsx, StorefrontMotion.tsx, StoreScroll.tsx, store route layoutsloading boundaries, CategorySkeleton.tsx; new homepage-only composition component.

Exact changes

- Move Hero and Best-Selling compositionimport ownership to the homepage route.
- Preserve the shared cartfavourites shell.
- Complete the existing loading-boundary work rather than adding duplicate skeletons.
- Tie rendered route content to the owning route payload, not retained previous-page data.
- Keep internal navigation and browser-history semantics intact.
- Audit scene cleanup, observers, scroll listeners, and pending animation frames on departure.
- Prefetch useful visible navigation links without eagerly prefetching the entire catalogue.

Dependencies Tasks 0–1.
Risk High.
Verification Delayed RSC responses, prefetched and uncached links, repeated backforward, direct links, and scroll restoration.
Acceptance No Hero DOM or stale category products appear as destination content; no full reloads; non-home initial route chunks exclude homepage animation implementation.

### Task 4 — Add the independent stock override end to end

Goal Reliable product-level availability without destroying numeric inventory.

Files New supabasemigrations007_product_availability.sql; product types, mapper, editor validation; admin product mutation handlers; cart.ts, checkout.ts, srcappcheckout.ts; cards, quick view, cart, search, and scene purchase controls.

Exact changes

- Add the boolean field and preserve all existing policies.
- Extend admin save contracts and public mapping.
- Update database order validation to reject the override.
- Ensure idempotent order retries cannot bypass current availability validation.
- Add Arabic toggle, list status, and availability filter.
- Apply shared effective-availability logic to all purchase entrypoints.
- Keep unavailable cart rows visible with actionable feedback.
- Disable checkout when any line is invalid.
- Keep configured scene selections and product visibility intact.

Dependencies Task 1.
Risk High.
Verification Override onoff with null, zero, and positive stock; multiple variants; stale tabs; concurrent saves; repeated order IDs; unauthorized writes.
Acceptance Neither client actions nor direct checkout calls produce an order containing unavailable products; turning off the override never invents stock.

### Task 5 — Introduce the admin shell and section-specific loading

Goal Clear Arabic navigation with smaller initial workloads.

Files srcappadminlayout.tsx, existing admin pageactions, AdminDashboard.tsx, new section pages and extracted settings editor.

Exact changes

- Move shared authentication and navigation into the admin layout.
- Load only the active section’s data and editor code.
- Preserve admin access and existing product search links through compatible redirectsquery handling.
- Add useful overview counts without transferring full product records.
- Preserve unsaved-edit protection and saveerror feedback.
- Use responsive sidebarmobile navigation and URL-backed state.

Dependencies Task 0; stock display integrates after Task 4.
Risk Medium.
Verification Anonymousnon-adminadmin access, direct section URLs, navigation with dirty forms, mobile keyboard, and bundlenetwork inspection.
Acceptance Opening Settings or Categories does not fetch product-editor or merchandising datasets; no horizontal page overflow.

### Task 6 — Refine product, category, and merchandising administration

Goal Improve management workflows using existing functionality.

Files ProductManager.tsx, CategoryManager.tsx, HomeSectionManager.tsx, admin section pagesactions, category mutation route.

Exact changes

- Preserve 30-row product pagination; add category and availability filters.
- Group product editing into basic information, pricing, images, hierarchy, variants, stock, and visibility.
- Keep background removal, image approvalrestoration, uploads, and current bulk operations.
- Render categories as expandable parent groups with existing counts and image sources.
- Preserve database cycle protections; block ordinary deletion of populated categories and retain an explicit reassignment workflow.
- Keep separate Hero and Best-Selling selection interfaces with thumbnails, order numbers, stock badges, search, preview, and accessible reorder controls.
- Preserve duplicate prevention and optimistic-concurrency checks.
- Use thumbnail-sized optimized media throughout.

Dependencies Tasks 4–5.
Risk Medium–high.
Verification CRUD, parent changes, cyclic parent rejection, populated deletion, image replacement, duplicate selections, stale save conflicts, and touchkeyboard reordering.
Acceptance All existing management functions survive; saved ordering and image changes persist and appear in public views within the freshness target.

### Task 7 — Expose existing order history

Goal Provide accurate access to stored WhatsApp order snapshots.

Files New admin Orders pagedetail components using existing authenticated Supabase client and order types.

Exact changes Paginated newest-first history, order identifier, timestamp, totals, and line-item detail. Clearly label records as generated order snapshots.

Dependencies Task 5.
Risk Medium.
Verification Admin-only reads, pagination, emptyerror states, RTL totals, and snapshot rendering.
Acceptance No public order exposure, invented statuses, or database mutation functionality.

### Task 8 — Add the performance-gated logo entrance

Goal Deliver the requested reveal without making content readiness dependent on animation.

Files New homepage entrance component; homepage composition; existing StoreBrand logo asset and homepage animation owner.

Exact changes Implement the architecture and skip rules above; use one GSAP timeline and transformopacity only.

Dependencies Tasks 2–3 and stable performance baseline.
Risk Medium.
Verification First visit, internal navigation, new tab session, storage failure, reduced motion, slow image, route interruption, and animation-onoff traces.
Acceptance Runs once per eligible session, leaves no overlaylistener behind, creates no CLS, and passes the performance comparison.

### Task 9 — Complete regression and performance proof

Goal Demonstrate improvements against the original baseline.

Files Existing tests, focused new inventorycache tests, browser QA scripts, and performance report.

Dependencies All previous tasks.
Risk Low; release-blocking verification.
Verification TypeScript, ESLint, production build, complete existing test suite, public real-data browser tests, authenticated staging admin tests, and coldwarm network traces.
Acceptance All required flows pass, failures are resolved or explicitly block completion, and measured results are reported without inferred performance claims.

## 4. Database, testing, and measurable acceptance

### Database and rollout boundaries

- One additive availability migration is required for the chosen independent override.
- Extend existing save and checkout functions; preserve grants, RLS, security checks, and concurrency behavior.
- No new category, merchandising, or order schema is planned.
- Test migration and admin mutations in a separate nonproduction Supabase environment using authorized existing data. Never mutate production during verification.
- Prepare migration files and compatibility instructions locally; do not apply production migrations, push, deploy, or change infrastructure.
- Apply the additive migration before application code that requires the field. Rollback retains the field and recorded values rather than dropping data.

### Browser matrix

Run at 360×800, 375×812, 390×844, 430×932, 768×1024, 1440×900, and 1920×1080.

Cover all 18 requested flows, including coldreturning visits, scene interactions, cached quick viewcart, category history, search, stock updates, category image replacement, merchandising reorder, and persistence after refresh.

Use real product images for visualperformance checks. Unit tests may use controlled fixtures; they must never replace storefront data.

### Performance protocol and targets

- Use production builds, documented browserDPRCPUnetwork settings, and five runs per coldwarm scenario.
- Report median and worst run; separate first optimizer miss, warm server cache, and warm browser cache.
- Target lab LCP ≤2.5s and CLS ≤0.1 under the documented mobile profile.
- Target interaction latency ≤200ms; report lab Event Timing separately from field INP. Field INP requires real-user evidence.
- Warm modal and cart visible response within 100ms, complete usable controls within 200ms, with no required data request for already-known products.
- Warm navigation destination content or correct loading state within 100ms; never stale homepage content.
- No duplicate transfer of an identical cached optimized image URL.
- No full-catalogue transfer solely to open a known modal or cart.
- No meaningful bundle, transfer, or LCP regression from the entrance animation.
- Set byte-reduction budgets after Task 0 identifies actual waste; do not promise arbitrary percentage improvements.

### Main regression risks

- Narrow queries may omit cart products or category descendants.
- Cache reconciliation may display older prices or availability.
- Source mismatches may reuse the wrong image composition.
- Homepage code extraction may alter animation mount timing.
- Admin routing may discard unsaved edits or reset filters.
- Stock changes may bypass an overlooked purchase path or idempotent checkout retry.
- Recent modalcart work may still contain visual defects hidden by incomplete testing.

Each is covered by its task’s acceptance tests. Completion requires measured evidence, not merely successful compilation.

Defaults locked independent stock override; public freshness within 30 seconds under healthy connectivity; fresh trusted checkout validation; performance-first entrance; no new cache library; existing public design preserved.

Remaining verification limits current network timing, full GSAP lifecycle behavior, physical-device safe areas, and authenticated admin mutation flows have not yet been measured. They are explicit implementation gates, not assumed successes.
