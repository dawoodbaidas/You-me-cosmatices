'use client'
import Price from './Price'
import { productPricing } from '@/lib/pricing'

import { useMemo, useRef, useState } from 'react'
import ProductImage from './ProductImage'
import { BagIcon, LockIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from './icons'
import { cartShipping, cartLineLimit, canCheckoutCart, cartCount, cartTotal } from '@/lib/cart'
import { formatJod } from '@/lib/format'
import type { CartLine, SiteSettings } from '@/types/product'
import styles from './CartPage.module.css'

/** Arabic count copy shared with the floating cart bar. */
const itemCountNoun = (count: number) =>
  count === 1 ? 'قطعة واحدة' : count === 2 ? 'قطعتان' : `${count} قطع`

const itemsFromLines = (lines: CartLine[]) =>
  lines.map(line => ({ productId: line.product.id, variantId: line.variant?.id ?? null, quantity: line.quantity }))

export default function CartPage({ lines, settings, onRemove, onIncrement, onDecrement, onCheckout, onBrowse }: {
  lines: CartLine[]
  settings: SiteSettings
  onRemove: (id: string, variant: string | null) => void
  onIncrement: (id: string, variant: string | null) => void
  onDecrement: (id: string, variant: string | null) => void
  onCheckout: () => Promise<void>
  onBrowse: () => void
}) {
  const subtotal = useMemo(() => cartTotal(lines), [lines])
  const count = useMemo(() => cartCount(lines), [lines])
  const orderAvailable = useMemo(() => canCheckoutCart(lines), [lines])
  const threshold = settings.storeFreeShippingThreshold
  const remaining = Math.max(0, threshold - subtotal)
  const shipping = cartShipping(subtotal, settings)
  const shippingKnown = shipping !== undefined
  const shippingFree = shipping === 0
  const checkoutPending = useRef(false)
  const [pending, setPending] = useState(false)
  const items = itemsFromLines(lines)
  const checkout = async () => {
    if (checkoutPending.current || !orderAvailable) return
    checkoutPending.current = true
    setPending(true)
    try { await onCheckout() }
    finally { checkoutPending.current = false; setPending(false) }
  }

  return (
    <section dir="rtl" className={styles.view} data-testid="cart-page">
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>سلة التسوق</h1>
          {count > 0 && <p className={styles.sub}>{itemCountNoun(count)} بانتظارك</p>}
        </div>
        {count > 0 && <span className={styles.countBadge}>{count}</span>}
      </header>

      {lines.length === 0 ? (
        <div className={styles.empty} data-testid="cart-empty">
          <span className={styles.emptyIcon}><BagIcon /></span>
          <h2>سلتك فاضية لحد الآن</h2>
          <p>اكتشف العطور ومنتجات العناية، وأضف ما يناسبك إلى السلة.</p>
          <button type="button" className={styles.cta} onClick={onBrowse}>تصفّح المنتجات</button>
        </div>
      ) : (
        <div className={styles.layout}>
          <ul className={styles.items} data-testid="cart-items">
            {lines.map(line => {
              const limit = cartLineLimit(line.product, items, line.variant?.id ?? null)
              const atLimit = line.quantity >= limit
              const variantLabel = line.variant?.label ?? line.product.categoryLabel
              return (
                <li className={styles.card} key={`${line.product.id}-${line.variant?.id ?? 'base'}`} data-testid={`cart-line-${line.product.slug}`}>
                  <div className={styles.thumb}>
                    {line.product.imageUrl
                      ? <ProductImage src={line.product.imageUrl} alt={line.product.nameAr} sizes="(max-width: 767px) 88px, 148px" />
                      : <span className={styles.thumbFallback}><BagIcon /></span>}
                  </div>

                  <div className={styles.cardInfo}>
                    <h3 className={styles.name}>{line.product.nameAr}</h3>
                    <p className={styles.variant}>{variantLabel}</p>
                    <p className={styles.unit}>سعر الوحدة: <Price value={line.unitPrice} oldPrice={productPricing(line.product, line.variant).oldPrice} currency={settings.currency} /></p>

                  </div>
                    <div className={styles.controlRow}>
                      <div className={styles.stepper} role="group" aria-label={`كمية ${line.product.nameAr}`}>
                        <button type="button" className={styles.step} aria-label={`زيادة كمية ${line.product.nameAr}`} onClick={() => onIncrement(line.product.id, line.variant?.id ?? null)} disabled={atLimit}>
                          <PlusIcon />
                        </button>
                        <span className={styles.qty} aria-live="polite">{line.quantity}</span>
                        <button type="button" className={styles.step} aria-label={`خفض كمية ${line.product.nameAr}`} onClick={() => onDecrement(line.product.id, line.variant?.id ?? null)} disabled={line.quantity <= 1}>
                          <MinusIcon />
                        </button>
                      </div>
                      <div className={styles.lineTotal}>
                        <small>إجمالي السطر</small>
                        <strong><bdi>{formatJod(line.lineTotal, settings.currency)}</bdi></strong>
                      </div>
                    </div>
                    {atLimit && <p role="status" className={styles.stockNote}>{limit === 0 ? "هذا المنتج غير متاح حالياً؛ يرجى حذفه للمتابعة." : line.quantity > limit ? `الكمية المطلوبة تتجاوز المتاح (${limit})؛ خفّض الكمية أو احذف المنتج.` : `تم الوصول إلى الكمية المتاحة (${limit}).`}</p>}

                  <button type="button" className={styles.remove} aria-label={`حذف ${line.product.nameAr}${line.variant ? ` — ${line.variant.label}` : ''}`} onClick={() => onRemove(line.product.id, line.variant?.id ?? null)}>
                    <TrashIcon />
                  </button>
                </li>
              )
            })}
          </ul>

          <aside className={styles.summary} aria-label="ملخص الطلب">
            <h2 className={styles.summaryTitle}>ملخص الطلب</h2>

            {threshold > 0 && (
              <div className={styles.shipMeter}>
                <p>{remaining > 0 ? `ضيف ${formatJod(remaining, settings.currency)} للحصول على توصيل مجاني` : 'توصيلك مجاني 🎉'}</p>
                <div className={styles.shipTrack} role="progressbar" aria-label="التوصيل المجاني" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(subtotal, threshold)}>
                  <i style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
                </div>
              </div>
            )}

            <dl className={styles.rows}>
              <div className={styles.row}>
                <dt>المجموع الفرعي</dt>
                <dd><bdi>{formatJod(subtotal, settings.currency)}</bdi></dd>
              </div>
              <div className={styles.row}>
                <dt>التوصيل</dt>
                <dd>{shippingFree ? 'مجاني' : shippingKnown ? formatJod(shipping!, settings.currency) : 'يُحدد عند تأكيد الطلب'}</dd>
              </div>
              <div className={`${styles.row} ${styles.totalRow}`}>
                <dt>{shippingKnown || shippingFree ? 'الإجمالي' : 'الإجمالي المعروف'}</dt>
                <dd><bdi>{formatJod(subtotal + (shipping ?? 0), settings.currency)}</bdi></dd>
              </div>
            </dl>

            {!shippingKnown && !shippingFree && (
              <p className={styles.shipNote}><TruckIcon /> تُحدد رسوم التوصيل في خطوة التأكيد النهائية.</p>
            )}

            <button type="button" className={styles.cta} disabled={!orderAvailable || pending} aria-busy={pending} onClick={checkout}>
              <LockIcon /> {pending ? "جارٍ التحقق من الطلب…" : "إتمام الطلب عبر واتساب"}
            </button>
            {!orderAvailable && <p role="status" className={styles.note}>يرجى مراجعة الكميات غير المتاحة قبل إتمام الطلب.</p>}

            <ul className={styles.assurances}>
              <li>تُرسل تفاصيل طلبك عبر واتساب</li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  )
}
