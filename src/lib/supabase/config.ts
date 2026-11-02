/** True when the two public Supabase variables are present. Never throws. */
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/** Used by the storefront to decide whether to offer the offline preview. */
export function isPreviewMode() {
  return !isSupabaseConfigured() && process.env.PREVIEW_WITHOUT_SUPABASE === 'true'
}
