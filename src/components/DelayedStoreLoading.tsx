'use client'

import { usePathname } from 'next/navigation'
import CategorySkeleton from './CategorySkeleton'
import StoreSkeleton from './StoreSkeleton'

export default function DelayedStoreLoading({ path, shell = false }: { path?: string; shell?: boolean }) {
  const pathname = usePathname()
  return <LoadingForPath key={path ?? pathname} path={path ?? pathname} shell={shell} />
}

function LoadingForPath({ path, shell }: { path: string; shell: boolean }) {
  const catalogue = path === '/' || path === '/categories' || path.startsWith('/categories/') || path.startsWith('/category/')
  return <div className="store-route-pending" style={{ minHeight: '100svh' }} aria-busy="true">
    {catalogue ? shell ? <StoreSkeleton /> : <CategorySkeleton /> : <p role="status">جارٍ التحميل…</p>}
  </div>
}
