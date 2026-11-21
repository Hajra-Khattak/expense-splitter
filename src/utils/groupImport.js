import { CATEGORIES } from './categories'
import { currencyDigits, toMinor } from './minorUnits'
import { isRealDate } from './personalImport'

// Each expense is one write, plus one activity entry. 200 keeps the batch and the
// Firestore rules' document-read limit safe.
export const MAX_GROUP_IMPORT_ROWS = 200

const norm = (s) => String(s ?? '').trim().toLowerCase()

// Equal split. Leftover cents go to the first people in uid order. Adds up exactly.
export function equalSplitMinor(total, uids) {
  const sorted = [...uids].sort()
  const base = Math.floor(total / sorted.length)
  let rest = total - base * sorted.length
  const out = {}
  for (const id of sorted) {
    out[id] = base + (rest > 0 ? 1 : 0)
    if (rest > 0) rest--
  }
  return out
}

// Columns: Date, Description, Amount, Paid by are required.
// Category, Split between, Note are optional.
// "Split between" = member names separated by ; or the word all (empty means all).
// members: [{ id, name }]. Returns { valid, errors }.
export function parseGroupRows(rows, members, currency) {
  if (rows.length < 2) return { valid: [], errors: [{ line: 1, message: 'No data rows found' }] }
  if (rows.length - 1 > MAX_GROUP_IMPORT_ROWS) {
    return {
      valid: [],
      errors: [{ line: 1, message: `Too many rows (maximum ${MAX_GROUP_IMPORT_ROWS} per import)` }],
    }
  }

  const header = rows[0].map(norm)
  const col = (name) => header.indexOf(name)
  const c = {
    date: col('date'),
    description: col('description'),
    amount: col('amount'),
    paidBy: col('paid by'),
    category: col('category'),
    split: col('split between'),
    note: col('note'),
  }
  const missing = [
    ['date', 'Date'],
    ['description', 'Description'],
    ['amount', 'Amount'],
    ['paidBy', 'Paid by'],
  ]
    .filter(([k]) => c[k] === -1)
    .map(([, label]) => label)
  if (missing.length > 0) {
    return { valid: [], errors: [{ line: 1, message: `Missing column: ${missing.join(', ')}` }] }
  }

  const byName = {}
  for (const m of members) (byName[norm(m.name)] ??= []).push(m.id)
  const allIds = members.map((m) => m.id)
  const digits = currencyDigits(currency)
  const get = (r, i) => (i === -1 ? '' : String(r[i] ?? '').trim())

  const valid = []
  const errors = []

  rows.slice(1).forEach((r, n) => {
    const line = n + 2
    const fail = (message) => errors.push({ line, message })

    const date = get(r, c.date)
    if (!isRealDate(date)) return fail('Date must be YYYY-MM-DD')

    const description = get(r, c.description).replace(/^'(?=[=+\-@])/, '')
    if (description.length < 1 || description.length > 100) {
      return fail('Description must be 1 to 100 characters')
    }

    const amountMinor = toMinor(get(r, c.amount), digits)
    if (!Number.isInteger(amountMinor) || amountMinor <= 0 || amountMinor > 100000000000) {
      return fail('Amount must be a positive number with at most 2 decimals')
    }

    const resolve = (name) => {
      const ids = byName[norm(name)] ?? []
      if (ids.length === 0) return { error: `"${name}" is not a member of this group` }
      if (ids.length > 1) return { error: `More than one member is named "${name}"` }
      return { id: ids[0] }
    }

    const payer = resolve(get(r, c.paidBy))
    if (payer.error) return fail(`Paid by: ${payer.error}`)

    let participants = allIds
    const splitText = get(r, c.split)
    if (splitText && norm(splitText) !== 'all') {
      const ids = new Set()
      for (const name of splitText.split(/[;|]/).map((s) => s.trim()).filter(Boolean)) {
        const p = resolve(name)
        if (p.error) return fail(`Split between: ${p.error}`)
        ids.add(p.id)
      }
      participants = [...ids]
    }
    if (participants.length < 1 || participants.length > 50) {
      return fail('Split between needs 1 to 50 people')
    }

    const catText = norm(get(r, c.category))
    const category =
      CATEGORIES.find((x) => x.id === catText || norm(x.label) === catText)?.id ?? 'other'

    const note = get(r, c.note)
    if (note.length > 300) return fail('Note is longer than 300 characters')

    valid.push({
      description,
      amountMinor,
      category,
      date,
      paidBy: payer.id,
      participants,
      splitType: 'equal',
      splits: equalSplitMinor(amountMinor, participants),
      note,
    })
  })

  return { valid, errors }
}