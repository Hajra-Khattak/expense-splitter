import { describe, it, expect } from 'vitest'
import { simplifyDebts } from '../src/utils/settleUp.js'
import { computeBalances } from '../src/utils/balances.js'
import { equalSplit } from '../src/utils/splits.js'

// Apply payments to a net map. The result should be all zeros.
function applyPayments(net, payments) {
  const out = { ...net }
  for (const p of payments) {
    out[p.from] = (out[p.from] ?? 0) + p.amountMinor
    out[p.to] = (out[p.to] ?? 0) - p.amountMinor
  }
  return out
}

const allZero = (net) => Object.values(net).every((v) => v === 0)

describe('simplifyDebts', () => {
  it('already settled: no payments', () => {
    expect(simplifyDebts({ a: 0, b: 0, c: 0 })).toEqual([])
    expect(simplifyDebts({})).toEqual([])
  })

  it('one debtor, one creditor: one payment', () => {
    expect(simplifyDebts({ a: 1200, b: -1200 })).toEqual([{ from: 'b', to: 'a', amountMinor: 1200 }])
  })

  it('matches the largest debtor with the largest creditor first', () => {
    const payments = simplifyDebts({ a: -500, b: -100, c: 600 })
    expect(payments[0]).toEqual({ from: 'a', to: 'c', amountMinor: 500 })
  })

  it('cycle A pays B, B pays C, C pays A cancels out completely', () => {
    const expenses = [
      { paidBy: 'a', amountMinor: 100, splits: { b: 100 } }, // b owes a
      { paidBy: 'b', amountMinor: 100, splits: { c: 100 } }, // c owes b
      { paidBy: 'c', amountMinor: 100, splits: { a: 100 } }, // a owes c
    ]
    const net = computeBalances(expenses)
    expect(net).toEqual({ a: 0, b: 0, c: 0 })
    expect(simplifyDebts(net)).toEqual([])
  })

  it('odd amounts: no cent is lost', () => {
    const net = { a: -333, b: -334, c: 667 }
    const payments = simplifyDebts(net)
    expect(payments).toHaveLength(2)
    expect(allZero(applyPayments(net, payments))).toBe(true)
  })

  it('never needs more than n - 1 payments, always clears everyone (random data)', () => {
    for (let run = 0; run < 300; run++) {
      const n = 2 + Math.floor(Math.random() * 9)
      const ids = Array.from({ length: n }, (_, i) => `u${i}`)
      const net = {}
      let total = 0
      ids.slice(0, -1).forEach((id) => {
        const v = Math.floor(Math.random() * 20001) - 10000
        net[id] = v
        total += v
      })
      net[ids[n - 1]] = -total // makes the total exactly 0

      const payments = simplifyDebts(net)
      expect(payments.length).toBeLessThanOrEqual(n - 1)
      expect(payments.every((p) => Number.isInteger(p.amountMinor) && p.amountMinor > 0)).toBe(true)
      expect(payments.every((p) => p.from !== p.to)).toBe(true)
      expect(allZero(applyPayments(net, payments))).toBe(true)
    }
  })

  it('works end to end with real expenses', () => {
    const expenses = [
      { paidBy: 'a', amountMinor: 9001, splits: equalSplit(9001, ['a', 'b', 'c', 'd']) },
      { paidBy: 'b', amountMinor: 2500, splits: equalSplit(2500, ['b', 'c']) },
    ]
    const net = computeBalances(expenses)
    expect(allZero(applyPayments(net, simplifyDebts(net)))).toBe(true)
  })
})