import StoreBrand from '@/components/StoreBrand'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import { AlertIcon, LockIcon } from '@/components/icons'

export const metadata = {
  title: 'دخول المسؤول | You&Me Cosmetics',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <Notice>
          رابط Supabase غير مُعرّف. أضف <code className="ltr">NEXT_PUBLIC_SUPABASE_URL</code> و{' '}
          <code className="ltr">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> في{' '}
          <code className="ltr">.env.local</code>.
        </Notice>
      </Shell>
    )
  }

  const { user, admin } = await getViewer()
  if (user && admin) redirect('/admin')

  return (
    <Shell>
      <div className="w-full max-w-[420px] rounded-[26px] border border-sand bg-white p-7 shadow-[0_24px_60px_rgba(74,46,42,0.12)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cocoa text-white">
            <LockIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold">دخول المسؤول</h1>
            <p className="text-[12px] text-cocoa/60">
              {user ? 'حسابك مسجّل، لكنه ليس حساب مسؤول.' : 'هذه الصفحة محمية.'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-5 text-cocoa/70">
          العملاء يرون الأسعار فقط كنص بدون إمكانية التعديل. التعديل يتم هنا، ويُحفظ مباشرة في
          Supabase.
        </p>

        {user && !admin && (
          <Notice>
            سجّلتِ الدخول باسم {user.email}، لكن هذا البريد غير مُدرج في قائمة المساحين. أضفيه إلى{' '}
            <code className="ltr">admin_emails</code> ومنح الحساب{' '}
            <code className="ltr">app_metadata.role = admin</code>.
          </Notice>
        )}

        <AdminLoginForm />
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 py-12">
      <Link href="/" className="flex items-center gap-3">
        <StoreBrand size="large" />
        <span className="text-right leading-none">
          <span className="block text-[11px] tracking-[0.25em] text-[#B78A4E]">YOU &amp; ME</span>
          <span className="block text-[16px] font-extrabold text-cocoa">COSMETICS</span>
        </span>
      </Link>

      {children}

      <Link href="/" className="text-[12px] text-cocoa/60 underline-offset-4 hover:underline">
        العودة إلى المتجر
      </Link>
    </main>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-rose/20 bg-blush p-3 text-[12px] leading-5 text-cocoa/75">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
      <span>{children}</span>
    </div>
  )
}
