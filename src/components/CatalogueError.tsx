import Link from 'next/link'
import { AlertIcon, RefreshIcon } from '@/components/icons'

/**
 * Shown when Supabase cannot be reached, instead of rendering the shop with
 * stale or invented prices.
 */
export default function CatalogueError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="w-full max-w-[560px] rounded-[26px] border border-sand bg-white/80 p-8 text-center shadow-[0_18px_50px_rgba(74,46,42,0.08)] backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush text-rose">
          <AlertIcon className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-[20px] font-extrabold">تعذّر تحميل المتجر حالياً</h1>
        <p className="mt-3 text-[13.5px] leading-6 text-cocoa/70">{message}</p>

        <div className="mt-6 rounded-[16px] bg-[#FFFBF8] p-4 text-right text-[12.5px] leading-6 text-cocoa/70">
          <p className="font-bold text-cocoa">لتشغيل المتجر:</p>
          <ol className="list-inside list-decimal">
            <li>
              انسخ <code className="ltr">.env.example</code> إلى{' '}
              <code className="ltr">.env.local</code>
            </li>
            <li>
              ضع <code className="ltr">NEXT_PUBLIC_SUPABASE_URL</code> و{' '}
              <code className="ltr">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            </li>
            <li>
              نفّذ <code className="ltr">supabase/migrations/001_initial_schema.sql</code> ثم{' '}
              <code className="ltr">supabase/seed.sql</code>
            </li>
            <li>
              للمعاينة المحلية بدون قاعدة بيانات:{' '}
              <code className="ltr">npm run seed:build</code> ثم{' '}
              <code className="ltr">PREVIEW_WITHOUT_SUPABASE=true</code>
            </li>
          </ol>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-cocoa px-6 py-3 text-[13px] font-bold text-white transition hover:bg-rose"
        >
          <RefreshIcon className="h-4 w-4" />
          إعادة المحاولة
        </Link>
      </div>
    </div>
  )
}
