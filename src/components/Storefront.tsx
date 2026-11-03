'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchOverlay from './SearchOverlay'
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
import ProductQuickView from '@/components/ProductQuickView'
import ShopSection from '@/components/ShopSection'
import Toast, { type ToastMessage } from '@/components/Toast'
import { canCheckoutCart, cartLineLimit, cartCount as countItems, cartTotal as sumTotal, resolveCart } from '@/lib/cart'
import { arabicStoreProduct } from '@/lib/storefront-arabic'
import { storeCollections, findCollection } from '@/lib/store-categories'
import type { StoreCategory } from '@/types/store'
import { useStoreRefresh } from './useStoreRefresh'
import StoreScroll from './StoreScroll'
import { useCartStore, useFavoritesStore } from '@/lib/stores'
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp'
import type { Product, SiteSettings } from '@/types/product'

interface StorefrontProps {
  products: Product[]
  settings: SiteSettings
  categoryId?: string
  categories: StoreCategory[]
  storeUnavailable?: boolean
  storeRevision?: string | null
  sceneProducts?: Product[]
  sceneCurrency?: string
}

export default function Storefront({ products, settings, categoryId, categories, storeRevision = null, storeUnavailable = false, sceneProducts: editorial = [], sceneCurrency = '' }: StorefrontProps) {
  const router = useRouter()
  useStoreRefresh(storeRevision)
  const sceneProducts = useMemo(() => editorial.map(arabicStoreProduct), [editorial])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const groups = useMemo(() => storeCollections(categories, products), [categories, products])
  const collection = findCollection(groups, categoryId ?? null)
  const cataloguePage = categoryId !== undefined
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

  useEffect(() => {
    const syncQuery = () => setSearchQuery(new URLSearchParams(window.location.search).get('q') ?? '')
    syncQuery()
    window.addEventListener('popstate', syncQuery)
    return () => window.removeEventListener('popstate', syncQuery)
  }, [])

  const submitSearch = useCallback((value: string) => {
    const query = value.trim()
    if (!query) return
    setSearchQuery(query)
    setSearchOpen(false)
    router.push(`/category/all?q=${encodeURIComponent(query)}`)
  }, [router])

  useLayoutEffect(() => {
    if (categoryId !== undefined) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [categoryId])

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
    (productId: string, variantId: string | null, quantity = 1) => {
      const product = products.find((candidate) => candidate.id === productId)
      const current = cartActions.snapshot()
      const quantityInLine = current.find(item => item.productId === productId && item.variantId === variantId)?.quantity ?? 0
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantityInLine + quantity > cartLineLimit(product, current, variantId)) {
        notify('الكمية المطلوبة غير متاحة حالياً.', 'error')
        return false
      }
      cartActions.add(productId, variantId, quantity)
      if (product) notify(`أضيف إلى السلة: ${product.nameAr}`)
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

  const checkout = useCallback(() => {
    const currentLines = resolveCart(cartActions.snapshot(), products)
    if (currentLines.length === 0) return
    if (!canCheckoutCart(currentLines)) {
      notify('تغيّر المخزون. راجع الكميات في السلة قبل إرسال الطلب.', 'error')
      return
    }
    if (!settings.whatsappNumber) { notify('خدمة الطلب غير متاحة حالياً.', 'error'); return }
    const message = buildOrderMessage(currentLines, settings)
    window.open(whatsappLink(settings.whatsappNumber, message), '_blank', 'noopener,noreferrer')
    notify('تم فتح واتساب برسالة طلبك')
  }, [cartActions, notify, settings, products])

  const browse = useCallback(() => {
    setCartOpen(false)
    scrollTo('shop')
  }, [scrollTo])

  /* ----------------------------------------------------------------- render */

  const visible = useMemo(() => collection ? products.filter(product => collection.productIds.includes(product.id)) : categoryId && categoryId !== 'all' ? [] : products, [products, collection, categoryId])
  const quickViewProduct = (sceneQuickView ? sceneProducts : products).find((product) => product.id === quickViewId) ?? null
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  return (
    <StorefrontMotion>
      <StoreScroll />
      <a href="#shop" className="skip-link">انتقلي إلى المنتجات</a>

      <Header
        onSearch={() => setSearchOpen(true)}
        settings={settings}
        cartCount={totalCount}
        favoriteCount={favorites.length}
        onOpenCart={openCart}
        onScrollTo={scrollTo}
        groups={groups}
        selected={categoryId ?? null}
        cataloguePage={cataloguePage}
      />

      <main>
        {!cataloguePage && <><Hero products={sceneProducts} currency={sceneCurrency} onAddToCart={addSceneProduct} onScrollTo={scrollTo} onOpenDetails={id => { setSceneQuickView(true); setQuickViewId(id) }} />
        <BestSellers
          products={sceneProducts}
          currency={sceneCurrency}
          onAddToCart={addSceneProduct}
          onOpenDetails={id => { setSceneQuickView(true); setQuickViewId(id) }}
        /></>}

        <ShopSection
          cart={cart}
          key={categoryId ?? 'home'}
          products={visible}
          groups={groups}
          initialCategory={categoryId}
          currency={settings.currency}
          pageTitle={cataloguePage ? collection?.label ?? (categoryId === 'all' ? 'جميع المنتجات' : 'المنتجات') : undefined}
          query={searchQuery}
          unavailable={storeUnavailable}
          favorites={favorites}
          selectedVariants={variantChoice}
          onSelectVariant={(productId, variantId) =>
            setVariantChoice((current) => ({ ...current, [productId]: variantId }))
          }
          onToggleFavorite={toggleFavorite}
          onAddToCart={addProduct}
          onOpenDetails={id => { setSceneQuickView(false); setQuickViewId(id) }}
        />
      </main>

      <Footer
        settings={settings}
        groups={groups}
        productCount={products.length}
        onScrollTo={scrollTo}
        onSubscribe={() => notify('تم تسجيل بريدك. سنتواصل قريبًا.')}
      />

      {searchOpen && <SearchOverlay products={products} currency={settings.currency} initialQuery={searchQuery} onClose={() => setSearchOpen(false)} onSubmit={submitSearch} onSelect={id => { setSearchOpen(false); setSceneQuickView(false); setQuickViewId(id) }} />}
      <CartDrawer
        side={cartSide}
        open={cartOpen}
        lines={lines}
        settings={settings}
        onClose={() => setCartOpen(false)}
        onIncrement={increment}
        onDecrement={decrement}
        onRemove={remove}
        onCheckout={checkout}
        onBrowse={browse}
      />

      <ProductQuickView
        key={quickViewId}
        product={quickViewProduct}
        cartItems={cart}
        inventory={!sceneQuickView}
        selectedVariantId={quickViewProduct ? variantChoice[quickViewProduct.id] ?? null : null}
        onSelectVariant={(productId, variantId) => setVariantChoice(current => ({ ...current, [productId]: variantId }))}
        currency={sceneQuickView ? sceneCurrency : settings.currency}
        isFavorite={quickViewProduct ? favoriteSet.has(quickViewProduct.id) : false}
        settings={settings}
        onClose={() => setQuickViewId(null)}
        onToggleFavorite={toggleFavorite}
        onAddToCart={(product, variantId, quantity) => {
          if (sceneQuickView) { cartActions.add(product.id, variantId, quantity); return true }
          return addProduct(product.id, variantId, quantity)
        }}
      />

      <MobileCartBar
        count={totalCount}
        total={total + (totalCount > 0 && !(settings.storeFreeShippingThreshold > 0 && total >= settings.storeFreeShippingThreshold) ? settings.storeShippingFee ?? 0 : 0)}
        settings={settings}
        onOpenCart={openCart}
        open={cartOpen || searchOpen || quickViewId !== null}
      />

      <Toast toast={cartOpen || searchOpen || quickViewId !== null ? null : toast} />
    </StorefrontMotion>
  )
}
