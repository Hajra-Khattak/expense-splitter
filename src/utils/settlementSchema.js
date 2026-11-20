import { z } from 'zod'
import { toMinor } from './minorUnits'

export function makeSettlementSchema(digits = 2) {
  return z
    .object({
      from: z.string().min(1, 'Choose who pays'),
      to: z.string().min(1, 'Choose who receives'),
      amount: z
        .string()
        .trim()
        .refine((v) => Number.isFinite(toMinor(v, digits)), 'Enter a valid amount')
        .refine((v) => !(toMinor(v, digits) <= 0), 'Amount must be more than 0'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
      note: z.string().max(300, 'Max 300 characters').default(''),
    })
    .refine((v) => v.from !== v.to, {
      message: 'Payer and receiver must be different people',
      path: ['to'],
    })
}