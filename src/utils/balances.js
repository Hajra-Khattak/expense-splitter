// Balances are NEVER stored. They are computed from expenses and settlements.
// Sign convention: positive = is owed money, negative = owes money.

// Net balance per person. Invariant: the values always add up to 0.
export function computeBalances(expenses, settlements = []) {
  const net = {}
  const add = (id, v) => {
    net[id] = (net[id] ?? 0) + v
  }

  for (const e of expenses) {
    if (e.deleted) continue
    add(e.paidBy, e.amountMinor)
    for (const [id, v] of Object.entries(e.splits)) add(id, -v)
  }
  // A settlement "from pays to": the payer owes less, the receiver is owed less.
  for (const s of settlements) {
    add(s.from, s.amountMinor)
    add(s.to, -s.amountMinor)
  }
  return net
}

// Who owes whom BEFORE simplification: one line per pair of people.
// [{ from, to, amountMinor }] means "from owes to".
export function pairwiseDebts(expenses, settlements = []) {
  const owes = {} // owes[a][b] = how much a owes b
  const add = (a, b, v) => {
    if (!owes[a]) owes[a] = {}
    owes[a][b] = (owes[a][b] ?? 0) + v
  }

  for (const e of expenses) {
    if (e.deleted) continue
    for (const [id, v] of Object.entries(e.splits)) {
      if (id !== e.paidBy) add(id, e.paidBy, v)
    }
  }
  for (const s of settlements) add(s.from, s.to, -s.amountMinor)

  const out = []
  const seen = new Set()
  for (const a of Object.keys(owes)) {
    for (const b of Object.keys(owes[a])) {
      const key = [a, b].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const diff = (owes[a]?.[b] ?? 0) - (owes[b]?.[a] ?? 0)
      if (diff > 0) out.push({ from: a, to: b, amountMinor: diff })
      else if (diff < 0) out.push({ from: b, to: a, amountMinor: -diff })
    }
  }
  return out.sort((x, y) => y.amountMinor - x.amountMinor)
}

// The most `from` can sensibly pay `to`: limited by what `from` owes overall and
// what `to` is owed overall. Works for simplified suggestions too.
export function maxPayment(net, from, to) {
  const owes = -(net[from] ?? 0)
  const owed = net[to] ?? 0
  return owes > 0 && owed > 0 ? Math.min(owes, owed) : 0
}

// Dev/admin check (replaces a paid Cloud Function). There is nothing stored to compare
// with, so it recomputes the balances two independent ways and checks every invariant.
export function verifyBalances(expenses, settlements = []) {
  const problems = []
  const live = expenses.filter((e) => !e.deleted)

  for (const e of live) {
    const label = `Expense "${e.description}"`
    if (!Number.isInteger(e.amountMinor) || e.amountMinor <= 0) {
      problems.push(`${label} has an invalid amount`)
    }
    const values = Object.values(e.splits ?? {})
    if (values.some((v) => !Number.isInteger(v) || v < 0)) {
      problems.push(`${label} has an invalid split value`)
    }
    const sum = values.reduce((s, v) => s + v, 0)
    if (sum !== e.amountMinor) {
      problems.push(`${label}: splits add up to ${sum}, not ${e.amountMinor}`)
    }
  }

  for (const s of settlements) {
    if (!Number.isInteger(s.amountMinor) || s.amountMinor <= 0) {
      problems.push(`A settlement on ${s.date} has an invalid amount`)
    }
    if (s.from === s.to) problems.push(`A settlement on ${s.date} pays a person to themselves`)
  }

  const net = computeBalances(live, settlements)
  const total = Object.values(net).reduce((s, v) => s + v, 0)
  if (total !== 0) problems.push(`Balances add up to ${total}, expected 0`)

  // Second method: rebuild every balance from the pairwise debts.
  const fromPairs = {}
  for (const p of pairwiseDebts(live, settlements)) {
    fromPairs[p.to] = (fromPairs[p.to] ?? 0) + p.amountMinor
    fromPairs[p.from] = (fromPairs[p.from] ?? 0) - p.amountMinor
  }
  for (const id of new Set([...Object.keys(net), ...Object.keys(fromPairs)])) {
    if ((net[id] ?? 0) !== (fromPairs[id] ?? 0)) {
      problems.push(`Two ways of computing the balance of ${id} disagree`)
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    net,
    expenseCount: live.length,
    settlementCount: settlements.length,
  }
}