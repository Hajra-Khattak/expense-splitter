import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CATEGORIES } from "../../utils/categories";
import { currencyDigits, fromMinor, toMinor } from "../../utils/minorUnits";
import { PERSONAL_CURRENCIES, personalSchema } from "../../utils/personalSchema";
import { addPersonalExpense, editPersonalExpense } from "../../services/personalExpenseService";


const inputCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-emerald-500/20 dark:scheme-dark";
const labelCls = "text-sm font-medium text-gray-700 dark:text-green-100";
const errCls = "mt-1 text-xs text-red-600 dark:text-red-400";
const optionCls = "bg-white text-gray-900 dark:bg-[#0c1f17] dark:text-white";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

function toFormValues(initial) {
  if (!initial) {
    return { description: "", amount: "", category: "other", date: today(), currency: "PKR", note: "" };
  }
  return {
    description: initial.description,
    amount: fromMinor(initial.amountMinor, currencyDigits(initial.currency)),
    category: initial.category,
    date: initial.date,
    currency: initial.currency,
    note: initial.note ?? "",
  };
}

export default function PersonalExpenseForm({ user, initial = null, onSaved, onCancel }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(personalSchema),
    defaultValues: toFormValues(initial),
  });

  async function onSubmit(data) {
    try {
      const payload = {
        description: data.description.trim(),
        amountMinor: toMinor(data.amount, currencyDigits(data.currency)),
        category: data.category,
        date: data.date,
        currency: data.currency,
        note: data.note ?? "",
      };
      if (initial) await editPersonalExpense(user.uid, initial.id, payload);
      else await addPersonalExpense(user.uid, payload);
      toast.success(initial ? "Expense updated" : "Expense added");
      onSaved?.();
    } catch (err) {
      console.error("save personal expense failed", err.code, err.message);
      setError("root.serverError", { message: err.message || "Could not save the expense" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {initial ? "Edit my expense" : "Add my expense"}
      </h3>

      {errors.root?.serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errors.root.serverError.message}
        </p>
      )}

      <div>
        <label htmlFor="pe-desc" className={labelCls}>Description</label>
        <input id="pe-desc" className={inputCls} placeholder="Taxi to airport" {...register("description")} />
        {errors.description && <p className={errCls}>{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pe-amount" className={labelCls}>Amount</label>
          <input id="pe-amount" className={inputCls} inputMode="decimal" {...register("amount")} />
          {errors.amount && <p className={errCls}>{errors.amount.message}</p>}
        </div>
        <div>
          <label htmlFor="pe-currency" className={labelCls}>Currency</label>
          <select id="pe-currency" className={inputCls} {...register("currency")}>
            {PERSONAL_CURRENCIES.map((c) => (
              <option key={c} value={c} className={optionCls}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pe-category" className={labelCls}>Category</label>
          <select id="pe-category" className={inputCls} {...register("category")}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id} className={optionCls}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pe-date" className={labelCls}>Date</label>
          <input id="pe-date" type="date" className={inputCls} {...register("date")} />
          {errors.date && <p className={errCls}>{errors.date.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="pe-note" className={labelCls}>Note (optional)</label>
        <input id="pe-note" className={inputCls} {...register("note")} />
        {errors.note && <p className={errCls}>{errors.note.message}</p>}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 dark:hover:bg-emerald-500"
        >
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Add expense"}
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
  );
}