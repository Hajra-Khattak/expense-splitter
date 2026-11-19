// Money is stored as integer minor units (12.50 -> 1250). Never store floats.
// All CURRENCIES in groupSchema.js use 2 decimals, so 100 is fixed for now.

// Digits, optionally followed by a dot and 1 or 2 digits. No sign, no commas, no spaces inside.
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

// "12.50" or 12.5 -> 1250. Returns null for anything invalid:
// empty, text, negative, more than 2 decimals ("1.005"), or too large.
// It works on the TEXT, not by multiplying, so there is no float error.
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

// 1250 -> "12.50". Good for filling an input. Throws if the value is not an integer,
// because a float here means a bug somewhere else.
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

// 1250, "PKR" -> "PKR 1,250.00" (exact text depends on the locale). Display only.
export function formatMoney(minor, currency = 'PKR', locale = 'en') {
  if (!Number.isSafeInteger(minor)) {
    throw new TypeError('formatMoney needs an integer number of minor units')
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(minor / 100)
}