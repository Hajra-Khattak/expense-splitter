import { currencyDigits, fromMinor } from './minorUnits'


function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

export function expensesToCsv(expenses, nameOf, digits = 2) {
  const header = ['Date', 'Description', 'Category', 'Paid by', 'Amount', 'Split type', 'Note']
  const rows = expenses
    .filter((e) => !e.deleted)
    .map((e) => [
      e.date,
      e.description,
      e.category,
      nameOf(e.paidBy),
      fromMinor(e.amountMinor, digits),
      e.splitType,
      e.note ?? '',
    ])
  return toCsv(header, rows)
}


export function personalExpensesToCsv(items) {
  const header = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Note']
  const rows = items.map((e) => [
    e.date,
    e.description,
    e.category,
    fromMinor(e.amountMinor, currencyDigits(e.currency)),
    e.currency,
    e.note ?? '',
  ])
  return toCsv(header, rows)
}

export function downloadCsv(filename, text) {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}


export function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = firstLine.includes(',') ? ',' : firstLine.includes(';') ? ';' : ','

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}