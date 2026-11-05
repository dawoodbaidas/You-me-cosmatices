'use client'
import { useEffect, useRef } from 'react'
import ProductImage from './ProductImage'
import type { Product } from '@/types/product'
import CategoryLink from './CategoryLink'
import type { Collection } from '@/lib/taxonomy'

export default function CategoryCircles({ groups, products, compact = false, selected = 'all', title }: { groups: Collection[]; products: Product[]; compact?: boolean; selected?: string; title?: string }) {
  const section = useRef<HTMLElement>(null)
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!compact) return
    const scroller = row.current
    const active = scroller?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!scroller || !active) return
    const bounds = scroller.getBoundingClientRect()
    const item = active.getBoundingClientRect()
    if (item.left >= bounds.left && item.right <= bounds.right) return
    scroller.scrollBy({ left: item.left + item.width / 2 - bounds.left - bounds.width / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [compact, selected])
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
  const Container = compact ? 'nav' : 'section'
  const stories: Collection[] = compact ? [{ id: 'all', label: 'الكل', productIds: products.map(product => product.id), children: [] }, ...groups] : groups
  return <Container id={compact ? undefined : 'shop'} ref={section} className={compact ? 'category-circles store-departments' : 'category-circles'} aria-label={compact ? 'أقسام المتجر' : undefined} dir="rtl">
    {!compact && <>{title ? <h1>{title}</h1> : <h2>تسوّق <span>حسب القسم</span></h2>}<p>اختر القسم اللي يناسبك</p></>}
    <div ref={row} className="category-circle-grid">{stories.map((group, index) => {
      const src = group.imageUrl ?? null
      return <CategoryLink className="category-circle-link" key={group.id} slug={group.id === 'all' ? null : group.id} data-index={index} aria-current={compact && selected === group.id ? 'page' : undefined}>
        <div className={'category-orb tone-' + Math.max(0, compact ? index - 1 : index) % 4}><ProductImage src={src} alt={group.label} sizes={compact ? '(min-width:768px) 64px, 52px' : '(min-width:1024px) 210px, (min-width:768px) 140px, 100px'} /></div>
        <strong>{group.label}</strong>{!compact && <small>{group.productIds.length} منتج</small>}
      </CategoryLink>
    })}</div>
  </Container>
}
