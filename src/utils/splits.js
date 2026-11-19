// export function splitEqual(total, userIds) {
//   const n = userIds.length;
//   const base = Math.floor(total / n);
//   const remainder = total - base * n;
//   return userIds.map((userId, i) => ({
//     userId,
//     amount: base + (i < remainder ? 1 : 0),
//   }));
// }


// Pure split logic. Every function returns { uid: minor units } that adds up to
// totalMinor EXACTLY (no cent is ever lost or invented).

export function sumSplits(splits) {
  return Object.values(splits).reduce((s, v) => s + v, 0)
}

// Equal split. The leftover cents go one each to the first people in uid order.
export function equalSplit(totalMinor, participantIds) {
  const ids = [...participantIds].sort()
  if (ids.length === 0) throw new Error('Pick at least one person')
  const base = Math.floor(totalMinor / ids.length)
  let extra = totalMinor - base * ids.length
  const out = {}
  for (const id of ids) {
    out[id] = base + (extra > 0 ? 1 : 0)
    if (extra > 0) extra--
  }
  return out
}

// Exact split. `amounts` is { uid: minor units }. Must already add up to the total.
export function exactSplit(totalMinor, amounts) {
  const sum = sumSplits(amounts)
  if (sum !== totalMinor) throw new Error('Amounts must add up to the total')
  return { ...amounts }
}

// Percent split. `basisPoints` is { uid: integer } where 10000 = 100%.
// (33.33% is 3333.) Uses the largest-remainder method so the total is exact.
export function percentSplit(totalMinor, basisPoints) {
  const ids = Object.keys(basisPoints).sort()
  const bpSum = ids.reduce((s, id) => s + basisPoints[id], 0)
  if (bpSum !== 10000) throw new Error('Percentages must add up to 100')

  const rows = ids.map((id) => {
    const product = totalMinor * basisPoints[id]
    return { id, share: Math.floor(product / 10000), frac: product % 10000 }
  })

  let left = totalMinor - rows.reduce((s, r) => s + r.share, 0)
  const byRemainder = [...rows].sort((a, b) => b.frac - a.frac || (a.id < b.id ? -1 : 1))
  for (const r of byRemainder) {
    if (left <= 0) break
    r.share++
    left--
  }
  return Object.fromEntries(rows.map((r) => [r.id, r.share]))
}

// Net position per person from a list of expenses: paid minus owed.
// Positive = is owed money, negative = owes money. Deleted expenses are ignored.
// (Used by tests now, and by balances.js in Phase 5.)
export function netFromExpenses(expenses) {
  const net = {}
  for (const e of expenses) {
    if (e.deleted) continue
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amountMinor
    for (const [id, v] of Object.entries(e.splits)) {
      net[id] = (net[id] ?? 0) - v
    }
  }
  return net
}