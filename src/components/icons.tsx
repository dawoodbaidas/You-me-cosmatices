import type { SVGProps } from 'react'

/**
 * Inline icon set matching the Lucide glyphs used by the original prototype.
 * Inlined instead of adding a dependency so the bundle stays small.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const LockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const BagIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)

export const HeartIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

export const HeartFilledIcon = (props: IconProps) => (
  <svg {...base({ fill: 'currentColor', ...props })}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

export const StarIcon = (props: IconProps) => (
  <svg {...base({ fill: 'currentColor', strokeWidth: 0, ...props })}>
    <path d="M11.5 2.6a.5.5 0 0 1 .9 0l2 4.1 4.5.7a.5.5 0 0 1 .3.9l-3.3 3.2.8 4.5a.5.5 0 0 1-.7.5L12 16.4l-4 2.1a.5.5 0 0 1-.7-.5l.8-4.5-3.3-3.2a.5.5 0 0 1 .3-.9l4.5-.7Z" />
  </svg>
)

export const QuoteIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1a4 4 0 0 1-4 4" />
    <path d="M8 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1a4 4 0 0 1-4 4" />
  </svg>
)

export const SparklesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3-1.9 4.8a2 2 0 0 1-1.3 1.3L4 11l4.8 1.9a2 2 0 0 1 1.3 1.3L12 19l1.9-4.8a2 2 0 0 1 1.3-1.3L20 11l-4.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </svg>
)

export const ArrowIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export const TruckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" />
    <path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
)

export const ShieldIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1 1 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const CardIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <path d="M2 10h20" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 12h14M12 5v14" />
  </svg>
)

export const MinusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 12h14" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
)

export const LogOutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m16 17 5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
  </svg>
)

export const PencilIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const MailIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
)

export const WhatsappIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M17.5 14.4c-.3-.15-1.75-.86-2-.96-.28-.1-.47-.15-.66.15s-.76.95-.93 1.15c-.17.2-.34.22-.63.08a8.2 8.2 0 0 1-2.4-1.48 9 9 0 0 1-1.68-2.07c-.17-.3 0-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.66-1.6-.9-2.19-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.5.07-.77.38-.26.3-1 .98-1 2.4s1.03 2.78 1.18 2.97c.15.2 2.03 3.1 4.92 4.35.69.3 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.7-.7 1.94-1.37.24-.68.24-1.25.17-1.37-.07-.13-.26-.2-.55-.35Z" />
    <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.4-.2-2.9.8.8-2.8-.2-.4A8.2 8.2 0 0 1 12 3.8Z" />
  </svg>
)

export const FacebookIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
  </svg>
)

export const InstagramIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const RefreshIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 4v4h-4M3 20v-4h4" />
  </svg>
)

export const AlertIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
