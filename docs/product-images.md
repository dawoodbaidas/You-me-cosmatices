# Product image upload and remove.bg

Flow: choose image → click **إزالة الخلفية** → review → **اعتماد النتيجة** → **حفظ المنتج**. **استخدام الصورة الأصلية** explicitly chooses the original instead. Results are never automatically approved.

## Setup

Set the server-only variable `REMOVE_BG_API_KEY` in `.env.local` to the actual API key issued by your remove.bg account, then restart Next.js. Do not use the variable name or example text as its value. No key is printed or sent to the browser. Never use a `NEXT_PUBLIC_` prefix for this key. Configure it separately in the server's deployment environment; the UI gives a configuration error if the key is missing.

### Netlify secret-scanning failure

Netlify scans for configured secret **values**, including in repository files. If it reports this variable's identifier in documentation, `process.env` access, and configuration error messages, check whether a secret environment variable was accidentally assigned the identifier itself. Those references are names, not hardcoded credentials; renaming or hiding them does not fix the configuration.

In Netlify **Project configuration → Environment variables**, correct the affected setting in each applicable deploy context: use the provider-issued key as its value and keep it secret and available to server Functions. If background removal is unused, remove the incorrect setting; the endpoint will return its existing configuration error. Never paste credentials into source, documentation, browser variables, or logs. If a real credential was committed, revoke/rotate it and remove it from source before rebuilding.

Keep secret scanning enabled without exclusions or safelists. After correcting the environment, rerun the Netlify build to verify the scan; a local `npm run build` does not run Netlify's scanner. See [Netlify secret scanning](https://docs.netlify.com/manage/security/secret-scanning/).

The authenticated, same-origin `/api/admin/products/remove-background` route calls only `https://api.remove.bg/v1.0/removebg`, using multipart `image_file`, `size=preview`, `format=png`, `channels=rgba`, and a server-only `X-Api-Key` header. [Official API documentation](https://www.remove.bg/api). Preview size is fixed: no automatic full-resolution/paid upgrade, provider switch, or automatic retry. Account limits still apply; missing/invalid keys, exhausted quota/rate limits, timeout and provider failure have separate Arabic messages. Invalid keys are reported as provider configuration errors rather than logging the admin out.

## Image and save behavior

The API response is decoded and checked for actual alpha transparency and visible foreground before it is returned as a private, uncached WebP preview. Opaque, entirely transparent, malformed and oversized responses are rejected. This validation cannot judge artistic quality or guarantee removal of promotional text or overlapping flowers/decorations. Review the product, printed label, logo and edges before confirming.

The browser keeps previews as temporary blob URLs. Processing sends the image to remove.bg but never writes Supabase Storage. Confirmation selects the result locally; only saving submits the approved image to the existing `/api/admin/products` upload/CRUD route. That route requires `image_confirmed=true`, revalidates processed alpha, converts the approved image to lossless WebP without resizing/upscaling, and uploads **one** image to `product-images`. Choosing the original converts that approved original to WebP instead. Maximum input/output upload size is 4 MB; high-resolution originals that exceed this after lossless conversion need a smaller source.

Existing product version checks, upload failure handling, orphan cleanup and storefront catalogue invalidation are preserved. Existing saved original-image restoration remains supported. New processing never uploads a second, unapproved original or creates a Storage preview record. Historical preview tables/migrations and RLS policies are unchanged. Checkerboards are CSS backgrounds confined to previews and are never encoded into files.

The old IMG.LY/ONNX packages, local model worker, masking/crop/brush tools, model notices and model-specific tests/assets were removed. No local model or fallback remains. Obsolete `PHOTOROOM_API_KEY` and `NEXT_PUBLIC_LOCAL_BG_AGPL_REVIEWED` settings are no longer used.

## Verification

`node --test tests/product-image-editor.test.mjs tests/admin-merchandising.test.mjs` checks the real server handlers with fake provider/Storage responses: exact endpoint and preview parameters, server-only key, binary validation, resolution/alpha fidelity, error categories, no retries, authorization, missing keys, concurrency and confirmed single-image uploads. `node tests/product-image-editor-browser.mjs` exercises the real responsive editor in an isolated app, mocking only the network responses so it does not consume remove.bg quota or write live Storage. Real provider/Storage credentials are never copied into this browser fixture.
