# You & Me Cosmetics - Storefront

**Existing production upgrade:** full product/variant/image management is documented in
[Product management deployment and testing](docs/product-management.md). Apply only migration
`002_product_management.sql` to an existing database; do not rerun the initial schema or seed.
The original setup instructions below are for a new database.

For existing images, see the [manual WebP image migration guide](docs/image-migration.md).
It provides dry-run, migration and verification commands, preserves originals, and never runs seeds.

Production rebuild of the original single-file prototype (`../You-Cosmetics.html`) as a
Next.js 16 app backed by Supabase.

- Arabic RTL storefront, Tajawal type, and the original colour/animation system.
- 38 products / 56 variants with images extracted from the prototype.
- Prices live in Supabase Postgres — nothing is hardcoded in the frontend.
- Admin pricing at `/admin`, protected by Supabase Auth **and** a database-level
  admin allow-list.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in the two NEXT_PUBLIC_* values
npm run dev
```

Without Supabase configured the app deliberately **refuses to invent prices**: it renders a
setup notice instead of the shop. See “Offline preview” below if you just want to look at the
design.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed:build` | Regenerates `supabase/seed.sql` + `src/data/preview-products.json` from the original files, and prints a full match report |

---

## 1. Supabase setup

### 1.1 Create the schema

Supabase Dashboard → SQL Editor → New query, run:

```
supabase/migrations/001_initial_schema.sql
```

It creates `products`, `product_variants`, `site_settings`, `admin_emails`, the
`updated_at` triggers, and all RLS policies. It is idempotent.

### 1.2 Load the catalogue

Run `supabase/seed.sql` in the SQL editor (or `supabase db reset` locally). It inserts all 38
products and 56 variants with the prices from `../you-and-me-prices.json`, plus the storefront
settings.

Regenerate it any time the source files change:

```bash
npm run seed:build
```

`scripts/build-import.mjs` reads `../products_from_html.json` (extracted from the prototype) and
`../you-and-me-prices.json`, resolves each product's image by matching its slug against
`public/products/`, and prints:

```
JSON price keys ............. 38
Products in original UI ..... 38
Variants .................... 56
Products with no JSON price . none
JSON prices with no product . none
Variants in JSON not in UI .. none
Products with no image file . none
```

It exits non-zero if anything is unmatched, so a broken import cannot pass silently.

### 1.3 Create the admin account

1. Dashboard → Authentication → Users → **Add user**. Use the store owner address and set a
   password.
2. SQL Editor — allow-list the address:

   ```sql
   insert into public.admin_emails (email, note)
   values ('youme.work20@gmail.com', 'owner')
   on conflict (email) do nothing;
   ```

3. SQL Editor — promote the account (only possible server-side; `app_metadata` cannot be
   self-escalated from a client):

   ```sql
   update auth.users
      set raw_app_meta_data =
            coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    where email = 'youme.work20@gmail.com';
   ```

4. Sign in at `/admin`.

Authorisation lives in one place, `public.is_admin()`, and requires **both** conditions. Sign-in
alone is not enough, so any authenticated user who is not allow-listed cannot write anything.

---

## 2. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon key — safe to expose, RLS restricts it |
| `PREVIEW_WITHOUT_SUPABASE` | no | `true` = local design preview only |

**Never** put the service-role key in this project. Nothing in the app needs it; the SQL editor
plays that role during setup.

---

## 3. How prices reach the screen

`src/lib/products/queries.ts` is the single read path.

```
page.tsx (Server Component, force-dynamic)
  └─ getCatalogue()
       ├─ Supabase: products (is_active) + product_variants, site_settings
       └─ on failure → status:'error'  → CatalogueError UI
```

`export const dynamic = 'force-dynamic'` guarantees the storefront is rendered per request, so a
price edit in the admin panel is visible on the next visit without a redeploy.

Every cart figure comes from that fresh load:

- `localStorage` stores **only** `{ productId, variantId, quantity }`
  (`src/lib/cart.ts`, key `you-and-me-cart-v1`).
- `resolveCart()` joins those ids against the loaded catalogue and computes prices.
- A product deactivated in the admin, or a variant deleted, drops out of the cart automatically —
  a stale variant id never silently falls back to the base price.

WhatsApp checkout (`src/lib/whatsapp.ts`) rebuilds the original message format, in Arabic, with
live unit prices and a computed total.

---

## 4. Security

