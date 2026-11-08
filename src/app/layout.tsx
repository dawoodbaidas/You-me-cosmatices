import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'
import './globals.css'

const tajawal = localFont({
  src: [
    { path: '../../public/fonts/tajawal/Tajawal-Regular.ttf', weight: '400' },
    { path: '../../public/fonts/tajawal/Tajawal-Medium.ttf', weight: '500' },
    { path: '../../public/fonts/tajawal/Tajawal-Bold.ttf', weight: '700 900' },
  ],
  display: 'swap',
  variable: '--font-tajawal',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-cormorant',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  icons: {
    icon: '/brand/icon-142d49152553.png',
    shortcut: '/brand/icon-142d49152553.png',
    apple: '/brand/icon-142d49152553.png',
  },
  title: 'You&Me لمستحضرات التجميل | عطور، عناية ومكياج — الأردن',
  description:
    'منتجات عناية ومكياج وعطور مختارة بعناية في الأردن. أسعار واضحة بالدينار الأردني، وتوصيل سريع والدفع عند الاستلام.',
  keywords: ['مكياج', 'عناية بالبشرة', 'عطور', 'مسك', 'الأردن', 'You&Me'],
  authors: [{ name: 'آية عصفور — الإمبراطور للابتكار والمهارات' }],
  openGraph: {
    type: 'website',
    locale: 'ar_JO',
    siteName: 'You&Me لمستحضرات التجميل',
    title: 'You&Me لمستحضرات التجميل | عطور، عناية ومكياج — الأردن',
    description: 'منتجات عناية ومكياج وعطور مختارة بعناية. الدفع عند الاستلام وتوصيل سريع.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'You&Me لمستحضرات التجميل',
    description: 'منتجات عناية ومكياج وعطور مختارة بعناية في الأردن.',
  },
}

export const viewport: Viewport = {
  themeColor: '#FFF6F1',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={`${tajawal.variable} ${cormorant.variable} ${montserrat.variable}`}>
      <body className="min-h-screen bg-cream text-cocoa antialiased">{children}</body>
    </html>
  )
}
