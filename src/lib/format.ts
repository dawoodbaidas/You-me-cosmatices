export const formatJod = (value: number, currency = 'JOD') =>
  `${value.toFixed(2)} ${currency.toUpperCase() === 'JOD' ? 'د.أ' : currency}`

export const discountPercent = (price: number, oldPrice: number | null) => {
  if (!oldPrice || oldPrice <= price) return null
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}
