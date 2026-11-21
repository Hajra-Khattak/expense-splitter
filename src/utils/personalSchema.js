import { z } from 'zod'
import { CATEGORY_IDS } from './categories'
import { currencyDigits, toMinor } from './minorUnits'

export const PERSONAL_CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR']

export const personalSchema = z
  .object({
    description: z.string().trim().min(1, 'Enter a description').max(100, 'Maximum 100 characters'),
    amount: z.string().trim().min(1, 'Enter an amount'),
    category: z.enum(CATEGORY_IDS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    currency: z.enum(PERSONAL_CURRENCIES),
    note: z.string().max(300, 'Maximum 300 characters').optional(),
  })
  .superRefine((v, ctx) => {
    const minor = toMinor(v.amount, currencyDigits(v.currency))
    if (!Number.isInteger(minor) || minor <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Enter a positive amount with at most 2 decimals',
      })
    }
  })