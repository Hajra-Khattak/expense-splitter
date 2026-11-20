export const SORTS = [
  { id: 'date-desc', label: 'Newest first' },
  { id: 'date-asc', label: 'Oldest first' },
  { id: 'amount-desc', label: 'Highest amount' },
  { id: 'amount-asc', label: 'Lowest amount' },
]

export const EMPTY_FILTERS = {
  text: '',
  category: 'all',
  paidBy: 'all',
  from: '',
  to: '',
  sort: 'date-desc',
}

// Works only on the expenses already loaded in the browser (no extra reads).
// Dates are YYYY-MM-DD strings, so plain string comparison is correct.
export function filterExpenses(expenses, f) {
  const text = f.text.trim().toLowerCase()

  const rows = expenses.filter((e) => {
    if (text && !`${e.description} ${e.note ?? ''}`.toLowerCase().includes(text)) return false
    if (f.category !== 'all' && e.category !== f.category) return false
    if (f.paidBy !== 'all' && e.paidBy !== f.paidBy) return false
    if (f.from && e.date < f.from) return false
    if (f.to && e.date > f.to) return false
    return true
  })

  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  const sorters = {
    'date-desc': (a, b) => byDate(b, a),
    'date-asc': byDate,
    'amount-desc': (a, b) => b.amountMinor - a.amountMinor,
    'amount-asc': (a, b) => a.amountMinor - b.amountMinor,
  }
  return rows.sort(sorters[f.sort] ?? sorters['date-desc'])
}