'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import CategorySkeleton from './CategorySkeleton'
import StoreSkeleton from './StoreSkeleton'

export default function DelayedStoreLoading({ path, shell = false }: { path?: string; shell?: boolean }) {
  const pathname = usePathname()
  return <LoadingForPath key={path ?? pathname} path={path ?? pathname} shell={shell} />
}

function LoadingForPath({ path, shell }: { path: string; shell: boolean }) {
  const [delayed, setDelayed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDelayed(true), 300)
    return () => clearTimeout(timer)
  }, [])
  const catalogue = path === '/' || path === '/categories' || path.startsWith('/categories/') || path.startsWith('/category/')
  return <div className="store-route-pending" style={{ minHeight: '70svh' }} aria-busy="true">
    {delayed && (catalogue ? shell ? <StoreSkeleton /> : <CategorySkeleton /> : <p role="status">جارٍ التحميل…</p>)}
  </div>
}
