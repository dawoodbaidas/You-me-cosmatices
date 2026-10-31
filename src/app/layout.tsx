import type { Metadata, Viewport } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const metadata: Metadata = {
  title: 'You & Me Cosmetics | عطور، عناية ومكياج — الأردن',
  description:
    'منتجات عناية ومكياج وعطور مختارة بعناية في الأردن. أسعار واضحة بالدينار الأردني، وتوصيل سريع والدفع عند الاستلام.',
  keywords: ['مكياج', 'عناية بالبشرة', 'عطور', 'مسك', 'الأردن', 'You and Me Cosmetics'],
  authors: [{ name: 'Ayatasfour — الإمبراطور للابتكار والمهارات' }],
  openGraph: {
    type: 'website',
    locale: 'ar_JO',
    siteName: 'You & Me Cosmetics',
    title: 'You & Me Cosmetics | عطور، عناية ومكياج — الأردن',
    description: 'منتجات عناية ومكياج وعطور مختارة بعناية. الدفع عند الاستلام وتوصيل سريع.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'You & Me Cosmetics',
    description: 'منتجات عناية ومكياج وعطور مختارة بعناية في الأردن.',
  },
}

export const viewport: Viewport = {
  themeColor: '#FFF6F1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="min-h-screen bg-cream text-cocoa antialiased">{children}</body>
    </html>
  )
}
