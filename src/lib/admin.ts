import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase/config'

/**
 * Server-side gate for every admin section. Cached per request so a layout and
 * its page share one session/admin check instead of trusting the layout alone.
 */
export const requireAdmin = cache(async () => {
  if (!isSupabaseConfigured()) redirect('/admin/login')

  const { user, admin } = await getViewer()
  if (!user || !admin) redirect('/admin/login')

  return user
})
