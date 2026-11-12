'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import StoreBrand from '@/components/StoreBrand'
import { CloseIcon, MenuIcon } from '@/components/icons'
import { signOut } from '@/app/admin/actions'
import { AdminEditingProvider, AdminLink } from './AdminEditing'
import styles from './AdminShell.module.css'

const NAV_ITEMS = [
  { href: '/admin', label: 'الرئيسية' },
  { href: '/admin/products', label: 'المنتجات' },
  { href: '/admin/categories', label: 'الأقسام' },
  { href: '/admin/storefront', label: 'واجهة المتجر' },
  { href: '/admin/settings', label: 'الإعدادات' },
] as const

export default function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string
  children: ReactNode
}) {
  return (
    <AdminEditingProvider>
      <AdminShellFrame userEmail={userEmail}>{children}</AdminShellFrame>
    </AdminEditingProvider>
  )
}

function AdminShellFrame({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const [previousPathname, setPreviousPathname] = useState(pathname)
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <div dir="rtl" className={`${styles.dashboard} min-h-screen overflow-x-hidden bg-cream`}>
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-3 border-b border-sand bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="فتح قائمة لوحة الإدارة"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sand bg-white text-cocoa"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link href="/admin" className="flex min-w-0 items-center gap-2">
            <StoreBrand size="compact" />
            <span className="truncate text-[14px] font-extrabold">لوحة المسؤول</span>
          </Link>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-sand bg-white px-3 py-2 text-[12px] font-bold text-cocoa"
        >
          المتجر
        </Link>
      </header>

      <div className="lg:flex">
        <aside className="hidden w-[248px] shrink-0 border-l border-sand bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="flex h-[72px] items-center gap-3 border-b border-sand px-5">
            <StoreBrand size="compact" />
            <span className="text-[15px] font-extrabold text-cocoa">لوحة المسؤول</span>
          </div>
          <nav aria-label="أقسام لوحة الإدارة" className="flex-1 overflow-y-auto p-3">
            <AdminNav pathname={pathname} />
          </nav>
          <AdminFooter userEmail={userEmail} />
        </aside>

        <div className="min-w-0 flex-1">
          <main className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-cocoa/40"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="admin-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة لوحة الإدارة"
            className="absolute inset-y-0 right-0 flex w-[min(82vw,300px)] flex-col bg-white shadow-2xl"
          >
            <div className="flex h-[60px] items-center justify-between gap-3 border-b border-sand px-4">
              <div className="flex min-w-0 items-center gap-2">
                <StoreBrand size="compact" />
                <span className="truncate text-[14px] font-extrabold">لوحة المسؤول</span>
              </div>
              <button
                type="button"
                aria-label="إغلاق القائمة"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sand text-cocoa"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <nav aria-label="أقسام لوحة الإدارة" className="flex-1 overflow-y-auto p-3">
              <AdminNav pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <AdminFooter userEmail={userEmail} />
          </div>
        </div>
      )}
    </div>
  )
}

function AdminNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
        return (
          <li key={item.href}>
            <AdminLink
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`block rounded-xl px-3 py-2.5 text-[13.5px] font-bold transition ${
                active
                  ? 'bg-cocoa text-white'
                  : 'text-cocoa/70 hover:bg-cream hover:text-cocoa'
              }`}
            >
              {item.label}
            </AdminLink>
          </li>
        )
      })}
    </ul>
  )
}

function AdminFooter({ userEmail }: { userEmail: string }) {
  return (
    <div className="space-y-3 border-t border-sand p-4">
      <p className="truncate text-[11.5px] text-cocoa/60" dir="ltr" title={userEmail}>
        {userEmail}
      </p>
      <div className="flex gap-2">
        <Link
          href="/"
          className="flex-1 rounded-full border border-sand bg-white px-3 py-2 text-center text-[12px] font-bold text-cocoa"
        >
          عرض المتجر
        </Link>
        <form action={signOut} className="flex-1">
          <button
            type="submit"
            className="w-full rounded-full bg-cocoa px-3 py-2 text-[12px] font-bold text-white"
          >
            خروج
          </button>
        </form>
      </div>
    </div>
  )
}
