# Storefront redesign boundaries

The Next.js App Router page calls `getCatalogue` on each request. Supabase products and settings are mapped into `Product` / `SiteSettings`, then passed to the client Storefront. The existing explicitly configured offline preview remains unchanged.

`Storefront` owns category and variant selection and delegates persistence to `lib/stores.ts`. `lib/cart.ts` joins stored IDs with current catalog prices. `lib/categories.ts` defines the existing category semantics. `lib/whatsapp.ts` builds the established order message and URL.

Allowed changes: customer-facing components, scoped storefront CSS, presentation state, accessibility, tests and documentation. Shared data services, types, stores, cart arithmetic, checkout handlers, API routes, admin components/routes, Supabase files, environment files and dependencies remain unchanged.

Art direction: porcelain paper, oxblood ink, restrained blush, Arabic editorial headlines and italic serif English accents. Mobile uses a stacked campaign, native horizontal category exploration, two-column product browsing and a bottom cart sheet. Desktop uses asymmetric campaign photography, a sticky editorial spotlight and a side cart drawer. Motion uses CSS entrance choreography and progressive scroll timelines; unsupported browsers retain fully visible static compositions. Reduced motion disables spatial effects.

Verification covers responsive screenshots, scroll/overflow, all filters, variant selection, cart persistence/arithmetic/removal, intercepted WhatsApp checkout, keyboard dialogs and reduced motion. No orders are sent and no production deployment is performed.
