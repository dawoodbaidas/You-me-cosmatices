import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-4 text-center">
      <p className="text-[64px] font-extrabold leading-none text-rose/30">404</p>
      <h1 className="text-[20px] font-extrabold">الصفحة غير موجودة</h1>
      <p className="max-w-[40ch] text-[13px] leading-6 text-cocoa/70">
        ربما تم نقل الصفحة أو أن الرابط غير صحيح.
      </p>
      <Link
        href="/"
        className="rounded-full bg-cocoa px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-rose"
      >
        العودة إلى المتجر
      </Link>
    </main>
  )
}
