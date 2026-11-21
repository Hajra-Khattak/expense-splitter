const live = (expenses) => expenses.filter((e) => !e.deleted)


export function spendingByCategory(expenses) {
  const totals = {}
  for (const e of live(expenses)) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amountMinor
  }
  return Object.entries(totals)
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor)
}

export function spendingByMonth(expenses) {
  const totals = {}
  for (const e of live(expenses)) {
    const month = e.date.slice(0, 7)
    totals[month] = (totals[month] ?? 0) + e.amountMinor
  }
  return Object.entries(totals)
    .map(([month, amountMinor]) => ({ month, amountMinor }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
}


export function perMemberSummary(expenses) {
  const rows = {}
  const row = (id) => (rows[id] ??= { id, paid: 0, share: 0 })

  for (const e of live(expenses)) {
    row(e.paidBy).paid += e.amountMinor
    for (const [id, v] of Object.entries(e.splits)) row(id).share += v
  }
  return Object.values(rows)
    .map((r) => ({ ...r, difference: r.paid - r.share }))
    .sort((a, b) => b.paid - a.paid)
}