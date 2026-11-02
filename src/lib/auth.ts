import { createClient } from '@/lib/supabase/server'

/**
 * Authorisation is enforced in the database (`public.is_admin()`), which checks
 * BOTH `app_metadata.role = 'admin'` AND the `admin_emails` allow-list.
 * Reading it through the RPC keeps a single source of truth — never trust a
 * claim from the client or a local flag.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('is_admin')
    if (error) return false
    return data === true
  } catch {
    return false
  }
}

export async function getViewer() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { user: null, admin: false }

    const admin = await isAdmin()
    return { user, admin }
  } catch {
    return { user: null, admin: false }
  }
}
