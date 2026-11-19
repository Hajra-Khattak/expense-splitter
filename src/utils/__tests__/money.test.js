import { describe, expect, it } from 'vitest'
import { formatMoney, fromMinor, toMinor } from '../money'

describe('toMinor', () => {
  it('converts valid strings', () => {
    expect(toMinor('12.50')).toBe(1250)
    expect(toMinor('12.5')).toBe(1250)
    expect(toMinor('12')).toBe(1200)
    expect(toMinor('0.1')).toBe(10)
    expect(toMinor('0.07')).toBe(7)
    expect(toMinor('19.99')).toBe(1999)
    expect(toMinor('0')).toBe(0)
    expect(toMinor(' 5 ')).toBe(500)
  })

  it('converts plain numbers', () => {
    expect(toMinor(12.5)).toBe(1250)
    expect(toMinor(3)).toBe(300)
  })

  it('rejects invalid input with null', () => {
    expect(toMinor('')).toBeNull()
    expect(toMinor('abc')).toBeNull()
    expect(toMinor('-5')).toBeNull()
    expect(toMinor('1,000')).toBeNull()
    expect(toMinor('1.')).toBeNull()
    expect(toMinor('.5')).toBeNull()
    expect(toMinor(null)).toBeNull()
    expect(toMinor(undefined)).toBeNull()
    expect(toMinor(NaN)).toBeNull()
  })

  it('rejects more than 2 decimals instead of rounding', () => {
    expect(toMinor('1.005')).toBeNull()
    expect(toMinor(0.1 + 0.2)).toBeNull() // 0.30000000000000004
  })

  it('rejects numbers too large to be safe integers', () => {
    expect(toMinor('999999999999999999')).toBeNull()
  })
})

describe('fromMinor', () => {
  it('formats with 2 decimals', () => {
    expect(fromMinor(1250)).toBe('12.50')
    expect(fromMinor(7)).toBe('0.07')
    expect(fromMinor(0)).toBe('0.00')
    expect(fromMinor(100)).toBe('1.00')
  })

  it('handles negative values', () => {
    expect(fromMinor(-1250)).toBe('-12.50')
    expect(fromMinor(-5)).toBe('-0.05')
  })

  it('throws on non-integers', () => {
    expect(() => fromMinor(12.5)).toThrow(TypeError)
    expect(() => fromMinor('1250')).toThrow(TypeError)
  })

  it('round trips', () => {
    for (const text of ['0.01', '0.10', '12.50', '999.99', '1000.00']) {
      expect(fromMinor(toMinor(text))).toBe(text)
    }
  })
})

describe('formatMoney', () => {
  it('formats with the currency code and 2 decimals', () => {
    const text = formatMoney(125000, 'USD')
    expect(text).toMatch(/1,250\.00/)
    expect(text).toMatch(/\$/)
  })

  it('keeps cents', () => {
    expect(formatMoney(7, 'USD')).toMatch(/0\.07/)
  })

  it('throws on non-integers', () => {
    expect(() => formatMoney(12.5, 'USD')).toThrow(TypeError)
  })
})