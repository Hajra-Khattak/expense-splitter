import { fromMinor } from './minorUnits'

// Quote every cell, double the quotes. A leading = + - @ is prefixed with ' so a
// spreadsheet does not run it as a formula.
function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
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
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

// Runs in the browser, no server. The BOM makes Excel read UTF-8 correctly.
export function downloadCsv(filename, text) {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}