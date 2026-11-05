export const formatJod = (value: number, currency = 'JOD') =>
  `${value.toFixed(Math.round(value * 1000) % 10 ? 3 : 2)} ${currency.toUpperCase() === 'JOD' ? 'د.أ' : currency}`

export const discountPercent = (price: number, oldPrice: number | null) => {
  if (!oldPrice || oldPrice <= price) return null
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}
