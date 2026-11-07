'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useStoreRefresh(revision: string | null, onRevision?: (revision: string) => void) {
  const router = useRouter()
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    const client = createClient()
    let disposed = false
    let checking = false
    let refreshRetryAt = 0
    // Render cached pages immediately; refresh their payload only on a change.
    const refresh = async () => {
      if (disposed || document.hidden || checking || Date.now() < refreshRetryAt) return
      checking = true
      try {
        const { data, error } = await client.from('store_revision').select('version').eq('id', 1)
        if (!disposed && !error && data?.[0]) onRevision?.(String(data[0].version))
        if (!disposed && !error && data?.[0] && String(data[0].version) !== revision) {
          // A refresh can fail or retain the same revision. Bound suppression so
          // the next poll can retry even when this effect has not remounted.
          refreshRetryAt = Date.now() + 5_000
          router.refresh()
        }
      } catch {
        refreshRetryAt = 0
        // Retry on the next focus, reconnect or database event.
      } finally { checking = false }
    }
    const visible = () => { if (!document.hidden) void refresh() }
    window.addEventListener('focus', visible)
    window.addEventListener('online', visible)
    window.addEventListener('popstate', visible)
    document.addEventListener('visibilitychange', visible)
    const channel = client.channel('store-revision').on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'store_revision',
    }, visible).subscribe()
    const poll = window.setInterval(() => void refresh(), 15_000)
    void refresh()
    return () => {
      window.clearInterval(poll)
      disposed = true
      window.removeEventListener('focus', visible)
      window.removeEventListener('online', visible)
      window.removeEventListener('popstate', visible)
      document.removeEventListener('visibilitychange', visible)
      void client.removeChannel(channel)
    }
  }, [router, revision, onRevision])
}
