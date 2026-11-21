
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/


export function toMinor(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null
    input = String(input)
  }
  if (typeof input !== 'string') return null

  const text = input.trim()
  if (!MONEY_PATTERN.test(text)) return null

  const [whole, fraction = ''] = text.split('.')
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}


export function fromMinor(minor) {
  if (!Number.isSafeInteger(minor)) {
    throw new TypeError('fromMinor needs an integer number of minor units')
  }
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, '0')
  return `${sign}${whole}.${fraction}`
}

// 1250, "PKR" -> "PKR 1,250.00" 
export function formatMoney(minor, currency = 'PKR', locale = 'en') {
  if (!Number.isSafeInteger(minor)) {
    throw new TypeError('formatMoney needs an integer number of minor units')
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(minor / 100)
}