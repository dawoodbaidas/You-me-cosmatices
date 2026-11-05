'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useStoreRefresh(revision: string | null) {
  const router = useRouter()
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    const client = createClient()
    let disposed = false
    let checking = false
    let refreshing = false
    // Render cached pages immediately; refresh their payload only on a change.
    const refresh = async () => {
      if (disposed || document.hidden || checking || refreshing) return
      checking = true
      try {
        const { data, error } = await client.from('store_revision').select('version').eq('id', 1)
        if (!disposed && !error && data?.[0] && String(data[0].version) !== revision) {
          refreshing = true
          router.refresh()
        }
      } catch {
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
    const poll = window.setInterval(() => void refresh(), 30_000)
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
  }, [router, revision])
}
