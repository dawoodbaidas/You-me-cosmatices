'use client'

import { createContext, useContext, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
const SearchOverlay = dynamic(() => import('./SearchOverlay'))
import BestSellers from '@/components/BestSellers'
import StorefrontMotion from '@/components/StorefrontMotion'
import './storefront.css'
import './curved-showcase.css'
import './desktop-v5.css'
import './mobile-hero.css'
import './cart-phase1.css'
import './shopping-navigation.css'
import './orbit.css'
import './arabic-design.css'
import './boutique-redesign.css'
import CartDrawer from '@/components/CartDrawer'
import CartPage from '@/components/CartPage'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import MobileCartBar from '@/components/MobileCartBar'
const ProductQuickView = dynamic(() => import('./ProductQuickView'))
import CategoryCircles from './CategoryCircles'
import CategoryLink, { CategoryUrls } from './CategoryLink'
import './category-shopping.css'
import './store-routes.css'
import ShopSection from '@/components/ShopSection'
import Toast, { type ToastMessage } from '@/components/Toast'
import { cartLineLimit, cartCount as countItems, cartTotal as sumTotal, resolveCart, cartShipping } from '@/lib/cart'
import { formatJod } from '@/lib/format'
import { productPricing, roundMoney } from '@/lib/pricing'
import { selectedSceneProducts } from '@/lib/scene-products'
import { storeCollections, findCollection, collectionHref, categoryPath } from '@/lib/store-categories'
import type { StoreCategory, StoreCatalogue } from '@/types/store'
import { useStoreRefresh } from './useStoreRefresh'
import StoreScroll from './StoreScroll'
import { useCartStore, useFavoritesStore } from '@/lib/stores'
import { prepareCheckout } from '@/app/checkout'
import type { Product, SiteSettings } from '@/types/product'

interface StorefrontProps {
  settings: SiteSettings
  children: ReactNode
  categories: StoreCategory[]
  storeUnavailable?: boolean
  storeRevision?: string | null
}

export default function Storefront({ settings, children, categories, storeRevision = null, storeUnavailable = false }: StorefrontProps) {
  const [pageData, setPageData] = useState<StoreCatalogue | undefined>()
  const [cartProducts, setCartProducts] = useState<Product[]>([])
  const [searchProducts, setSearchProducts] = useState<Product[] | null>(null)
  const products = useMemo(() => [...new Map([...(searchProducts ?? []), ...cartProducts, ...(pageData?.products ?? [])].map(product => [product.id, product])).values()], [cartProducts, pageData, searchProducts])
  const router = useRouter()
  const pathname = usePathname()
  const categoryId = categories.find(category => categoryPath(category, categories) === pathname)?.slug ?? (pathname.startsWith("/category/") ? decodeURIComponent(pathname.split("/")[2]) : undefined)
  const searchParams = useSearchParams()
  useStoreRefresh(storeRevision)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchQuery = searchParams.get('q') ?? ''
  const groups = useMemo(() => storeCollections(categories, []), [categories])
  const cataloguePage = pathname !== '/'
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [cartSide, setCartSide] = useState<'left' | 'right'>('right')
  const openCart = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (cartOpen) return
    const button = event?.currentTarget ?? document.querySelector<HTMLButtonElement>('.header-bag')
    const rect = button?.getBoundingClientRect()
    setCartSide(rect && rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right')
    button?.focus({ preventScroll: true })
    setQuickViewId(null)
    setCartOpen(true)
  }
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cart, cartActions] = useCartStore()
  const [favorites, toggleFavoriteStore] = useFavoritesStore()
  const cartIds = [...new Set(cart.map(item => item.productId))].sort().join(',')
  useEffect(() => {
    if (!cartIds) return
    const controller = new AbortController()
    fetch(`/api/store/products?ids=${encodeURIComponent(cartIds)}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Cart unavailable'); return response.json() })
      .then(setCartProducts).catch(error => {
        if (error.name !== 'AbortError') setToast({ id: Date.now(), text: 'تعذّر تحديث بيانات السلة. افتح السلة لإعادة المحاولة.', tone: 'error' })
      })
    return () => controller.abort()
  }, [cartIds, storeRevision])


  const submitSearch = useCallback((value: string) => {
    const query = value.trim()
    if (!query) return
    setSearchOpen(false)
    router.push(`/category/all?q=${encodeURIComponent(query)}`)
  }, [router])


  /* ------------------------------------------------------------------ toast */

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  /* ------------------------------------------------------------------- cart */

  // Lines are always derived from the freshly loaded catalogue, so prices come
  // from Supabase and products deactivated since the last visit drop out.
  const lines = useMemo(() => resolveCart(cart, products), [cart, products])
  const totalCount = useMemo(() => countItems(lines), [lines])
  const total = useMemo(() => sumTotal(lines), [lines])

  // Confirmation for adding lives in the card and the cart badge itself; the
  // toast is reserved for rejections so no competing popup ever appears.
  const addProduct = useCallback(
    (productId: string, variantId: string | null, quantity = 1) => {
      const product = products.find((candidate) => candidate.id === productId)
      const current = cartActions.snapshot()
      const quantityInLine = current.find(item => item.productId === productId && item.variantId === variantId)?.quantity ?? 0
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantityInLine + quantity > cartLineLimit(product, current, variantId)) {
        notify('الكمية المطلوبة غير متاحة حالياً.', 'error')
        return false
      }
      cartActions.add(productId, variantId, quantity, productPricing(product, product.variants.find(variant => variant.id === variantId)).price)
      return true
    },
    [cartActions, notify, products],
  )

  const addSceneProduct = useCallback(
    (productId: string, variantId: string | null) => {
      addProduct(productId, variantId, 1)
    },
    [addProduct],
  )

  const increment = useCallback(
    (productId: string, variantId: string | null) => {
      const current = cartActions.snapshot()
      const line = resolveCart(current, products).find(
        (candidate) =>
          candidate.product.id === productId && (candidate.variant?.id ?? null) === variantId,
      )
      if (!line) return
      if (line.quantity >= cartLineLimit(line.product, current, variantId)) return
      cartActions.setQuantity(productId, variantId, line.quantity + 1)
    },
    [cartActions, products],
  )

  const decrement = useCallback(
    (productId: string, variantId: string | null) => {
      const line = cartActions.snapshot().find(
        (candidate) =>
          candidate.productId === productId && candidate.variantId === variantId,
      )
      if (!line) return
      if (line.quantity <= 1) {
        cartActions.remove(productId, variantId)
        return
      }
      cartActions.setQuantity(productId, variantId, line.quantity - 1)
    },
    [cartActions],
  )

  const remove = useCallback(
    (productId: string, variantId: string | null) => {
      cartActions.remove(productId, variantId)
      notify('تم حذف المنتج من السلة')
    },
    [cartActions, notify],
  )

  /* -------------------------------------------------------------- favourites */

  const toggleFavorite = useCallback(
    (productId: string) => {
      notify(toggleFavoriteStore(productId) ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة')
    },
    [notify, toggleFavoriteStore],
  )

  /* ----------------------------------------------------------------- scroll */

  const scrollTo = useCallback(
    (id: string) => {
      const section = document.getElementById(id)
      if (!section) { router.push(id === 'home' ? '/' : `/#${id}`); return }
      section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      window.history.replaceState(null, '', `#${id}`)
    },
    [router],
  )

  /* --------------------------------------------------------------- checkout */

  const checkoutPending = useRef(false)
  const checkoutToken = useRef<{ id: string; cart: string } | null>(null)
  const checkout = useCallback(async () => {
    if (checkoutPending.current) return
    checkoutPending.current = true
    const target = window.open('about:blank', '_blank')
    if (target) target.opener = null
    try {
      const items = cartActions.snapshot()
      const signature = JSON.stringify(items)
      if (checkoutToken.current?.cart !== signature) checkoutToken.current = { id: crypto.randomUUID(), cart: signature }
      const checkoutId = checkoutToken.current.id
      let result = await prepareCheckout(items, { id: checkoutId, unitPrices: items.map(item => item.unitPrice ?? lines.find(line => line.product.id === item.productId && (line.variant?.id ?? null) === item.variantId)?.unitPrice ?? 0), total: roundMoney(total + (cartShipping(total, settings) ?? 0)) })
      // No order is written for a changed quote until the customer accepts it.
      for (let attempts = 0; result.confirmation && attempts < 3; attempts++) {
        const quote = result.confirmation
        router.refresh()
        const message = quote.lines.map(line => `${line.nameAr}${line.variantLabel ? ' (' + line.variantLabel + ')' : ''}: ${line.quantity} × ${formatJod(line.unitPrice, quote.currency)}`).join('\n')
        if (!window.confirm(`تغيّرت الأسعار أو رسوم التوصيل. راجع الطلب المحدّث:\n${message}\nالإجمالي: ${formatJod(quote.total, quote.currency)}${quote.shipping === null ? ' (دون التوصيل)' : ''}\nهل تؤكد هذا الإجمالي؟`)) { target?.close(); return }
        result = await prepareCheckout(items, { id: checkoutId, unitPrices: quote.lines.map(line => line.unitPrice), total: quote.total })
      }
      if (!result.url) { target?.close(); notify(result.error ?? 'تغيّرت الأسعار مجدداً. راجع السلة ثم أعد المحاولة.', 'error'); router.refresh(); return }
      checkoutToken.current = null
      if (target) target.location.replace(result.url)
      else window.location.assign(result.url)
    } catch {
      target?.close()
      notify('تعذّر الاتصال. حاول مجددًا.', 'error')
    } finally { checkoutPending.current = false }
  }, [cartActions, notify, router, lines, total, settings])

  const browse = useCallback(() => {
    setCartOpen(false)
    router.push('/categories')
  }, [router])

  /* ----------------------------------------------------------------- render */

  const modalSlug = searchParams.get('product')
  const modalProduct = modalSlug ? products.find(product => product.slug === modalSlug) : undefined
  const quickViewProduct = modalProduct ?? products.find((product) => product.id === quickViewId) ?? null
  const closeProduct = () => { if (modalSlug) window.history.back(); else setQuickViewId(null) }
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])


  const openProduct = (id: string) => {
    const product = products.find(p => p.id === id)
    if (product) { const next = new URLSearchParams(window.location.search); next.set('product', product.slug);
      // Remember the listing position so the back-navigation can restore the grid.
      try { sessionStorage.setItem('store-return', JSON.stringify({ url: window.location.pathname + window.location.search, y: window.scrollY, count: null })) } catch {}
      window.history.pushState(null, '', window.location.pathname + '?' + next) }
  }
  const renderPage = ({ mode, slug, data }: StorePageProps) => {
    const products = data?.products ?? []
    const groups = storeCollections(data?.categories ?? categories, products)
    const heroItems = mode === 'home' ? selectedSceneProducts(products, data?.homeSections?.hero, 'hero') : []
    const bestsellerItems = mode === 'home' ? selectedSceneProducts(products, data?.homeSections?.bestsellers, 'bestsellers') : []
    const lines = resolveCart(cart, [...new Map([...cartProducts, ...products].map(product => [product.id, product])).values()])
    const pageUnavailable = data?.unavailable ?? storeUnavailable
    const collection = findCollection(groups, slug ?? null)
    const isMainCategory = categories.some(category => category.slug === slug && category.parent_slug === null)
    const product = mode === 'product' ? products.find(p => p.slug === slug) : undefined
    const from = searchParams.get('from')
    const candidate = from ? findCollection(groups, from) : undefined
    const productCategory = product ? (candidate?.productIds.includes(product.id) ? candidate : groups.find(g => g.productIds.includes(product.id))) : undefined
    const title = mode === 'product' ? product?.nameAr : mode === 'cart' ? 'سلة التسوق' : mode === 'favorites' ? 'المفضلة' : collection?.label ?? (mode === 'categories' ? 'الأقسام' : 'جميع المنتجات')
    const visible = mode === 'favorites' ? products.filter(p => favorites.includes(p.id)) : collection ? products.filter(p => (collection.directProductIds ?? collection.productIds).includes(p.id)) : products
    const ancestry = []
    let ancestor = categories.find(category => category.slug === slug)
    while (ancestor) { ancestry.unshift(ancestor); ancestor = categories.find(category => category.slug === ancestor!.parent_slug) }
    return (      <>
{mode === "product" && <nav className="store-breadcrumbs" aria-label="مسار التصفح" dir="rtl"><Link href="/">الرئيسية</Link><span>/</span>{productCategory && <><Link href={productCategory.href ?? collectionHref(productCategory.id)}>{productCategory.label}</Link><span>/</span></>}<span aria-current="page">{title}</span></nav>}
{mode === "category" && <nav className="store-breadcrumbs" aria-label="مسار التصفح" dir="rtl"><Link href="/">الرئيسية</Link>{ancestry.map(category => <span key={category.slug}> / <CategoryLink slug={category.slug} aria-current={category.slug === slug ? 'page' : undefined}>{category.name_ar}</CategoryLink></span>)}</nav>}
{mode === "category" && isMainCategory && <><CategoryCircles page groups={collection?.children ?? []} title={collection?.label} />{!collection?.children.length && <p className="category-empty">لا توجد أقسام فرعية حاليًا</p>}</>}
{mode === "product" && product && <ProductQuickView inline product={product} cartItems={cart} selectedVariantId={variantChoice[product.id] ?? null} onSelectVariant={(id, variant) => setVariantChoice(v => ({...v, [id]:variant}))} currency={settings.currency} isFavorite={favoriteSet.has(product.id)} settings={settings} onClose={() => router.push("/categories")} onToggleFavorite={toggleFavorite} onAddToCart={(p, variant, quantity) => addProduct(p.id, variant, quantity)} />}
{mode === "cart" && <CartPage lines={lines} settings={settings} onRemove={remove} onIncrement={increment} onDecrement={decrement} onCheckout={checkout} onBrowse={() => router.push("/categories")} />}

        {mode === "home" && <>{heroItems.length > 0 && <Hero products={heroItems} currency={settings.currency} onAddToCart={addSceneProduct} onScrollTo={scrollTo} onOpenDetails={setQuickViewId} />}
        <BestSellers
          products={bestsellerItems}
          currency={settings.currency}
          onAddToCart={addSceneProduct}
          onOpenDetails={setQuickViewId}
        /></>}

        {(mode === "favorites" || (mode === "category" && !isMainCategory)) ? <ShopSection
          cart={cart}
          key={pathname}
          products={visible}
          groups={groups}
          initialCategory={slug}
          currency={settings.currency}
          pageTitle={title}
          query={searchQuery}
          unavailable={pageUnavailable}
          favorites={favorites}
          selectedVariants={variantChoice}
          onSelectVariant={(productId, variantId) =>
            setVariantChoice((current) => ({ ...current, [productId]: variantId }))
          }
          onToggleFavorite={toggleFavorite}
          onAddToCart={(productId, variantId) => addProduct(productId, variantId)}
          onOpenDetails={openProduct}
        /> : (mode === "home" || mode === "categories") ? <CategoryCircles groups={groups} page={mode === "categories"} title={mode === "categories" ? title : undefined} /> : null}
      </>

    )
  }

  return (
    <CategoryUrls.Provider value={Object.fromEntries(categories.map(category => [category.slug, categoryPath(category, categories)]))}><StoreDataContext.Provider value={setPageData}><StorePageContext.Provider value={renderPage}><StorefrontMotion>
      <StoreScroll />
      <a href="#store-content" className="skip-link">انتقلي إلى المنتجات</a>

      <Header
        onSearch={async () => {
          try {
            const response = await fetch('/api/store/products')
            if (!response.ok) throw new Error('Search unavailable')
            setSearchProducts(await response.json()); setSearchOpen(true)
          } catch { notify('تعذّر تحميل البحث. حاول مجددًا.', 'error') }
        }}
        settings={settings}
        cartCount={totalCount}
        favoriteCount={favorites.length}
        onScrollTo={scrollTo}
        groups={groups}
        selected={categoryId ?? null}
        cataloguePage={cataloguePage}
      />

      <main id="store-content">{children}</main>

      <Footer
        settings={settings}
        groups={groups}
        onScrollTo={scrollTo}
        onSubscribe={() => notify('تم تسجيل بريدك. سنتواصل قريبًا.')}
      />

      {searchOpen && <SearchOverlay products={products} currency={settings.currency} initialQuery={searchQuery} onClose={() => setSearchOpen(false)} onSubmit={submitSearch} onSelect={id => { setSearchOpen(false); openProduct(id) }} />}
      <CartDrawer
        side={cartSide}
        open={cartOpen}
        lines={lines}
        settings={settings}
        onClose={() => setCartOpen(false)}
        onRemove={remove}
        onIncrement={increment}
        onDecrement={decrement}
        onCheckout={checkout}
        onBrowse={browse}
      />

      {quickViewProduct && <ProductQuickView
        key={quickViewProduct.id}
        product={quickViewProduct}
        cartItems={cart}
        inventory
        selectedVariantId={quickViewProduct ? variantChoice[quickViewProduct.id] ?? null : null}
        onSelectVariant={(productId, variantId) => setVariantChoice(current => ({ ...current, [productId]: variantId }))}
        currency={settings.currency}
        isFavorite={quickViewProduct ? favoriteSet.has(quickViewProduct.id) : false}
        settings={settings}
        onClose={closeProduct}
        onToggleFavorite={toggleFavorite}
        onAddToCart={(product, variantId, quantity) => addProduct(product.id, variantId, quantity)}
      />}

      <MobileCartBar
        count={totalCount}
        total={total + (totalCount > 0 && !(settings.storeFreeShippingThreshold > 0 && total >= settings.storeFreeShippingThreshold) ? settings.storeShippingFee ?? 0 : 0)}
        settings={settings}
        onOpenCart={openCart}
        open={cartOpen || searchOpen || quickViewId !== null || !!modalProduct}
      />

      <Toast toast={cartOpen || searchOpen || quickViewId !== null ? null : toast} />
    </StorefrontMotion></StorePageContext.Provider></StoreDataContext.Provider></CategoryUrls.Provider>
  )
}

export interface StorePageProps { mode: 'home' | 'categories' | 'category' | 'product' | 'cart' | 'favorites'; slug?: string; data?: StoreCatalogue }
const StoreDataContext = createContext<((data: StoreCatalogue | undefined) => void) | null>(null)
const StorePageContext = createContext<((props: StorePageProps) => ReactNode) | null>(null)
export function StorePage(props: StorePageProps) {
  const render = useContext(StorePageContext)
  const register = useContext(StoreDataContext)
  useEffect(() => { register?.(props.data) }, [register, props.data])
  if (!render) throw new Error('StorePage requires the store layout')
  return render(props)
}
