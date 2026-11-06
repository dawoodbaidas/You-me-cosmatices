# Mobile UI corrections — 2026-11-06

## Changes and ownership

- Mobile Hero: product frames previously gave the first item much more visible area, and surrounding products extended beyond narrow viewport edges. Mobile-only frames now use an area budget derived from the existing alpha bounds. Wide jars and tall bottles retain their aspect ratios. Outer products occupy a higher tier with a smaller entrance angle. No product IDs or image-specific conditions are used. Existing easing and timing remain; the section and pin lose equal cart clearance so scroll travel remains unchanged.
- Mobile Best-Selling: a separate geometry helper uses a horizontal step 25% larger than the existing `.33 × width`. Horizontal travel is linear across product boundaries, with a continuous parabolic vertical path. Mobile frames leave room for adjacent products. Native scrolling, reversal, palette interpolation and desktop geometry remain in place.
- Categories: page-only grids use two columns on phones and auto-fit columns on desktop, so two subcategories share the container instead of occupying only two columns of a fixed five-column grid. The content is centered in a 1160px container, with tighter breadcrumb/heading spacing. Homepage category content and compact category navigation retain their layouts. Existing CategoryImage and Supabase image data are reused.
- Cart clearance: ResizeObserver measures the fixed bar's actual height. Mobile storefront pages reserve this height plus its bottom offset, safe-area inset and a small gap, even while the cart is empty. This deliberate reservation prevents layout jumps when the bar appears. The dedicated cart page does not reserve it. Hero and Best-Selling pins leave their controls above the bar. Cart state, pricing and checkout calculations are unchanged.
- Scene lifecycle: the existing shared RAF hook now also observes section/pin resizing, including image and clearance changes; the observer is disconnected during cleanup. No new animation libraries or GSAP instances.

## Exact files changed in this task

- `src/components/MobileHero.tsx`
- `src/components/BestSellers.tsx`
- `src/components/SceneProductImage.tsx`
- `src/components/scroll-scenes.module.css`
- `src/components/useSceneFrame.ts`
- `src/lib/mobile-scene-geometry.ts` (new)
- `src/components/CategoryCircles.tsx`
- `src/components/Storefront.tsx`
- `src/components/category-shopping.css`
- `src/components/MobileCartBar.tsx`
- `src/components/storefront.css`
- `tests/mobile-scene-geometry.test.mjs` (new)
- This document.

## Verification

- TypeScript, ESLint and production build passed.
- Five focused tests passed: proportional image budgets, source-resolution independence, reversible continuous arc geometry, native mobile/reduced-motion scrolling, category identity and category image upload/replacement/cache keys and failure preservation.
- Actual local storefront inspected in Chrome at 360×800, 375×812, 390×844, 430×932, 1440×900 and 1920×1080. Mobile Hero screenshots were inspected at all four phone sizes; Best-Selling and category screenshots were inspected on mobile and desktop category layout was inspected with a real two-child category.
- Mobile Hero CTA and Best-Selling purchase controls stayed above the visible cart bar. No horizontal page overflow at any target size. Category cards were two equal columns on phones and evenly distributed across the centered desktop container; RTL was retained.
- Slow sampled movement, large scroll jumps and reversal were exercised. Returning to the same scroll position restored the same transform. A 120ms sample at 430px ran before the scroll update; repeating with a settled render confirmed consistent geometry.
- Adding a real catalogue item through the existing purchase handler changed neither page height, scene height nor scroll position. Only browser cart state was used; its original empty state was restored afterward. No order or database mutation was made.
- Desktop before/after scene measurements at matching scroll positions were identical at 1440×900 and 1920×1080, including product frame sizes, positions and transforms for both Hero and Best-Selling.

## Limits

Live category records inspected have no assigned images, so visual browser checks cover the existing fallback states. Isolated category tests verify image storage/replacement without writing to the live store. Browser emulation is not a physical-device performance benchmark. Existing Next development LCP advisories can appear when jumping directly into lazy-loaded Best-Selling products; no runtime console errors were observed.

No product data, schema, RLS, background-removal integration or cart calculations were changed. No push or deployment.
