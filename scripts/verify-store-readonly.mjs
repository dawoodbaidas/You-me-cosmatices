// GET/HEAD only. Never imports admin handlers or writes to a database/env file.
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.log(JSON.stringify({ configured: false }))
  process.exitCode = 1
} else {
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const paths = {
    products: '/rest/v1/products?select=id,slug,name_ar,image_url,price,category,category_label,sort_order&is_active=eq.true&order=sort_order.asc',
    categories: '/rest/v1/store_categories?select=slug,name_ar,parent_slug,sort_order&is_active=eq.true&order=sort_order.asc',
    revision: '/rest/v1/store_revision?select=version&id=eq.1',
    catalogue: '/rest/v1/rpc/get_store_catalogue',
  }
  const results = await Promise.all(Object.entries(paths).map(async ([name, path]) => {
    try {
      const response = await fetch(new URL(path, url), { method: 'GET', headers, signal: AbortSignal.timeout(20000) })
      const body = await response.json()
      const data = response.ok ? body : null
      return [name, { status: response.status, count: Array.isArray(data) ? data.length : data?.products?.length ?? null, data }]
    } catch (error) {
      return [name, { status: 'connection-error', errorCode: error.cause?.code ?? error.name }]
    }
  }))
  const byName = Object.fromEntries(results)
  const products = byName.catalogue.data?.products ?? byName.products.data ?? []
  const images = products.filter(product => product.image_url)
  const imageChecks = await Promise.all(images.slice(0, 2).map(async product => {
    try {
      const response = await fetch(new URL(product.image_url, url), { method: 'HEAD', signal: AbortSignal.timeout(20000) })
      return { status: response.status, imageType: response.headers.get('content-type')?.startsWith('image/') ?? false }
    } catch (error) { return { status: 'connection-error', errorCode: error.cause?.code ?? error.name } }
  }))
  console.log(JSON.stringify({
    configured: true,
    isQa: /localhost|127\.0\.0\.1|database\.test/.test(new URL(url).hostname),
    reads: Object.fromEntries(results.map(([name, { status, count, errorCode }]) => [name, { status, count, ...(errorCode ? { errorCode } : {}) }])),
    productsWithImages: images.length, imageChecks,
  }))
  if (results.some(([, result]) => result.status !== 200) || imageChecks.some(result => result.status !== 200 || !result.imageType)) process.exitCode = 1
}
