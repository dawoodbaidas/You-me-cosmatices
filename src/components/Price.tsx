import { formatAmount } from '@/lib/format'

export default function Price({ value, currency, oldPrice }: { value: number; currency: string; oldPrice?: number | null }) {
  return <strong className="store-price" dir="ltr">{oldPrice != null && <del>{formatAmount(oldPrice)} </del>}<span>{formatAmount(value)}</span><small>{currency.toUpperCase() === 'JOD' ? 'د.أ' : currency}</small></strong>
}
