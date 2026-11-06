// Loading boundary for the whole catalogue group. It lives *below* the shared
// (store)/layout, so during client navigation (e.g. home → "الأقسام") Next.js
// swaps this skeleton in immediately instead of keeping the previous page
// (homepage) mounted until the Supabase-backed page payload streams in.
import CategorySkeleton from '@/components/CategorySkeleton'

export default function Loading() {
  return <CategorySkeleton />
}
