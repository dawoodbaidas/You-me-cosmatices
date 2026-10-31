'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import './editorial-motion.css'
import CartDrawer, { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/components/CartDrawer'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import MobileCartBar from '@/components/MobileCartBar'
import ProductQuickView from '@/components/ProductQuickView'
import ShopSection from '@/components/ShopSection'
import Toast, { type ToastMessage } from '@/components/Toast'
import { cartCount as countItems, cartTotal as sumTotal, resolveCart } from '@/lib/cart'
import { filterProducts } from '@/lib/categories'
import { buildTaxonomy, findCollection } from '@/lib/taxonomy'
import { useCartStore, useFavoritesStore } from '@/lib/stores'
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp'
import type { CategoryFilter, Product, SiteSettings } from '@/types/product'

const SECTION_LABELS: Record<string, string> = {
  home: 'الرئيسية',
  bestsellers: 'الأكثر طلبًا',
  shop: 'المتجر',
  gifts: 'الهدايا',
  story: 'عن العلامة',
  contact: 'تواصل',
}

interface StorefrontProps {
  products: Product[]
  settings: SiteSettings
}

export default function Storefront({ products, settings }: StorefrontProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const groups = useMemo(() => buildTaxonomy(products), [products])
  const collection = findCollection(groups, collectionId)
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cart, cartActions] = useCartStore()
  const [favorites, toggleFavoriteStore] = useFavoritesStore()

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
      cartActions.add(productId, variantId, quantity)
      if (product) notify(`أضيف إلى السلة: ${product.nameAr}`)
    },
    [cartActions, notify, products],
  )

  const increment = useCallback(
    (productId: string, variantId: string | null) => {
      const line = lines.find(
        (candidate) =>
          candidate.product.id === productId && (candidate.variant?.id ?? null) === variantId,
      )
      if (!line) return
      if (line.quantity >= 99) return
      cartActions.setQuantity(productId, variantId, line.quantity + 1)
    },
    [cartActions, lines],
  )

  const decrement = useCallback(
    (productId: string, variantId: string | null) => {
      const line = lines.find(
        (candidate) =>
          candidate.product.id === productId && (candidate.variant?.id ?? null) === variantId,
      )
      if (!line) return
      if (line.quantity <= 1) {
        cartActions.remove(productId, variantId)
        return
      }
      cartActions.setQuantity(productId, variantId, line.quantity - 1)
    },
    [cartActions, lines],
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
      document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      window.history.replaceState(null, '', `#${id}`)
      notify(`الانتقال إلى ${SECTION_LABELS[id] ?? id}`)
    },
    [notify],
  )

  /* --------------------------------------------------------------- checkout */

  const checkout = useCallback(() => {
    if (lines.length === 0) return
    const message = buildOrderMessage(lines, settings)
    window.open(whatsappLink(settings.whatsappNumber, message), '_blank', 'noopener,noreferrer')
    notify('تم فتح واتساب برسالة طلبك')
  }, [lines, notify, settings])

  const browse = useCallback(() => {
    setCartOpen(false)
    scrollTo('shop')
  }, [scrollTo])

  /* ----------------------------------------------------------------- render */

  const visible = useMemo(() => collection ? products.filter(p => collection.productIds.includes(p.id)) : filterProducts(products, filter), [products, filter, collection])
  const quickViewProduct = products.find((product) => product.id === quickViewId) ?? null
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])

  return (
    <StorefrontMotion>
      <link rel="preload" href="/fonts/tajawal/Tajawal-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      <link rel="preload" href="/fonts/tajawal/Tajawal-Medium.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      <a href="#shop" className="skip-link">انتقلي إلى المنتجات</a>

      <Header
        onSearch={() => setSearchOpen(true)}
        settings={settings}
        cartCount={totalCount}
        favoriteCount={favorites.length}
        onOpenCart={() => { setQuickViewId(null); setCartOpen(true) }}
        onScrollTo={scrollTo}
        groups={groups}
        selected={collectionId}
        onSelect={id => { setCollectionId(id); setFilter('all'); scrollTo('shop') }}
      />

      <main>
        <Hero products={products} currency={settings.currency} onAddToCart={addProduct} onScrollTo={scrollTo} onOpenDetails={setQuickViewId} />
        <BestSellers
          products={products}
          currency={settings.currency}
          onAddToCart={addProduct}
          onBrowse={() => { setCollectionId(null); setFilter('all'); scrollTo('shop') }}
          onOpenDetails={setQuickViewId}
        />

        <ShopSection
          key={collectionId ?? filter}
          products={visible}
          currency={settings.currency}
          activeFilter={filter}
          collection={collection}
          groups={groups}
          onCollectionChange={setCollectionId}
          onFilterChange={value => { setCollectionId(null); setFilter(value) }}
          favorites={favorites}
          selectedVariants={variantChoice}
          onSelectVariant={(productId, variantId) =>
            setVariantChoice((current) => ({ ...current, [productId]: variantId }))
          }
          onToggleFavorite={toggleFavorite}
          onAddToCart={addProduct}
          onOpenDetails={setQuickViewId}
        />
      </main>

      <Footer
        settings={settings}
        productCount={products.length}
        onScrollTo={scrollTo}
        onSubscribe={() => notify('تم تسجيل بريدك. سنتواصل قريبًا.')}
      />

      {searchOpen && <SearchOverlay products={products} currency={settings.currency} onClose={() => setSearchOpen(false)} onSelect={id => { setSearchOpen(false); setQuickViewId(id) }} />}
      <CartDrawer
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
        selectedVariantId={quickViewProduct ? variantChoice[quickViewProduct.id] ?? null : null}
        onSelectVariant={(productId, variantId) => setVariantChoice(current => ({ ...current, [productId]: variantId }))}
        currency={settings.currency}
        isFavorite={quickViewProduct ? favoriteSet.has(quickViewProduct.id) : false}
        settings={settings}
        onClose={() => setQuickViewId(null)}
        onToggleFavorite={toggleFavorite}
        onAddToCart={(product, variantId, quantity) => addProduct(product.id, variantId, quantity)}
      />

      <MobileCartBar
        count={totalCount}
        total={total + (totalCount > 0 && total < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0)}
        settings={settings}
        onOpenCart={() => { setQuickViewId(null); setCartOpen(true) }}
        open={cartOpen}
      />

      <Toast toast={toast} />
    </StorefrontMotion>
  )
}
