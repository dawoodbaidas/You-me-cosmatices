'use client'

import { AlertIcon } from '@/components/icons'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-cream px-4 text-cocoa">
        <div className="max-w-[520px] rounded-[24px] border border-sand bg-white p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blush text-rose">
            <AlertIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-[18px] font-extrabold">حدث خطأ غير متوقع</h1>
          <p className="mt-2 text-[13px] leading-6 text-cocoa/70">
            {error.message || 'تعذّر عرض الصفحة.'}
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-cocoa/40">digest: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-full bg-cocoa px-6 py-2.5 text-[13px] font-bold text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
