export default function Price({ value, currency }: { value: number; currency: string }) {
  return <strong className="store-price" dir="ltr"><span>{value.toFixed(2)}</span><small>{currency.toUpperCase() === 'JOD' ? 'د.أ' : currency}</small></strong>
}
