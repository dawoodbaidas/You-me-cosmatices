# Storefront UI audit — 2026-11-06

## Ownership and findings

- `(store)/layout.tsx` already owns the persistent Storefront and Header. Header now omits its compact category navigation only on `/`. Admin/login are outside this layout. Homepage category shopping content remains intact.
- Category records already have `image_path`, UUID identity and stable internal slug relationships. `storeCollections` reads this field, never Arabic-name image mappings. The existing category API optimizes to WebP, creates a new immutable Storage path for every replacement, saves through the concurrency-protected RPC and invalidates the catalogue. Admin refreshes after saving. Store revision subscriptions/focus checks/polling refresh open storefronts. These mechanisms were reused without schema, RLS or API changes.
- CategoryImage now owns contain-fit rendering, padding and missing/error states for storefront circles/cards and admin preview. Responsive containers reserve space. No image variants or hardcoded category URLs were added.
- The active Hero delegates to MobileHero at all breakpoints; DesktopHero is not mounted. The active implementation capped desktop product widths at mobile dimensions. Responsive frame sizes and surrounding-product distances now grow together.
- Scene images from current database uploads can contain large transparent margins and lack the older local scene metadata. SceneProductImage now measures alpha bounds on image load (maximum 256-pixel canvas), then fits the visible subject proportionally on resize. This is display-only: it neither edits files nor removes opaque pixels. Canvas failures retain the complete image. Existing scene metadata remains supported. RTL inset overconstraint is explicitly avoided.
- Best-sellers retain native continuous scroll, the curved composition, rotation, scale and palette interpolation. Desktop scroll travel is longer than mobile. Products fade at the edges instead of disappearing abruptly. The nearest product's information stays visible and interactive between positions.
- Scene-specific selectors now outrank the global storefront resets that previously shrank headings and removed button styling. No global typography or palette change.
- Category height is measured by ResizeObserver, with cleanup, and included in catalogue/cart sticky and anchor offsets. Header remains separately measured. Existing passive-scroll/RAF lifecycle and reduced-motion behavior are retained; no new GSAP instances.

## Exact files changed for this task

- `src/components/Header.tsx`
- `src/components/CategoryCircles.tsx`
- `src/components/CategoryImage.tsx` (new)
- `src/components/admin/CategoryManager.tsx`
- `src/components/category-shopping.css`
- `src/components/shopping-navigation.css`
- `src/components/store-routes.css`
- `src/components/boutique-redesign.css`
- `src/components/CartPage.module.css`
- `src/components/MobileHero.tsx`
- `src/components/BestSellers.tsx`
- `src/components/SceneProductImage.tsx`
- `src/components/scroll-scenes.module.css`
- `src/lib/scene-palette.ts`
- This audit document.

Background removal, product save APIs, database policies and dependencies were not modified by this task. Earlier uncommitted work remains in the workspace.

## Verification

- TypeScript and ESLint passed.
- Production build passed.
- 13 existing regression tests passed across category images, category hierarchy, header categories, merchandising and native scene scrolling. Coverage includes image replacement cache keys, upload/save failure preservation, authorization, stale saves, product selections, pricing and checkout snapshots.
- Tested the actual local storefront connected to its existing catalogue in Chrome at 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900 and 1920×1080. Screenshots were visually inspected at mobile and desktop sizes.
- All seven widths: no document horizontal overflow on homepage/category listing; homepage has one header and no compact category bar; categories have one of each. Sticky category top equals header bottom. Hero CTA and best-seller purchase controls remain in view; one active best-seller information panel stays fully visible while scrolling between products.
- Checked cart, favorites, all-products, categories and a direct product detail URL for shared navigation. Admin login has neither storefront header nor category bar. Product selection continues to open the existing quick-view URL behavior.

## Limits

The live categories inspected have no assigned images, so browser checks exercise their fallback state; image upload/replacement and invalidation are covered by isolated database/Storage tests, not a write to the live store. Original image resolution still limits sharpness. Transparent framing preserves opaque margins when present, and falls back to the full image if canvas access fails. Browser checks do not constitute a hardware performance benchmark or coverage of every payment/cart interaction.

No push, deployment, database migration or live catalogue mutation was performed.
