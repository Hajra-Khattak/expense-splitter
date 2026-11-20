// Money is ALWAYS stored as integer minor units (12.50 -> 1250). Format only for display.

// How many decimals the currency uses (USD 2, JPY 0, KWD 3).
export function currencyDigits(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits
  } catch {
    return 2
  }
}

// "12.5" -> 1250. Returns NaN for anything that is not a plain positive number
// with at most `digits` decimals. No floats are used, so there is no rounding error.
export function toMinor(text, digits = 2) {
  const clean = String(text ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(clean)) return NaN
  const [whole, frac = ''] = clean.split('.')
  if (frac.length > digits) return NaN
  return Number(whole) * 10 ** digits + Number(frac.padEnd(digits, '0'))
}

// 1250 -> "12.50" (plain text for form inputs)
export function fromMinor(minor, digits = 2) {
  return (minor / 10 ** digits).toFixed(digits)
}

// 1250 -> "$12.50" (display)
export function formatMinor(minor, currency) {
  const digits = currencyDigits(currency)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
      minor / 10 ** digits
    )
  } catch {
    return (minor / 10 ** digits).toFixed(digits)
  }
}