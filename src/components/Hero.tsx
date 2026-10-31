'use client'
import MobileHero from './MobileHero'
import type { Product } from '@/types/product'
export default function Hero(props: { products:Product[]; currency:string; onScrollTo:(id:string)=>void; onAddToCart:(id:string,variant:string|null)=>void; onOpenDetails:(id:string)=>void }) {
 return <section id="home" className="hero-editorial" aria-label="الرئيسية"><MobileHero {...props}/></section>
}
