import { describe, it, expect } from 'vitest'
import { equalSplit, exactSplit, percentSplit, sumSplits, netFromExpenses } from '../src/utils/splits.js'
import { toMinor, fromMinor } from '../src/utils/minorUnits.js'

describe('minorUnits', () => {
  it('parses without float errors', () => {
    expect(toMinor('12.5', 2)).toBe(1250)
    expect(toMinor('0.1', 2)).toBe(10)
    expect(toMinor('19.99', 2)).toBe(1999)
    expect(toMinor('100', 0)).toBe(100)
  })
  it('rejects bad input', () => {
    expect(toMinor('1.234', 2)).toBeNaN()
    expect(toMinor('-5', 2)).toBeNaN()
    expect(toMinor('abc', 2)).toBeNaN()
    expect(toMinor('', 2)).toBeNaN()
  })
  it('formats back to text', () => {
    expect(fromMinor(1250, 2)).toBe('12.50')
  })
})

describe('equalSplit', () => {
  it('splits evenly when it divides', () => {
    expect(equalSplit(3000, ['a', 'b', 'c'])).toEqual({ a: 1000, b: 1000, c: 1000 })
  })
  it('never loses a cent', () => {
    const s = equalSplit(1000, ['a', 'b', 'c'])
    expect(sumSplits(s)).toBe(1000)
    expect(Object.values(s).sort()).toEqual([333, 333, 334])
  })
  it('works for one person', () => {
    expect(equalSplit(500, ['a'])).toEqual({ a: 500 })
  })
  it('always adds up (many random cases)', () => {
    for (let i = 0; i < 500; i++) {
      const total = 1 + Math.floor(Math.random() * 1_000_000)
      const n = 1 + Math.floor(Math.random() * 12)
      const ids = Array.from({ length: n }, (_, k) => `u${k}`)
      expect(sumSplits(equalSplit(total, ids))).toBe(total)
    }
  })
  it('throws with nobody selected', () => {
    expect(() => equalSplit(100, [])).toThrow()
  })
})

describe('exactSplit', () => {
  it('accepts amounts that add up', () => {
    expect(exactSplit(1000, { a: 400, b: 600 })).toEqual({ a: 400, b: 600 })
  })
  it('rejects amounts that do not add up', () => {
    expect(() => exactSplit(1000, { a: 400, b: 500 })).toThrow()
  })
})

describe('percentSplit', () => {
  it('splits 50/50', () => {
    expect(percentSplit(1001, { a: 5000, b: 5000 })).toEqual({ a: 501, b: 500 })
  })
  it('handles 33.33 / 33.33 / 33.34', () => {
    const s = percentSplit(1000, { a: 3333, b: 3333, c: 3334 })
    expect(sumSplits(s)).toBe(1000)
  })
  it('rejects percentages that do not add to 100', () => {
    expect(() => percentSplit(1000, { a: 5000, b: 4000 })).toThrow()
  })
  it('always adds up (many random cases)', () => {
    for (let i = 0; i < 500; i++) {
      const total = 1 + Math.floor(Math.random() * 1_000_000)
      const cut1 = Math.floor(Math.random() * 10000)
      const cut2 = Math.floor(Math.random() * (10000 - cut1))
      const bps = { a: cut1, b: cut2, c: 10000 - cut1 - cut2 }
      expect(sumSplits(percentSplit(total, bps))).toBe(total)
    }
  })
})

describe('netFromExpenses', () => {
  it('payer is owed, others owe, and the total is zero', () => {
    const net = netFromExpenses([
      { paidBy: 'a', amountMinor: 3000, splits: { a: 1000, b: 1000, c: 1000 } },
    ])
    expect(net).toEqual({ a: 2000, b: -1000, c: -1000 })
  })
  it('ignores soft-deleted expenses', () => {
    const net = netFromExpenses([
      { paidBy: 'a', amountMinor: 3000, splits: { a: 3000 }, deleted: true },
    ])
    expect(net).toEqual({})
  })
})