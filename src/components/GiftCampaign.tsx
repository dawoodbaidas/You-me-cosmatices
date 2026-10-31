'use client'

import Image from 'next/image'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import { ArrowIcon } from './icons'

export default function GiftCampaign({ products, currency, onBrowse, onOpenDetails }: {
  products: Product[]
  currency: string
  onBrowse: () => void
  onOpenDetails: (id: string) => void
}) {
  const gifts = products.filter(product => product.category === 'packages' && product.imageUrl).slice(0, 2)
  if (!gifts.length) return null

  return <section id="gifts" className="gift-scene">
    <div className="gift-copy">
      <p className="scene-label">هدايا</p>
      <span className="gift-script" dir="ltr">Just because.</span>
      <h2>هدايا صغيرة،<br />أثر <em>كبير.</em></h2>
      <p>باكيجات جاهزة، بتفاصيل مختارة بعناية.</p>
      <button className="scene-button" onClick={onBrowse}>اكتشف الباكيجات <ArrowIcon /></button>
    </div>

    <div className="gift-gallery">
      {gifts.map((product, index) => <button className={`gift-photo gift-photo-${index}`} key={product.id} onClick={() => onOpenDetails(product.id)} aria-label={`تفاصيل ${product.nameAr}`}>
        <span className="gift-photo-frame">
          {product.imageUrl && <Image src={product.imageUrl} alt={product.nameAr} fill sizes="(max-width: 767px) 52vw, 30vw" />}
        </span>
        <span className="gift-photo-info">
          <span>{product.nameAr}</span>
          <small dir="ltr">{formatJod(product.variants[0]?.price ?? product.price, currency)}</small>
        </span>
      </button>)}
      <span className="gift-seal" aria-hidden="true">WITH<br /><i>care</i></span>
    </div>
  </section>
}
