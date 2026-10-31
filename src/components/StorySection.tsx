import Image from 'next/image'

export default function StorySection({ productCount }: { productCount: number }) {
  return <section id="story" className="brand-story">
    <div className="story-word" aria-hidden="true" dir="ltr">YOU. ME. BEAUTY.</div>

    <div className="story-grid">
      <div className="story-portrait">
        <Image src="/products/hero.webp" alt="تفاصيل من عالم You & Me" fill sizes="(max-width: 767px) 82vw, 42vw" />
        <span className="story-portrait-caption" dir="ltr">A NOTE ON BEAUTY.</span>
        <span className="story-portrait-index" dir="ltr">EST. 2019 / AMMAN</span>
      </div>

      <div className="story-copy">
        <p className="scene-label">عن العلامة</p>
        <h2>تفاصيل صغيرة،<br /><em>فرق كبير.</em></h2>
        <p>اختيارات من العناية والعطور والمكياج، تجمعها فكرة واحدة: أن يكون كل شيء أقرب لذوقك.</p>

        <div className="story-facts">
          <div><strong>{productCount}</strong><span>اختيار<br />في المجموعة</span></div>
          <div><strong dir="ltr">24H</strong><span>تجهيز<br />سريع للطلب</span></div>
          <div><strong>JO</strong><span>توصيل<br />لكل الأردن</span></div>
        </div>

        <span className="story-signature" dir="ltr">Yours, You &amp; Me</span>
      </div>
    </div>
  </section>
}
