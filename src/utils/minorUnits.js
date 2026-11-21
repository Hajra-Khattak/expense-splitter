
export function currencyDigits(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits
  } catch {
    return 2
  }
}

export function toMinor(text, digits = 2) {
  const clean = String(text ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(clean)) return NaN
  const [whole, frac = ''] = clean.split('.')
  if (frac.length > digits) return NaN
  return Number(whole) * 10 ** digits + Number(frac.padEnd(digits, '0'))
}

// 1250 -> "12.50" 
export function fromMinor(minor, digits = 2) {
  return (minor / 10 ** digits).toFixed(digits)
}

// 1250 -> "$12.50" 
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