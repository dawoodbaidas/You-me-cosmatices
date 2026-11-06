import { getStoreCatalogue, publicDatabaseConfig } from '@/lib/store-catalogue'
import { mapProduct } from '@/lib/products/map'

export async function GET(request: Request) {
  try {
    const ids = new URL(request.url).searchParams.get('ids')
    if (ids === null) {
      const store = await getStoreCatalogue()
      if (store.unavailable) throw new Error('Store unavailable')
      return Response.json(store.products)
    }
    const keys = [...new Set(ids.split(','))]
    if (keys.length > 100 || keys.some(id => !/^[0-9a-f-]{36}$/.test(id))) return Response.json({ error: 'Invalid products' }, { status: 400 })
    const config = publicDatabaseConfig()
    if (!config) throw new Error('Store unavailable')
    const query = new URLSearchParams({ select: '*,product_variants(*),product_categories(category_slug)', is_active: 'eq.true', id: `in.(${keys.join(',')})` })
    const response = await fetch(`${config.url}/rest/v1/products?${query}`, { headers: config.headers, cache: 'no-store' })
    if (!response.ok) throw new Error('Store unavailable')
    const rows: Parameters<typeof mapProduct>[0][] = await response.json()
    return Response.json(rows.map(row => mapProduct(row)))
  } catch { return Response.json({ error: 'تعذّر تحميل المنتجات. حاول مجددًا.' }, { status: 503 }) }
}
