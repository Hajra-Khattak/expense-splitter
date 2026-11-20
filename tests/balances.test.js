import { describe, it, expect } from 'vitest'
import { computeBalances, pairwiseDebts, maxPayment, verifyBalances } from '../src/utils/balances.js'
import { equalSplit } from '../src/utils/splits.js'

const expense = (paidBy, amountMinor, participants) => ({
  description: 'x',
  paidBy,
  amountMinor,
  participants,
  splits: equalSplit(amountMinor, participants),
})

const sum = (net) => Object.values(net).reduce((s, v) => s + v, 0)

describe('computeBalances', () => {
  it('is empty with no expenses', () => {
    expect(computeBalances([], [])).toEqual({})
  })

  it('payer is owed, the others owe', () => {
    const net = computeBalances([expense('a', 3000, ['a', 'b', 'c'])])
    expect(net).toEqual({ a: 2000, b: -1000, c: -1000 })
  })

  it('a full settlement brings everyone to 0', () => {
    const net = computeBalances(
      [expense('a', 2000, ['a', 'b'])],
      [{ from: 'b', to: 'a', amountMinor: 1000 }]
    )
    expect(net).toEqual({ a: 0, b: 0 })
  })

  it('a partial settlement leaves the rest', () => {
    const net = computeBalances(
      [expense('a', 2000, ['a', 'b'])],
      [{ from: 'b', to: 'a', amountMinor: 400 }]
    )
    expect(net).toEqual({ a: 600, b: -600 })
  })

  it('ignores deleted expenses', () => {
    const net = computeBalances([{ ...expense('a', 3000, ['a', 'b']), deleted: true }])
    expect(net).toEqual({})
  })

  it('INVARIANT: all balances always add up to 0 (random data)', () => {
    const people = ['a', 'b', 'c', 'd', 'e']
    for (let run = 0; run < 300; run++) {
      const expenses = []
      for (let i = 0; i < 1 + Math.floor(Math.random() * 15); i++) {
        const paidBy = people[Math.floor(Math.random() * people.length)]
        const participants = people.filter(() => Math.random() > 0.4)
        if (participants.length === 0) participants.push(paidBy)
        expenses.push(expense(paidBy, 1 + Math.floor(Math.random() * 100000), participants))
      }
      const settlements = []
      for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
        const from = people[Math.floor(Math.random() * people.length)]
        const to = people.filter((p) => p !== from)[Math.floor(Math.random() * 4)]
        settlements.push({ from, to, amountMinor: 1 + Math.floor(Math.random() * 5000) })
      }
      expect(sum(computeBalances(expenses, settlements))).toBe(0)
    }
  })
})

describe('pairwiseDebts', () => {
  it('lists who owes whom', () => {
    const pairs = pairwiseDebts([expense('a', 3000, ['a', 'b', 'c'])])
    expect(pairs).toHaveLength(2)
    expect(pairs).toContainEqual({ from: 'b', to: 'a', amountMinor: 1000 })
    expect(pairs).toContainEqual({ from: 'c', to: 'a', amountMinor: 1000 })
  })

  it('nets two opposite debts between the same pair', () => {
    const pairs = pairwiseDebts([
      expense('a', 2000, ['a', 'b']), // b owes a 1000
      expense('b', 600, ['a', 'b']), // a owes b 300
    ])
    expect(pairs).toEqual([{ from: 'b', to: 'a', amountMinor: 700 }])
  })

  it('shows a cycle as three debts (not simplified)', () => {
    const pairs = pairwiseDebts([
      expense('a', 100, ['b']),
      expense('b', 100, ['c']),
      expense('c', 100, ['a']),
    ])
    expect(pairs).toHaveLength(3)
  })

  it('removes a pair once it is settled', () => {
    const pairs = pairwiseDebts(
      [expense('a', 2000, ['a', 'b'])],
      [{ from: 'b', to: 'a', amountMinor: 1000 }]
    )
    expect(pairs).toEqual([])
  })
})

describe('maxPayment', () => {
  const net = { a: 600, b: -400, c: -200 }
  it('is the smaller of what one owes and the other is owed', () => {
    expect(maxPayment(net, 'b', 'a')).toBe(400)
    expect(maxPayment(net, 'c', 'a')).toBe(200)
  })
  it('is 0 in the wrong direction or between two debtors', () => {
    expect(maxPayment(net, 'a', 'b')).toBe(0)
    expect(maxPayment(net, 'b', 'c')).toBe(0)
  })
})

describe('verifyBalances', () => {
  it('passes for good data', () => {
    const r = verifyBalances(
      [expense('a', 3001, ['a', 'b', 'c']), expense('b', 999, ['a', 'b'])],
      [{ from: 'c', to: 'a', amountMinor: 500, date: '2026-11-19' }]
    )
    expect(r.ok).toBe(true)
    expect(r.problems).toEqual([])
  })

  it('catches splits that do not add up to the amount', () => {
    const bad = { ...expense('a', 1000, ['a', 'b']), splits: { a: 400, b: 500 } }
    const r = verifyBalances([bad])
    expect(r.ok).toBe(false)
    expect(r.problems.length).toBeGreaterThan(0)
  })

  it('catches a settlement that pays someone to themselves', () => {
    const r = verifyBalances([], [{ from: 'a', to: 'a', amountMinor: 100, date: '2026-11-19' }])
    expect(r.ok).toBe(false)
  })
})