| Concern | Handling |
| --- | --- |
| Public reads | RLS `select` allows anonymous access to active rows |
| Catalogue writes | RLS requires `public.is_admin()` (email allow-list **and** `app_metadata.role`) |
| Settings writes | Same, plus server-action validation of the WhatsApp number |
| Admin routes | `src/proxy.ts` redirects logged-out visitors; `src/app/admin/page.tsx` re-checks session **and** `is_admin()` server-side. The proxy is UX only — the page check and RLS are the real gates |
| `admin_emails` | Not readable by anon; it holds addresses |
| Passwords | Supabase Auth only. The prototype's client-side plaintext password check is gone |
| Headers | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` in `next.config.ts` |

Client-side `role` claims are never trusted — `isAdmin()` always asks the database.

---

## 5. Offline preview (local design only)

To review the UI without a Supabase project:

```bash
npm run seed:build
# .env.local
PREVIEW_WITHOUT_SUPABASE=true
npm run dev
```

A banner appears at the top saying prices come from a snapshot. The snapshot
(`src/data/preview-products.json`, ~37 KB) is generated from the original files and is **ignored
as soon as** `NEXT_PUBLIC_SUPABASE_URL` is set. It is never consulted in production.

---

## 6. Deploying to Vercel

1. Push the repo, import it in Vercel (framework auto-detects Next.js).
2. Project Settings → Environment Variables: add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Production, Preview, and Development.
3. Deploy. Run `supabase/migrations/001_initial_schema.sql` then `supabase/seed.sql` in the
   Supabase SQL editor.
4. Sign in at `/admin` with the admin account from §1.3.

---

## 7. Layout

```
src/
  app/
    layout.tsx              root layout — lang="ar" dir="rtl", Tajawal via next/font
    page.tsx                storefront (Server Component, dynamic)
    globals.css             Tailwind v4 @theme tokens + original keyframes
    error.tsx  not-found.tsx
    admin/
      page.tsx              dashboard — session + is_admin() checked server-side
      login/page.tsx        Supabase password sign-in
      actions.ts            'use server' actions (all re-check isAdmin())
    ../
  proxy.ts                  Supabase cookie refresh + admin redirect (Next 16 name for middleware)
  components/               Header, Hero, FeatureStrip, ShopSection, ProductCard,
                            ProductQuickView, StorySection, Testimonials, Footer,
                            CartDrawer, MobileCartBar, Toast, icons, Backdrop
  components/admin/         AdminLoginForm, AdminDashboard
  lib/
    products/queries.ts     the only read path for the catalogue
    products/map.ts         PostgREST row → Product/SiteSettings mapping
    cart.ts                 id-based cart maths + localStorage codec
    whatsapp.ts             order message builder
    categories.ts           the 8 filter chips (verbatim from the prototype)
    stores.ts               useSyncExternalStore wrappers for cart + favourites
    auth.ts                 getViewer() / isAdmin()
    supabase/{client,server,config}.ts
  types/product.ts
  data/preview-products.json  generated, preview-only
scripts/build-import.mjs      seed generator + match report
supabase/migrations/001_initial_schema.sql
supabase/seed.sql             generated
public/products/              38 product images
public/brand/logo.jpg
```

---

## 8. Design parity notes

Preserved from the prototype:

- Colours `#FFF6F1` / `#4A2E2A` / `#E86A92` / `#C9A86A` / `#7FB07F`, Tajawal 400–900.
- Sticky header, hero collage, feature strip, filter bar, gold-bordered “package” cards,
  story collage, testimonials, dark footer.
- The 8 category chips including the derived `skincare-body` filter (label contains
  “الجسم”, plus the `nivea-deo-72h` exception) and `bestseller` (= has a badge).
- Cart drawer from the left, mobile bottom bar, `slideUp` toast, 2.4 s toasts.
- WhatsApp number `962777260622`, email `youme.work20@gmail.com`, WhatsApp order wording.

Added for production:

- Product quick-view modal on card image/title click.
- Free-shipping threshold messaging.
- `prefers-reduced-motion` support (the prototype had none).
- Keyboard-dismissible overlays, `aria-*` labels, visible focus rings.

### Known gaps

- **Social URLs are empty.** The prototype’s Facebook/Instagram links were not present literally
  in the compiled HTML, so the seed leaves `facebook_url` and `instagram_url` blank and the icons
  hide until you fill them in under `/admin` → الإعدادات.
- Hero copy and product `oldPrice` values come from the prototype; prices come from
  `you-and-me-prices.json`, which is **lower** for several items (e.g. the Laverne package
  12 JOD vs 38 JOD in the HTML). That is intentional — the JSON is the authoritative price set —
  but it means the “توفير X JOD” badges are large. Review them and adjust `old_price` in the
  admin panel if they look wrong.
- `npm audit` reports 5 high-severity advisories in `braces` → `micromatch` → `fast-glob`,
  pulled in by **`eslint-config-next` (dev dependency only)**. The suggested fix downgrades Next to
  14.x; do not run `npm audit fix --force`. Nothing ships to the browser from this chain.
