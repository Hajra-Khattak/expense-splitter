// Greedy debt simplification with two max-heaps.
// Each step pays the biggest debtor's debt to the biggest creditor, so at least one
// person is fully settled per payment: at most n - 1 payments for n people.

// "a is above b": bigger amount first, ties broken by id so results are repeatable.
const higher = (a, b) => a.amount > b.amount || (a.amount === b.amount && a.id < b.id)

class MaxHeap {
  constructor() {
    this.items = []
  }

  get size() {
    return this.items.length
  }

  push(item) {
    const a = this.items
    a.push(item)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!higher(a[i], a[parent])) break
      ;[a[i], a[parent]] = [a[parent], a[i]]
      i = parent
    }
  }

  pop() {
    const a = this.items
    if (a.length === 0) return undefined
    const top = a[0]
    const last = a.pop()
    if (a.length > 0) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let best = i
        if (l < a.length && higher(a[l], a[best])) best = l
        if (r < a.length && higher(a[r], a[best])) best = r
        if (best === i) break
        ;[a[i], a[best]] = [a[best], a[i]]
        i = best
      }
    }
    return top
  }
}

// net: { uid: minor units }, positive = is owed, negative = owes.
// Returns [{ from, to, amountMinor }] meaning "from pays to".
export function simplifyDebts(net) {
  const creditors = new MaxHeap()
  const debtors = new MaxHeap()

  for (const [id, value] of Object.entries(net)) {
    if (value > 0) creditors.push({ id, amount: value })
    else if (value < 0) debtors.push({ id, amount: -value })
  }

  const payments = []
  while (creditors.size > 0 && debtors.size > 0) {
    const c = creditors.pop()
    const d = debtors.pop()
    const pay = Math.min(c.amount, d.amount)
    payments.push({ from: d.id, to: c.id, amountMinor: pay })
    if (c.amount > pay) creditors.push({ id: c.id, amount: c.amount - pay })
    if (d.amount > pay) debtors.push({ id: d.id, amount: d.amount - pay })
  }
  return payments
}