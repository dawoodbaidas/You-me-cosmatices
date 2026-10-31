/** Only rendered when the opt-in offline preview is active. */
export default function PreviewBanner() {
  return (
    <div className="bg-[#7A4A3A] px-4 py-2 text-center text-[12px] font-bold text-white">
      ⚠️ وضع المعاينة المحلية — الأسعار من لقطة البيانات وليس من Supabase. أضف{' '}
      <code className="ltr">NEXT_PUBLIC_SUPABASE_URL</code> لتفعيل البيانات الحقيقية.
    </div>
  )
}
