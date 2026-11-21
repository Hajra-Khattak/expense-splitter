import { z } from 'zod'
import { CATEGORY_IDS } from './categories'
import { toMinor, fromMinor } from './minorUnits'
import { equalSplit, exactSplit, percentSplit } from './splits'


export function makeExpenseSchema(digits = 2) {
  return z
    .object({
      description: z.string().trim().min(1, 'Enter a description').max(100, 'Max 100 characters'),
      amount: z
        .string()
        .trim()
        .refine((v) => Number.isFinite(toMinor(v, digits)), 'Enter a valid amount')
        .refine((v) => !(toMinor(v, digits) <= 0), 'Amount must be more than 0'),
      category: z.enum(CATEGORY_IDS),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
      paidBy: z.string().min(1, 'Choose who paid'),
      participants: z.array(z.string()).min(1, 'Pick at least one person'),
      splitType: z.enum(['equal', 'exact', 'percent']),
      note: z.string().max(300, 'Max 300 characters').default(''),
      exact: z.record(z.string(), z.string()).default({}),
      percent: z.record(z.string(), z.string()).default({}),
    })
    .superRefine((v, ctx) => {
      const total = toMinor(v.amount, digits)
      if (!Number.isFinite(total) || total <= 0) return

      if (v.splitType === 'exact') {
        let sum = 0
        for (const id of v.participants) {
          const n = toMinor(v.exact?.[id] || '0', digits)
          if (Number.isNaN(n)) {
            ctx.addIssue({ code: 'custom', path: ['exact'], message: 'Enter valid amounts' })
            return
          }
          sum += n
        }
        if (sum !== total) {
          ctx.addIssue({
            code: 'custom',
            path: ['exact'],
            message: `Amounts must add up to the total (remaining: ${fromMinor(total - sum, digits)})`,
          })
        }
      }

      if (v.splitType === 'percent') {
        let sum = 0
        for (const id of v.participants) {
          const bp = toMinor(v.percent?.[id] || '0', 2) // 33.33% -> 3333
          if (Number.isNaN(bp)) {
            ctx.addIssue({ code: 'custom', path: ['percent'], message: 'Enter valid percentages' })
            return
          }
          sum += bp
        }
        if (sum !== 10000) {
          ctx.addIssue({
            code: 'custom',
            path: ['percent'],
            message: `Percentages must add up to 100 (now ${fromMinor(sum, 2)})`,
          })
        }
      }
    })
}


export function buildExpenseSplits(values, digits = 2) {
  const amountMinor = toMinor(values.amount, digits)
  const ids = values.participants
  let splits

  if (values.splitType === 'equal') {
    splits = equalSplit(amountMinor, ids)
  } else if (values.splitType === 'exact') {
    splits = exactSplit(
      amountMinor,
      Object.fromEntries(ids.map((id) => [id, toMinor(values.exact?.[id] || '0', digits)]))
    )
  } else {
    splits = percentSplit(
      amountMinor,
      Object.fromEntries(ids.map((id) => [id, toMinor(values.percent?.[id] || '0', 2)]))
    )
  }
  return { amountMinor, splits }
}