import Image from 'next/image'
import butterfly from '../../public/brand/logo-butterfly@2x.png'

export default function Logo({ compact = false, preload = false }: { compact?: boolean; preload?: boolean }) {
  return (
    <span className={compact ? 'ym-logo ym-logo--compact' : 'ym-logo'} dir="ltr">
      <Image
        className="ym-logo__butterfly"
        src={butterfly}
        alt=""
        width={650}
        height={551}
        sizes="(min-width: 1024px) 60px, 40px"
        preload={preload}
        fetchPriority={preload ? 'high' : undefined}
        aria-hidden="true"
      />
      <span className="ym-logo__words">
        <span className="ym-logo__line">
          <span className="ym-logo__rule" aria-hidden="true" />
          <span className="ym-logo__name">YOU &amp; ME</span>
          <span className="ym-logo__rule" aria-hidden="true" />
        </span>
        <span className="ym-logo__cosmetics">COSMETICS</span>
      </span>
    </span>
  )
}
