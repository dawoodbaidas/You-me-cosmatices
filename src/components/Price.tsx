export default function Price({ value, currency, oldPrice }: { value: number; currency: string; oldPrice?: number | null }) {
  const digits = Math.round(value * 1000) % 10 ? 3 : 2
  return <strong className="store-price" dir="ltr">{oldPrice != null && <del>{oldPrice.toFixed(Math.round(oldPrice * 1000) % 10 ? 3 : 2)} </del>}<span>{value.toFixed(digits)}</span><small>{currency.toUpperCase() === 'JOD' ? 'د.أ' : currency}</small></strong>
}
