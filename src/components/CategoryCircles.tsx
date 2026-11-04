'use client'
import { useEffect, useRef } from 'react'
import ProductImage from './ProductImage'
import type { Product } from '@/types/product'
import CategoryLink from './CategoryLink'
import type { Collection } from '@/lib/taxonomy'

export default function CategoryCircles({ groups, products }: { groups: Collection[]; products: Product[] }) {
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, delay: Number((entry.target as HTMLElement).dataset.index) % 2 * 90, fill: 'backwards', easing: 'ease-out' })
      observer.unobserve(entry.target)
    }), { threshold: .15 })
    section.current?.querySelectorAll('.category-circle-link').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])
  return <section id="shop" ref={section} className="category-circles" dir="rtl">
    <h2>تسوّق <span>حسب القسم</span></h2><p>اختر القسم اللي يناسبك</p>
    <div className="category-circle-grid">{groups.map((group, index) => {
      const src = products.find(product => group.productIds.includes(product.id) && product.imageUrl)?.imageUrl ?? null
      return <CategoryLink className="category-circle-link" key={group.id} slug={group.id} data-index={index}>
        <div className={'category-orb tone-' + index % 4}><ProductImage src={src} alt={group.label} sizes="(min-width:1024px) 210px, (min-width:768px) 140px, 100px" /></div>
        <strong>{group.label}</strong><small>{group.productIds.length} منتج</small>
      </CategoryLink>
    })}</div>
  </section>
}
