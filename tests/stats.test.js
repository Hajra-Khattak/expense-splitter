import { describe, expect, it } from 'vitest'
import { perMemberSummary, spendingByCategory, spendingByMonth } from '../src/utils/stats'

const expenses = [
  { category: 'food', date: '2026-10-05', amountMinor: 20000, paidBy: 'A', splits: { A: 8000, B: 12000 } },
  { category: 'food', date: '2026-11-19', amountMinor: 5000, paidBy: 'B', splits: { A: 2500, B: 2500 } },
  { category: 'rent', date: '2026-11-20', amountMinor: 15000, paidBy: 'A', splits: { A: 7500, B: 7500 } },
  { category: 'rent', date: '2026-11-21', amountMinor: 99999, paidBy: 'A', splits: { A: 99999 }, deleted: true },
]

describe('spendingByCategory', () => {
  it('sums per category, biggest first, ignoring deleted', () => {
    expect(spendingByCategory(expenses)).toEqual([
      { category: 'food', amountMinor: 25000 },
      { category: 'rent', amountMinor: 15000 },
    ])
  })
  it('returns an empty list for no expenses', () => {
    expect(spendingByCategory([])).toEqual([])
  })
})

describe('spendingByMonth', () => {
  it('groups by YYYY-MM, oldest first, ignoring deleted', () => {
    expect(spendingByMonth(expenses)).toEqual([
      { month: '2026-10', amountMinor: 20000 },
      { month: '2026-11', amountMinor: 20000 },
    ])
  })
})

describe('perMemberSummary', () => {
  const rows = perMemberSummary(expenses)
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]))

  it('computes paid, share and difference', () => {
    expect(byId.A).toMatchObject({ paid: 35000, share: 18000, difference: 17000 })
    expect(byId.B).toMatchObject({ paid: 5000, share: 22000, difference: -17000 })
  })
  it('differences add up to 0', () => {
    expect(rows.reduce((s, r) => s + r.difference, 0)).toBe(0)
  })
})