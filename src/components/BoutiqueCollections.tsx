'use client'

import Image from 'next/image'
import { CATEGORY_FILTERS, filterProducts } from '@/lib/categories'
import { formatJod } from '@/lib/format'
import type { CategoryFilter, Product } from '@/types/product'
import { ArrowIcon } from './icons'

export default function BoutiqueCollections({ products, currency, onCategory, onOpenDetails }: {
  products: Product[]
  currency: string
  onCategory: (category: CategoryFilter) => void
  onOpenDetails: (id: string) => void
}) {
  const categories = CATEGORY_FILTERS.filter(option => !['all', 'bestseller', 'skincare-body'].includes(option.key))
  const featured = (['makeup', 'skincare', 'lips'] as const)
    .map(category => filterProducts(products, category).find(product => product.imageUrl && product.isFeatured)
      ?? filterProducts(products, category).find(product => product.imageUrl))
    .filter((product): product is Product => Boolean(product))
  const philosophyPhoto = products.find(product => product.category === 'skincare' && product.imageUrl)
  const spotlight = products.find(product => product.category === 'mist' && product.imageUrl && product.isFeatured)
    ?? products.find(product => product.category === 'mist' && product.imageUrl)

  return <>
    <div className="beauty-marquee" aria-label="اكتشفي أقسام الجمال">
      <div className="marquee-track">
        {[0, 1].map(copy => <div key={copy} className="marquee-copy" aria-hidden={copy === 1}>
          {categories.map(category => <span key={category.key}>{category.label}<i aria-hidden="true">✳</i></span>)}
          <span lang="ar" dir="rtl">الجمال اختيارك <i aria-hidden="true">✳</i></span>
        </div>)}
      </div>
    </div>

    <section id="philosophy" className="philosophy">
      <div className="philosophy-grid">
        <div className="philosophy-copy">
          <p className="scene-label">01 / فلسفتنا</p>
          <h2 className="philosophy-words">
            {'ليست مجرد منتجات. إنها تلك اللحظة الصغيرة التي تختارين فيها نفسكِ.'.split(' ').map((word, index) => <span key={index}>{word} </span>)}
          </h2>
          <p className="philosophy-body">نؤمن أن للجمال لغة تخصّكِ. في اللون الذي تحبّين، والعطر الذي يبقى في ذاكرتكِ، والتفاصيل التي تجعل يومكِ أكثر قرباً منكِ.</p>
          <span className="philosophy-signature" dir="ltr">For the love<br />of being you.</span>
        </div>

        <figure className="philosophy-art">
          {philosophyPhoto?.imageUrl && <div className="philosophy-photo">
            <Image src={philosophyPhoto.imageUrl} alt={philosophyPhoto.nameAr} fill sizes="(max-width: 767px) 62vw, 300px" />
          </div>}
          <figcaption>
            <span dir="ltr">01 — THE RITUAL</span>
            <span>ليست روتيناً.<br />إنها لحظتكِ.</span>
          </figcaption>
          <span className="philosophy-seal" aria-hidden="true" dir="ltr">Y<span>&amp;</span>M</span>
        </figure>
      </div>
    </section>

    <section id="discover" className="discovery">
      <div className="scene-heading">
        <div>
          <p className="scene-label">02 / اختاري عالمكِ</p>
          <h2>جمالكِ.<br /><em>بكل أشكاله.</em></h2>
        </div>
        <span className="discovery-hint">اسحبي للاكتشاف <span aria-hidden="true">←</span></span>
      </div>

      <div className="discovery-grid">
        {categories.map((option, index) => {
          const collection = filterProducts(products, option.key)
          const cover = collection.find(product => product.imageUrl && product.isFeatured) ?? collection.find(product => product.imageUrl)
          return <button key={option.key} className="discovery-tile" onClick={() => onCategory(option.key)}>
            <span className="discovery-photo">
              {cover?.imageUrl && <Image src={cover.imageUrl} alt="" fill sizes="(max-width: 767px) 50vw, 25vw" />}
            </span>
            <span className="discovery-index" dir="ltr">0{index + 1}</span>
            <span className="discovery-info">
              <span className="discovery-name">{option.label}</span>
              <span className="discovery-count">{collection.length} قطعة</span>
            </span>
            <span className="discovery-arrow" aria-hidden="true"><ArrowIcon /></span>
          </button>
        })}
      </div>
    </section>

    <section id="featured" className="featured-scene">
      <div className="featured-intro">
        <p className="scene-label">03 / على ذوق You&amp;Me</p>
        <h2>تستحقّ<br /><em>الضوء.</em></h2>
        <p>تفاصيل نحبّها، ومساحة لاكتشاف ما تحبّينه أنتِ.</p>
        <span className="featured-english" lang="en" dir="ltr">THE OBJECTS<br /><i>of your affection.</i></span>
      </div>

      <div className="editorial-stack" tabIndex={0} aria-label="اختيارات مميزة">
        {featured.map((product, index) => <article className="editorial-object" key={product.id}>
          <div className="editorial-object-top">
            <span dir="ltr">THE EDIT / 0{index + 1}</span>
            <span>{product.categoryLabel}</span>
          </div>
          <button className="editorial-object-photo" onClick={() => onOpenDetails(product.id)} aria-label={`عرض ${product.nameAr}`}>
            {product.imageUrl && <Image src={product.imageUrl} alt={product.nameAr} fill sizes="(max-width: 767px) 76vw, (max-width: 1023px) 40vw, 22vw" />}
            {product.badge && <span className="editorial-badge">{product.badge}</span>}
          </button>
          <div className="editorial-object-info">
            <div><h3>{product.nameAr}</h3><p>{product.benefits[0] || product.categoryLabel}</p></div>
            <strong dir="ltr">{formatJod(product.variants[0]?.price ?? product.price, currency)}</strong>
          </div>
          <button className="editorial-open" onClick={() => onOpenDetails(product.id)}>تفاصيل الاختيار <ArrowIcon /></button>
        </article>)}
      </div>
    </section>

    {spotlight && <section className="spotlight" aria-labelledby="spotlight-title">
      <div className="spotlight-halo" aria-hidden="true" />
      <div className="spotlight-header">
        <span className="scene-label">04 / إحساس يبقى</span>
        <span dir="ltr">THE SIGNATURE MOMENT</span>
      </div>

      <span className="spotlight-type" aria-hidden="true" dir="ltr">Leave a little of you.</span>

      <div className="spotlight-grid">
        <div className="spotlight-copy">
          <h2 id="spotlight-title">لكِ <em>أثر.</em></h2>
          <p>عطرٌ لا يمرّ مرور الكرام. يبقى في المكان، ويترك أثراً يشبهكِ وحدكِ.</p>
          <button className="spotlight-link" onClick={() => onOpenDetails(spotlight.id)}>
            اكتشفي العطر <ArrowIcon />
          </button>
        </div>

        <button className="spotlight-photo" onClick={() => onOpenDetails(spotlight.id)} aria-label={`اكتشفي ${spotlight.nameAr}`}>
          {spotlight.imageUrl && <Image src={spotlight.imageUrl} alt={spotlight.nameAr} fill sizes="(max-width: 767px) 78vw, 36vw" />}
          <span className="spotlight-caption">
            <span><small>{spotlight.categoryLabel}</small><strong>{spotlight.nameAr}</strong></span>
            <b dir="ltr">{formatJod(spotlight.variants[0]?.price ?? spotlight.price, currency)}</b>
          </span>
        </button>
      </div>
    </section>}
  </>
}
