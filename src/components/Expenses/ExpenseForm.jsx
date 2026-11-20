import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CATEGORIES } from '../../utils/categories'
import { makeExpenseSchema, buildExpenseSplits } from '../../utils/expenseSchema'
import { currencyDigits, formatMinor, fromMinor } from '../../utils/minorUnits'
import { addExpense, editExpense } from '../../services/expenseService'


const inputCls =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-emerald-500/20'
const labelCls = 'text-sm font-medium text-gray-700 dark:text-green-100'
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400'
const selectCls = inputCls + ' dark:scheme-dark'
const optionCls = 'bg-white text-gray-900 dark:bg-[#0c1f17] dark:text-white'

const uidOf = (m) => m.uid ?? m.id // member docs are stored at members/{uid}
const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

function toFormValues(initial, digits, members, user) {
  if (!initial) {
    return {
      description: '',
      amount: '',
      category: 'food',
      date: today(),
      paidBy: user.uid,
      participants: members.map(uidOf),
      splitType: 'equal',
      note: '',
      exact: {},
      percent: {},
    }
  }
  const total = initial.amountMinor
  return {
    description: initial.description,
    amount: fromMinor(total, digits),
    category: initial.category,
    date: initial.date,
    paidBy: initial.paidBy,
    participants: initial.participants,
    splitType: initial.splitType,
    note: initial.note ?? '',
    exact: Object.fromEntries(
      Object.entries(initial.splits).map(([id, v]) => [id, fromMinor(v, digits)])
    ),
    // Original percentages are not stored, so they are rebuilt from the amounts (rounded).
    percent: Object.fromEntries(
      Object.entries(initial.splits).map(([id, v]) => [id, fromMinor(Math.round((v * 10000) / total), 2)])
    ),
  }
}

export default function ExpenseForm({
  groupId,
  group,
  members,
  user,
  initial = null,
  onSaved,
  onCancel,
}) {
  const digits = currencyDigits(group.currency)
  const schema = useMemo(() => makeExpenseSchema(digits), [digits])
  const nameOf = (uid) => members.find((m) => uidOf(m) === uid)?.name ?? 'Former member'

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initial, digits, members, user),
  })

  const values = watch()
  const participants = values.participants ?? []

  // Live preview: only when the whole form is valid.
  let preview = null
  const parsed = schema.safeParse(values)
  if (parsed.success) {
    try {
      preview = buildExpenseSplits(parsed.data, digits).splits
    } catch {
      preview = null
    }
  }

  function toggle(uid) {
    const next = participants.includes(uid)
      ? participants.filter((id) => id !== uid)
      : [...participants, uid]
    setValue('participants', next, { shouldValidate: true })
  }

  async function onSubmit(data) {
    try {
      const { amountMinor, splits } = buildExpenseSplits(data, digits)
      const payload = {
        description: data.description.trim(),
        amountMinor,
        category: data.category,
        date: data.date,
        paidBy: data.paidBy,
        participants: data.participants,
        splitType: data.splitType,
        splits,
        note: data.note ?? '',
      }
      if (initial) await editExpense(groupId, user, initial.id, payload)
      else await addExpense(groupId, user, payload)
      toast.success(initial ? 'Expense updated' : 'Expense added')
      onSaved?.()
    } catch (err) {
      setError('root.serverError', { message: err.message || 'Could not save the expense' })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {initial ? 'Edit expense' : 'Add expense'}
      </h3>

      {errors.root?.serverError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errors.root.serverError.message}
        </p>
      )}

      <div>
        <label className={labelCls}>Description</label>
        <input className={inputCls} {...register('description')} />
        {errors.description && <p className={errCls}>{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Amount ({group.currency})</label>
          <input className={inputCls} inputMode="decimal" {...register('amount')} />
          {errors.amount && <p className={errCls}>{errors.amount.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} {...register('date')} />
          {errors.date && <p className={errCls}>{errors.date.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} {...register('category')}>
            {CATEGORIES.map((c) => (
              <option className={optionCls} key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Paid by</label>
          <select className={inputCls} {...register('paidBy')}>
            {members.map((m) => (
              <option key={uidOf(m)} className={optionCls} value={uidOf(m)}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.paidBy && <p className={errCls}>{errors.paidBy.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Split between</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((m) => {
            const on = participants.includes(uidOf(m))
            return (
              <button
                type="button"
                key={uidOf(m)}
                aria-pressed={on}
                onClick={() => toggle(uidOf(m))}
                className={`rounded-xl px-3 py-1.5 text-sm ${
                  on
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500'
                    : 'bg-green-50 text-gray-700 dark:bg-white/[0.03] dark:text-green-100'
                }`}
              >
                {m.name}
              </button>
            )
          })}
        </div>
        {errors.participants && <p className={errCls}>{errors.participants.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Split type</label>
        <select className={inputCls} {...register('splitType')}>
          <option  className={optionCls} value="equal">Equally</option>
          <option className={optionCls} value="exact">Exact amounts</option>
          <option className={optionCls} value="percent">Percentages</option>
        </select>
      </div>

      {values.splitType !== 'equal' && (
        <div className="space-y-2">
          {participants.map((uid) => (
            <div key={uid} className="flex items-center gap-3">
              <span className="w-32 truncate text-sm text-gray-900 dark:text-white">
                {nameOf(uid)}
              </span>
              <input
                className={inputCls}
                inputMode="decimal"
                placeholder={values.splitType === 'percent' ? '%' : group.currency}
                {...register(`${values.splitType}.${uid}`)}
              />
            </div>
          ))}
          {errors[values.splitType] && (
            <p className={errCls}>{errors[values.splitType].message}</p>
          )}
        </div>
      )}

      {preview && (
        <div className="rounded-xl bg-green-50 p-3 text-sm dark:bg-white/[0.03]">
          <p className="mb-1 text-gray-500 dark:text-green-300/60">Preview</p>
          {Object.entries(preview).map(([uid, minor]) => (
            <div key={uid} className="flex justify-between text-gray-900 dark:text-white">
              <span>{nameOf(uid)}</span>
              <span>{formatMinor(minor, group.currency)}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className={labelCls}>Note (optional)</label>
        <input className={inputCls} {...register('note')} />
        {errors.note && <p className={errCls}>{errors.note.message}</p>}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 dark:hover:bg-emerald-500"
        >
          {isSubmitting ? 'Saving...' : initial ? 'Save changes' : 'Add expense'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-green-50 px-5 py-3 text-sm font-medium text-gray-700 dark:bg-white/[0.03] dark:text-green-100"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}