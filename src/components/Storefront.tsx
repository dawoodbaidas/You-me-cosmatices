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
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import MobileCartBar from '@/components/MobileCartBar'
const ProductQuickView = dynamic(() => import('./ProductQuickView'))
import CategoryCircles from './CategoryCircles'
import CategoryLink from './CategoryLink'
import './category-shopping.css'
import './store-routes.css'
import ShopSection from '@/components/ShopSection'
import Toast, { type ToastMessage } from '@/components/Toast'
import { cartLineLimit, cartCount as countItems, cartTotal as sumTotal, resolveCart } from '@/lib/cart'
import { arabicStoreProduct } from '@/lib/storefront-arabic'
import { storeCollections, findCollection, collectionHref } from '@/lib/store-categories'
import type { StoreCategory } from '@/types/store'
import { useStoreRefresh } from './useStoreRefresh'
import StoreScroll from './StoreScroll'
import { useCartStore, useFavoritesStore } from '@/lib/stores'
import { prepareCheckout } from '@/app/checkout'
import type { Product, SiteSettings } from '@/types/product'

interface StorefrontProps {
  products: Product[]
  settings: SiteSettings
  children: ReactNode
  categories: StoreCategory[]
  storeUnavailable?: boolean
  storeRevision?: string | null
  sceneProducts?: Product[]
  sceneCurrency?: string
}

