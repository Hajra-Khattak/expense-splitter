import { describe, expect, it } from 'vitest'
import { getInitials } from './getInitials'

describe('getInitials', () => {
  it('uses the first letters of the first and last word', () => {
    expect(getInitials('Ali Khan')).toBe('AK')
  })

  it('uses a single letter for a single word', () => {
    expect(getInitials('ali')).toBe('A')
  })

  it('ignores extra spaces and middle names', () => {
    expect(getInitials('  ali   raza  khan ')).toBe('AK')
  })

  it('returns ? for empty, blank or missing names', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
  })

  it('handles non-Latin and accented letters', () => {
    expect(getInitials('ñandú lópez')).toBe('ÑL')
  })
})