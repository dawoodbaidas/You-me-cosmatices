# You&Me storefront refresh

The category listing now uses an ivory editorial layout, portrait product media with `object-fit: contain`, a two-column mobile grid and four-column desktop grid. Product controls stay visible on touch screens. Badges come only from database discounts or a `new`/`جديد` badge. Search, sort and availability/discount/new filters operate on the current database catalogue; the mobile filter is a bottom sheet.

Product details use a large contained database image, readable description and variant choices, with the existing purchase controls held at the bottom of the mobile detail panel. The cart is a compact mobile bottom sheet and a desktop side drawer. Existing price, stock, quantity, free-shipping and WhatsApp checkout logic remains in place.

The source schema exposes one `image_url` per product, so no alternate hover image exists to show. Desktop cards use a restrained image hover scale. No product records or images were added or changed.

## Rendered review

Production Chrome captures against an isolated local database. Mobile viewport is 390 × 844; desktop is 1440 × 900.

- [Mobile category listing](../test-results/store-design-mobile.png)
- [Desktop category listing](../test-results/store-design-desktop.png)
- [Mobile filter sheet](../test-results/store-design-filters-mobile.png)
- [Desktop filters](../test-results/store-design-filters-desktop.png)
- [Mobile product details](../test-results/store-design-details-mobile.png)
- [Desktop product details](../test-results/store-design-details-desktop.png)
- [Mobile cart](../test-results/store-design-cart-mobile.png)
- [Desktop cart drawer](../test-results/store-design-cart-desktop.png)

The browser run exercised category links, sorting/filter controls, product details, add-to-cart, cart quantities, browser back and a database stock update. TypeScript, ESLint and the production build passed. The existing cart and checkout functions remain database-backed.