export default function Storefront({ products, settings, children, categories, storeRevision = null, storeUnavailable = false, sceneProducts: editorial = [], sceneCurrency = '' }: StorefrontProps) {
  const router = useRouter()
  const pathname = usePathname()
  const categoryId = pathname.startsWith("/category/") ? decodeURIComponent(pathname.split("/")[2]) : undefined
  const searchParams = useSearchParams()
  useStoreRefresh(storeRevision)
  const sceneProducts = useMemo(() => editorial.map(arabicStoreProduct), [editorial])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchQuery = searchParams.get('q') ?? ''
  const groups = useMemo(() => storeCollections(categories, products), [categories, products])
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
  const [sceneQuickView, setSceneQuickView] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cart, cartActions] = useCartStore()
  const [favorites, toggleFavoriteStore] = useFavoritesStore()


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

  const addProduct = useCallback(
    (productId: string, variantId: string | null, quantity = 1, quiet = false) => {
      const product = products.find((candidate) => candidate.id === productId)
      const current = cartActions.snapshot()
      const quantityInLine = current.find(item => item.productId === productId && item.variantId === variantId)?.quantity ?? 0
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantityInLine + quantity > cartLineLimit(product, current, variantId)) {
        notify('الكمية المطلوبة غير متاحة حالياً.', 'error')
        return false
      }
      cartActions.add(productId, variantId, quantity)
      if (product && !quiet) notify(`أضيف إلى السلة: ${product.nameAr}`)
      return true
    },
    [cartActions, notify, products],
  )

  const addSceneProduct = useCallback((productId: string, variantId: string | null) => {
    cartActions.add(productId, variantId, 1)
    const product = sceneProducts.find(item => item.id === productId)
    if (product) notify(`أضيف إلى السلة: ${product.nameAr}`)
  }, [cartActions, sceneProducts, notify])

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
  const checkout = useCallback(async () => {
    if (checkoutPending.current) return
    checkoutPending.current = true
    const target = window.open('about:blank', '_blank')
    if (target) target.opener = null
    try {
      const result = await prepareCheckout(cartActions.snapshot())
      if (!result.url) { target?.close(); notify(result.error!, 'error'); router.refresh(); return }
      if (target) target.location.replace(result.url)
      else window.location.assign(result.url)
    } catch {
      target?.close()
      notify('تعذّر الاتصال. حاول مجددًا.', 'error')
    } finally { checkoutPending.current = false }
  }, [cartActions, notify, router])

  const browse = useCallback(() => {
    setCartOpen(false)
    router.push('/categories')
  }, [router])

  /* ----------------------------------------------------------------- render */

  const modalSlug = searchParams.get('product')
  const modalProduct = modalSlug ? products.find(product => product.slug === modalSlug) : undefined
  const quickViewProduct = modalProduct ?? (sceneQuickView ? sceneProducts : products).find((product) => product.id === quickViewId) ?? null
  const closeProduct = () => { if (modalSlug) window.history.back(); else setQuickViewId(null) }
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])


  const openProduct = (id: string) => {
    const product = products.find(p => p.id === id)
    if (product) { const next = new URLSearchParams(window.location.search); next.set('product', product.slug); window.history.pushState(null, '', window.location.pathname + '?' + next) }
  }
  const renderPage = ({ mode, slug }: StorePageProps) => {
    const collection = findCollection(groups, slug ?? null)
    const product = mode === 'product' ? products.find(p => p.slug === slug) : undefined
    const from = searchParams.get('from')
    const candidate = from ? findCollection(groups, from) : undefined
    const productCategory = product ? (candidate?.productIds.includes(product.id) ? candidate : groups.find(g => g.productIds.includes(product.id))) : undefined
    const title = mode === 'product' ? product?.nameAr : mode === 'cart' ? 'سلة التسوق' : mode === 'favorites' ? 'المفضلة' : collection?.label ?? (mode === 'categories' ? 'الأقسام' : 'جميع المنتجات')
    const visible = mode === 'favorites' ? products.filter(p => favorites.includes(p.id)) : collection ? products.filter(p => collection.productIds.includes(p.id)) : products
    return (      <>
{mode === "product" && <nav className="store-breadcrumbs" aria-label="مسار التصفح" dir="rtl"><Link href="/">الرئيسية</Link><span>/</span>{productCategory && <><Link href={collectionHref(productCategory.id)}>{productCategory.label}</Link><span>/</span></>}<span aria-current="page">{title}</span></nav>}
{mode === "category" && <nav className="store-departments" aria-label="أقسام المتجر" dir="rtl"><CategoryLink slug={null} aria-current={slug === 'all' ? 'page' : undefined}>الكل</CategoryLink>{groups.map(group => <CategoryLink key={group.id} slug={group.id} aria-current={group.id === slug ? 'page' : undefined}>{group.label}</CategoryLink>)}</nav>}
{mode === "product" && product && <ProductQuickView inline product={product} cartItems={cart} selectedVariantId={variantChoice[product.id] ?? null} onSelectVariant={(id, variant) => setVariantChoice(v => ({...v, [id]:variant}))} currency={settings.currency} isFavorite={favoriteSet.has(product.id)} settings={settings} onClose={() => router.push("/categories")} onToggleFavorite={toggleFavorite} onAddToCart={(p, variant, quantity) => addProduct(p.id, variant, quantity)} />}
{mode === "cart" && <CartDrawer inline side="right" open lines={lines} settings={settings} onClose={() => router.push("/categories")} onRemove={remove} onCheckout={checkout} onBrowse={() => router.push("/categories")} />}

        {mode === "home" && <><Hero products={sceneProducts} currency={sceneCurrency} onAddToCart={addSceneProduct} onScrollTo={scrollTo} onOpenDetails={id => { setSceneQuickView(true); setQuickViewId(id) }} />
        <BestSellers
          products={sceneProducts}
          currency={sceneCurrency}
          onAddToCart={addSceneProduct}
          onOpenDetails={id => { setSceneQuickView(true); setQuickViewId(id) }}
        /></>}

        {(mode === "category" || mode === "favorites") ? <ShopSection
          cart={cart}
          key={pathname}
          products={visible}
          groups={groups}
          initialCategory={slug}
          currency={settings.currency}
          pageTitle={title}
          query={searchQuery}
          unavailable={storeUnavailable}
          favorites={favorites}
          selectedVariants={variantChoice}
          onSelectVariant={(productId, variantId) =>
            setVariantChoice((current) => ({ ...current, [productId]: variantId }))
          }
          onToggleFavorite={toggleFavorite}
          onAddToCart={(productId, variantId) => addProduct(productId, variantId, 1, true)}
          onOpenDetails={openProduct}
        /> : (mode === "home" || mode === "categories") ? <CategoryCircles groups={groups} products={products} /> : null}
      </>

    )
  }

  return (
    <StorePageContext.Provider value={renderPage}><StorefrontMotion>
      <StoreScroll />
      <a href="#store-content" className="skip-link">انتقلي إلى المنتجات</a>

      <Header
        onSearch={() => setSearchOpen(true)}
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
        productCount={products.length}
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
        onCheckout={checkout}
        onBrowse={browse}
      />

      {quickViewProduct && <ProductQuickView
        key={quickViewProduct.id}
        product={quickViewProduct}
        cartItems={cart}
        inventory={!!modalProduct || !sceneQuickView}
        selectedVariantId={quickViewProduct ? variantChoice[quickViewProduct.id] ?? null : null}
        onSelectVariant={(productId, variantId) => setVariantChoice(current => ({ ...current, [productId]: variantId }))}
        currency={sceneQuickView && !modalProduct ? sceneCurrency : settings.currency}
        isFavorite={quickViewProduct ? favoriteSet.has(quickViewProduct.id) : false}
        settings={settings}
        onClose={closeProduct}
        onToggleFavorite={toggleFavorite}
        onAddToCart={(product, variantId, quantity) => {
          if (sceneQuickView && !modalProduct) { cartActions.add(product.id, variantId, quantity); return true }
          return addProduct(product.id, variantId, quantity)
        }}
      />}

      <MobileCartBar
        count={totalCount}
        total={total + (totalCount > 0 && !(settings.storeFreeShippingThreshold > 0 && total >= settings.storeFreeShippingThreshold) ? settings.storeShippingFee ?? 0 : 0)}
        settings={settings}
        onOpenCart={openCart}
        open={cartOpen || searchOpen || quickViewId !== null || !!modalProduct}
      />

      <Toast toast={cartOpen || searchOpen || quickViewId !== null ? null : toast} />
    </StorefrontMotion></StorePageContext.Provider>
  )
}

export interface StorePageProps { mode: 'home' | 'categories' | 'category' | 'product' | 'cart' | 'favorites'; slug?: string }
const StorePageContext = createContext<((props: StorePageProps) => ReactNode) | null>(null)
export function StorePage(props: StorePageProps) {
  const render = useContext(StorePageContext)
  if (!render) throw new Error('StorePage requires the store layout')
  return render(props)
}
