'use client'
import { useEffect, useRef } from 'react'
import CategoryImage from './CategoryImage'
import CategoryLink from './CategoryLink'
import type { Collection } from '@/lib/taxonomy'

export default function CategoryCircles({ groups, compact = false, selected, title, page = false }: { groups: Collection[]; compact?: boolean; selected?: string; title?: string; page?: boolean }) {
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
  useEffect(() => {
    if (!compact || !section.current) return
    const element = section.current, root = element.closest<HTMLElement>('.boutique')
    const update = () => root?.style.setProperty('--category-height', element.getBoundingClientRect().height + 'px')
    const observer = new ResizeObserver(update)
    observer.observe(element)
    update()
    return () => { observer.disconnect(); root?.style.setProperty('--category-height', '0px') }
  }, [compact])
  const Container = compact ? 'nav' : 'section'
  const stories = groups
  return <Container id={compact || page ? undefined : 'shop'} ref={section} className={compact ? 'category-circles store-departments' : `category-circles${page ? ' category-page-circles' : ''}`} aria-label={compact ? 'أقسام المتجر' : undefined} dir="rtl">
    {!compact && <>{title ? <h1>{title}</h1> : <h2>تسوّق <span>حسب القسم</span></h2>}<p>اختر القسم اللي يناسبك</p></>}
    <div ref={row} className="category-circle-grid">{stories.map((group, index) => {
      const src = group.imageUrl ?? null
      return <CategoryLink className="category-circle-link" key={group.id} slug={group.id === 'all' ? null : group.id} data-index={index} aria-current={compact && selected === group.id ? 'page' : undefined}>
        <div className={'category-orb tone-' + index % 4}><CategoryImage src={src} alt={group.label} eager={compact && index < 4} sizes={compact ? '(min-width:768px) 64px, 52px' : '(min-width:1024px) 210px, (min-width:768px) 140px, 160px'} /></div>
        <strong>{group.label}</strong>
      </CategoryLink>
    })}</div>
  </Container>
}
