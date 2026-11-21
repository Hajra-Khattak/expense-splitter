import { CATEGORIES } from './categories'
import { currencyDigits, toMinor } from './minorUnits'
import { PERSONAL_CURRENCIES } from './personalSchema'


export const MAX_IMPORT_ROWS = 500 

const norm = (s) => String(s ?? '').trim().toLowerCase()

export function isRealDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const [y, m, d] = text.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}


export function parsePersonalRows(rows, defaultCurrency = 'PKR') {
  if (rows.length < 2) return { valid: [], errors: [{ line: 1, message: 'No data rows found' }] }
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return {
      valid: [],
      errors: [{ line: 1, message: `Too many rows (maximum ${MAX_IMPORT_ROWS} per import)` }],
    }
  }

  const header = rows[0].map(norm)
  const col = (name) => header.indexOf(name)
  const c = {
    date: col('date'),
    description: col('description'),
    amount: col('amount'),
    category: col('category'),
    currency: col('currency'),
    note: col('note'),
  }
  const missing = ['date', 'description', 'amount'].filter((k) => c[k] === -1)
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [{ line: 1, message: `Missing column: ${missing.join(', ')}` }],
    }
  }

  const valid = []
  const errors = []
  const get = (r, i) => (i === -1 ? '' : String(r[i] ?? '').trim())

  rows.slice(1).forEach((r, n) => {
    const line = n + 2
    const fail = (message) => errors.push({ line, message })

    const date = get(r, c.date)
    if (!isRealDate(date)) return fail('Date must be YYYY-MM-DD')

    
    const description = get(r, c.description).replace(/^'(?=[=+\-@])/, '')
    if (description.length < 1 || description.length > 100) {
      return fail('Description must be 1 to 100 characters')
    }

    const currencyText = get(r, c.currency).toUpperCase()
    const currency = currencyText || defaultCurrency
    if (!PERSONAL_CURRENCIES.includes(currency)) return fail(`Unknown currency "${currencyText}"`)

    const amountMinor = toMinor(get(r, c.amount), currencyDigits(currency))
    if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > 100000000000) {
      return fail('Amount must be a positive number with at most 2 decimals')
    }

    const catText = norm(get(r, c.category))
    const category =
      CATEGORIES.find((x) => x.id === catText || norm(x.label) === catText)?.id ?? 'other'

    const note = get(r, c.note)
    if (note.length > 300) return fail('Note is longer than 300 characters')

    valid.push({ description, amountMinor, category, date, currency, note })
  })

  return { valid, errors }
}