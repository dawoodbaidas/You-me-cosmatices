'use client'

import DelayedStoreLoading from '@/components/DelayedStoreLoading'
import { useStoreNavigation } from '@/components/StoreNavigation'

export default function Loading() {
  const { activePath } = useStoreNavigation()
  return <DelayedStoreLoading path={activePath} />
}
