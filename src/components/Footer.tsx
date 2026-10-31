'use client'

import { useState } from 'react'
import { FacebookIcon, InstagramIcon, WhatsappIcon } from './icons'
import { whatsappLink } from '@/lib/whatsapp'
import type { SiteSettings } from '@/types/product'

export default function Footer({ settings, productCount, onScrollTo, onSubscribe }: {
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
        <a className="text-link" href={whatsappLink(settings.whatsappNumber, settings.whatsappMessage)} target="_blank" rel="noopener noreferrer">
          <WhatsappIcon />تواصل معنا عبر واتساب
        </a>
      </div>

      <div className="footer-newsletter">
        <label htmlFor="newsletter">أخبار You &amp; Me</label>
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
        <button onClick={() => onScrollTo('shop')}>المتجر · {productCount} قطعة</button>
        <button onClick={() => onScrollTo('bestsellers')}>الأكثر طلبًا</button>
        <button onClick={() => onScrollTo('gifts')}>الهدايا</button>
        <button onClick={() => onScrollTo('story')}>حكايتنا</button>
        <a href={`mailto:${settings.email}`}>البريد الإلكتروني</a>
        <a href="/admin">دخول المسؤول</a>
      </nav>
      <div className="footer-socials">
        {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>}
        {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>}
        <a href={whatsappLink(settings.whatsappNumber, settings.whatsappMessage)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsappIcon /></a>
      </div>
    </div>

    <div className="footer-wordmark" dir="ltr">you <i>&amp;</i> me<span>cosmetics</span></div>

    <div className="footer-bottom">
      <span>© You &amp; Me Cosmetics · الأردن</span>
      <span dir="ltr">BEAUTY, ON YOUR TERMS.</span>
      <span>Ayatasfour — الإمبراطور للابتكار والمهارات</span>
    </div>
  </footer>
}
