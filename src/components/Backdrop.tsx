/** Fixed pastel gradient wash behind the whole page (original markup). */
export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#FFD6E3] to-[#FFB0C8] opacity-60 blur-[80px]" />
      <div className="absolute top-[30%] -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#FFE8D6] to-[#FFD8C2] opacity-70 blur-[90px]" />
      <div className="absolute bottom-0 right-1/3 h-[400px] w-[400px] rounded-full bg-[#E8F5E0] opacity-50 blur-[70px]" />
    </div>
  )
}
