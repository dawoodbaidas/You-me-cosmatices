'use client'

import { useState } from 'react'
import StoreBrand from './StoreBrand'
import CategoryLink from './CategoryLink'
import { FacebookIcon, InstagramIcon, WhatsappIcon } from './icons'
import { whatsappLink } from '@/lib/whatsapp'
import type { Collection } from '@/lib/taxonomy'
import type { SiteSettings } from '@/types/product'

export default function Footer({ settings, groups, productCount, onScrollTo, onSubscribe }: {
  groups: Collection[]
  settings: SiteSettings
  productCount: number
  onScrollTo: (id: string) => void
  onSubscribe: (email: string) => void
}) {
  const [email, setEmail] = useState('')

  return <footer id="contact" className="boutique-footer">
    <div className="footer-top">
      <div className="footer-invite">
        <p className="eyebrow">نبقى على تواصل</p>
        <h2>معك، بكل <em>حب.</em></h2>
        {settings.whatsappNumber && <a className="text-link" href={whatsappLink(settings.whatsappNumber, settings.whatsappMessage)} target="_blank" rel="noopener noreferrer">
          <WhatsappIcon />تواصل معنا عبر واتساب
        </a>}
      </div>

      <div className="footer-newsletter">
        <label htmlFor="newsletter">أخبار You&amp;Me</label>
        <p>اختيارات جديدة، وأخبار من عالمنا.</p>
        <form onSubmit={event => { event.preventDefault(); if (!email.trim()) return; onSubscribe(email.trim()); setEmail('') }}>
          <input id="newsletter" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="بريدك الإلكتروني" />
          <button type="submit">اشتراك <span aria-hidden="true">←</span></button>
        </form>
        <p className="footer-note">نحترم خصوصيتك. لا رسائل مزعجة، فقط ما يستحق.</p>
      </div>
    </div>

    <div className="footer-links">
      <nav aria-label="روابط التذييل">
        <CategoryLink slug={null}>المتجر · {productCount} قطعة</CategoryLink>
        <button onClick={() => onScrollTo('bestsellers')}>الأكثر طلبًا</button>
        {groups.map(group => <CategoryLink key={group.id} slug={group.id}>{group.label}</CategoryLink>)}
        <button onClick={() => onScrollTo('story')}>حكايتنا</button>
        {settings.email && <a href={`mailto:${settings.email}`}>البريد الإلكتروني</a>}
        <a href="/admin">دخول المسؤول</a>
      </nav>
      <div className="footer-socials">
        {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"><InstagramIcon /></a>}
        {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"><FacebookIcon /></a>}
        {settings.whatsappNumber && <a href={whatsappLink(settings.whatsappNumber, settings.whatsappMessage)} target="_blank" rel="noopener noreferrer" aria-label="واتساب"><WhatsappIcon /></a>}
      </div>
    </div>

    <div className="footer-brand"><StoreBrand size="large" /></div>

    <div className="footer-bottom">
      <span>© You&amp;Me لمستحضرات التجميل · الأردن</span>
      <span dir="ltr">جمالك، على ذوقك.</span>
      <span>آية عصفور — الإمبراطور للابتكار والمهارات</span>
    </div>
  </footer>
}
