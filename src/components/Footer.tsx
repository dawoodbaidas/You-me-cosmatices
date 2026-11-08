'use client'

import { FacebookIcon, InstagramIcon, WhatsappIcon } from './icons'
import { whatsappLink } from '@/lib/whatsapp'
import type { SiteSettings } from '@/types/product'
import styles from './Footer.module.css'

export default function Footer({ settings }: { settings: SiteSettings }) {
  return <footer id="contact" className={styles.footer} dir="rtl">
    <div className={styles.inner}>
      <div className={styles.identity}>
        <div className={styles.wordmark} dir="ltr" aria-label="You and Me Cosmetics">
          <strong>you <i>&amp;</i> me</strong><span>COSMETICS</span>
        </div>
        <h2 className={styles.heading}>معك، بكل <em>حب.</em></h2>
      </div>

      <div className={styles.contact}>
        {settings.whatsappNumber && <a className={styles.whatsapp} href={whatsappLink(settings.whatsappNumber, settings.whatsappMessage)} target="_blank" rel="noopener noreferrer">
          <WhatsappIcon />تواصل معنا عبر واتساب
        </a>}
        <div className={styles.socials}>
          {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="إنستغرام"><InstagramIcon /></a>}
          {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك"><FacebookIcon /></a>}
        </div>
      </div>

      <div className={styles.links}>
        <details className={styles.story}>
          <summary>حكايتنا</summary>
          <p>اختيارات من العناية والعطور والمكياج، تجمعها فكرة واحدة: أن يكون كل شيء أقرب لذوقك.</p>
        </details>
        {settings.email && <a href={`mailto:${settings.email}`}>البريد الإلكتروني</a>}
      </div>

      <div className={styles.copyright}>
        <span>© You&amp;Me لمستحضرات التجميل · الأردن</span>
        <span>آية عصفور — الإمبراطور للابتكار والمهارات</span>
      </div>
    </div>
  </footer>
}
