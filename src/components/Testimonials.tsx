import { QuoteIcon, StarIcon } from '@/components/icons'

const TESTIMONIALS = [
  {
    name: 'رنيم - عمان',
    product: 'ماسكارا Vitamin E',
    text: 'الماسكارا بتجنن! ما بتسيل وثابتة طول اليوم ورموشي صارت أقوى',
  },
  {
    name: 'لين - إربد',
    product: 'Magic Lip Oil - Peach',
    text: 'زيت الشفاه صار أساسي بشنتتي، ترطيب وريحة خوخ بتشهي',
  },
  {
    name: 'سارة - الزرقاء',
    product: 'Aloe Duo',
    text: 'غسول الألوفيرا خفف الحبوب عندي والجل يبرد البشرة فوراً',
  },
]

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-14 md:px-8 md:py-20">
      <div className="text-center">
        <h3 className="mx-auto mt-4 max-w-[20ch] text-[26px] font-extrabold leading-tight md:text-[34px]">
          عميلاتنا يحكين عن لمسة You &amp; Me
        </h3>
      </div>

      <div className="relative mt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[40px] bg-gradient-to-br from-[#FFD6E3]/30 to-[#FFE8D6]/30 blur-[30px]"
        />
        <div className="relative grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((entry) => (
            <figure
              key={entry.name}
              className="relative rounded-[24px] border border-sand bg-white p-6 shadow-[0_8px_30px_rgba(74,46,42,0.05)]"
            >
              <QuoteIcon className="h-6 w-6 text-rose/20" />
              <blockquote className="mt-3 text-[14px] leading-6 text-cocoa/80">“{entry.text}”</blockquote>
              <figcaption className="mt-5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold">{entry.name}</div>
                  <div className="text-[11px] text-cocoa/50">{entry.product}</div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StarIcon key={index} className="h-3.5 w-3.5 fill-gold text-gold" />
                  ))}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
