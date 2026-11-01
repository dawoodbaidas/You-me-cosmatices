import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInThisContext } from 'node:vm'
import ts from 'typescript'

// Compile the unchanged helpers with their application alias, without changing runtime configuration.
function helper(name) {
  const filename = new URL('../src/lib/' + name + '.ts', import.meta.url)
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const loaded = { exports: {} }
  runInThisContext('(function(require,module,exports){' + source + '\n})')(id => helper(id.replace('@/lib/', '')), loaded, loaded.exports)
  return loaded.exports
}
const cart = helper('cart')
const { buildOrderMessage, whatsappLink } = helper('whatsapp')
const { filterProducts, CATEGORY_FILTERS } = helper('categories')
const snapshot = JSON.parse(readFileSync(new URL('../src/data/preview-products.json', import.meta.url), 'utf8'))
const products = snapshot.map(product => ({ ...product, id: product.slug }))

test('all catalog filters preserve real objects, IDs, prices and variants', () => {
  for (const option of CATEGORY_FILTERS) {
    const result = filterProducts(products, option.key)
    assert.equal(new Set(result.map(product => product.id)).size, result.length)
    for (const product of result) assert.equal(product, products.find(candidate => candidate.id === product.id))
  }
  assert.equal(filterProducts(products, 'all'), products)
  assert.deepEqual(filterProducts(products, 'packages'), products.filter(product => product.category === 'packages'))
})

test('variant cart retains separate lines, latest prices, quantity arithmetic and persistence', () => {
  const product = products.find(product => product.variants.length > 1)
  const [first, second] = product.variants
  let items = cart.addToCart([], product.id, first.id)
  items = cart.addToCart(items, product.id, second.id)
  items = cart.addToCart(items, product.id, first.id)
  assert.equal(items.length, 2)
  assert.equal(items[0].quantity, 2)
  const lines = cart.resolveCart(items, products)
  assert.equal(lines[0].unitPrice, first.price)
  assert.equal(cart.cartTotal(lines), first.price * 2 + second.price)
  assert.equal(cart.cartCount(lines), 3)
  items = cart.setCartQuantity(items, product.id, first.id, 4)
  assert.equal(cart.resolveCart(items, products)[0].lineTotal, first.price * 4)
  let serialized
  cart.writeStoredCart({ setItem: (_, value) => { serialized = value } }, items)
  assert.deepEqual(cart.readStoredCart({ getItem: () => serialized }), items)
  assert.deepEqual(cart.readStoredCart({ getItem: () => 'broken' }), [])
  assert.equal(cart.removeFromCart(items, product.id, first.id).length, 1)
  assert.deepEqual(cart.resolveCart([{ productId: product.id, variantId: 'stale', quantity: 1 }], products), [])
  const changed = products.map(item => item.id === product.id ? { ...item, variants: item.variants.map(variant => variant.id === first.id ? { ...variant, price: 12.345 } : variant) } : item)
  assert.equal(cart.resolveCart(items, changed)[0].unitPrice, 12.345)
})

test('WhatsApp order uses selected labels, quantities, exact totals and established delivery fields', () => {
  const product = products.find(product => product.variants.length > 1)
  const variant = product.variants[1]
  const lines = cart.resolveCart([{ productId: product.id, variantId: variant.id, quantity: 2 }], products)
  const message = buildOrderMessage(lines, { currency: 'JOD', whatsappMessage: 'مرحبا' })
  const expected = [
    'مرحبا', 'أرغب بطلب المنتجات التالية:', '',
    `1. ${product.nameAr} (${variant.label}) - الكمية: 2 × ${variant.price.toFixed(2)} د.أ = ${(variant.price * 2).toFixed(2)} د.أ`,
    '', `المجموع الكلي: ${(variant.price * 2).toFixed(2)} د.أ`, '', 'بيانات التوصيل:', 'الاسم: ', 'العنوان: ', 'رقم الهاتف: ', '', 'شكراً لكم 💕',
  ].join('\n')
  assert.equal(message, expected)
  const link = new URL(whatsappLink('+962 7 1234 5678', message))
  assert.equal(link.pathname, '/962712345678')
  assert.equal(link.searchParams.get('text'), expected)
})

test('storefront stylesheet encoding and scope protect the shared admin theme', () => {
  const css = readFileSync(new URL('../src/components/storefront.css', import.meta.url), 'utf8')
  assert.notEqual(css.charCodeAt(0), 0xfeff)
  assert.ok(css.includes('.boutique {'))
  assert.ok(css.includes('prefers-reduced-motion: reduce'))
  assert.ok(!/^(body|html|:root)\s*\{/m.test(css))
})

test('Arabic search matches variants, mixed words and spelling without diacritics', () => {
  const { matchesProduct } = helper('search')
  const product = { ...products[0], nameAr: 'إشراقة للبشرة', nameEn: 'Glow Set', variants: [{ label: 'وَرْد' }] }
  assert.equal(matchesProduct(product, 'اشراقه ورد'), true)
  assert.equal(matchesProduct(product, ' GLOW   بشره '), true)
  assert.equal(matchesProduct(product, 'غيرموجود'), false)
  assert.equal(matchesProduct({ ...product, isActive: false }, 'glow'), false)
})

