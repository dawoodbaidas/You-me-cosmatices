# Storefront UX fixes
Changes in this pass:
- BoutiqueDialog.tsx: open before paint, native dialog top layer, shared 320ms fade/transform transitions, animated user dismissal, animation cleanup, focus restoration without scrolling.
- storefront.css: fix open-dialog grid specificity, use physical right placement for RTL desktop cart, remove competing sheet animations, remove inner search field framing, eliminate oversized desktop image minimum.
- ProductQuickView.tsx / Storefront.tsx: quantity selection (1–99), pass quantity to existing cart store, reset details state by product ID, close details before opening cart.
- ProductCard.tsx: remove unused destructured callback.
- MobileHero.tsx / taxonomy.ts: replace five fixed slugs with representatives of populated departments; prefer distinct featured available images; remove scroll-dependent click blocking.
- editorial-motion.css: contain hero/bestseller images, position additional department cards, disable decoration hit targets.
- tests/hero-selection.test.mjs and scripts/ux-fix-qa.mjs: selection regression and browser checks.

Native showModal() already promotes dialogs to the browser top layer, above transformed/sticky ancestors; a portal is unnecessary.
No database, pricing, order message, deployment or push changes.
Browser artifacts are in artifacts/ux-fix; report.json records completed viewports.
Limitations: browser QA uses local preview catalogue and Chrome emulation; real phones, real WhatsApp handoff and live stock changes require separate verification. Hero retains its existing simultaneous editorial composition rather than a sequential one-product carousel.
