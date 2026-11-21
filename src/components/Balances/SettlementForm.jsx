import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { makeSettlementSchema } from "../../utils/settlementSchema";
import { maxPayment } from "../../utils/balances";
import { currencyDigits, formatMinor, fromMinor, toMinor } from "../../utils/minorUnits";
import { addSettlement } from "../../services/settlementService";

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-emerald-500/20";
const labelCls = "text-sm font-medium text-gray-700 dark:text-green-100";
const errCls = "mt-1 text-xs text-red-600 dark:text-red-400";
const optionCls = "bg-white text-gray-900 dark:bg-[#0c1f17] dark:text-white";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

export default function SettlementForm({ groupId, group, members, user, isAdmin, net, prefill, onSaved, onCancel }) {
  const digits = currencyDigits(group.currency);
  const schema = useMemo(() => makeSettlementSchema(digits), [digits]);
  const [mode, setMode] = useState(prefill ? "full" : "partial");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      from: prefill?.from ?? user.uid,
      to: prefill?.to ?? "",
      amount: prefill ? fromMinor(prefill.amountMinor, digits) : "",
      date: today(),
      note: "",
    },
  });

  const from = watch("from");
  const to = watch("to");
  const maxMinor = maxPayment(net, from, to);

  // Full mode keeps the amount equal to the most these two people can settle.
  useEffect(() => {
    if (mode === "full") setValue("amount", maxMinor > 0 ? fromMinor(maxMinor, digits) : "");
  }, [mode, maxMinor, digits, setValue]);

  async function onSubmit(data) {
    const amountMinor = toMinor(data.amount, digits);

    if (!isAdmin && data.from !== user.uid && data.to !== user.uid) {
      setError("root.serverError", { message: "You can only record payments you made or received." });
      return;
    }
    if (amountMinor > maxMinor) {
      setError("amount", {
        message:
          maxMinor > 0
            ? `At most ${formatMinor(maxMinor, group.currency)} can be settled between these two`
            : "This person does not owe anything to the other person",
      });
      return;
    }

    try {
      const nameOf = (uid) => members.find((m) => m.id === uid)?.name ?? "a member";
      await addSettlement(groupId, user, {
        from: data.from,
        to: data.to,
        amountMinor,
        date: data.date,
        note: data.note ?? "",
        summary: `recorded ${nameOf(data.from)} paying ${nameOf(data.to)} ${formatMinor(amountMinor, group.currency)}`,
      });
      toast.success("Payment recorded");
      onSaved?.();
    } catch (err) {
      console.error("add settlement failed", err.code, err.message);
      setError("root.serverError", { message: err.message || "Could not record the payment" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Record a payment</h3>

      {errors.root?.serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errors.root.serverError.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Who paid</label>
          <select className={inputCls} {...register("from")}>
            {members.map((m) => (
              <option key={m.id} value={m.id} className={optionCls}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.from && <p className={errCls}>{errors.from.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Who received</label>
          <select className={inputCls} {...register("to")}>
            <option value="" className={optionCls}>
              Choose a person
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id} className={optionCls}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.to && <p className={errCls}>{errors.to.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Amount ({group.currency})</label>
        <div className="mt-2 flex gap-2">
          {["full", "partial"].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-xl px-3 py-1.5 text-sm ${
                mode === m
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500"
                  : "bg-green-50 text-gray-700 dark:bg-white/[0.03] dark:text-green-100"
              }`}
            >
              {m === "full" ? "Full amount" : "Partial"}
            </button>
          ))}
        </div>
        <input
          className={`${inputCls} mt-2`}
          inputMode="decimal"
          readOnly={mode === "full"}
          {...register("amount")}
        />
        {to && (
          <p className="mt-1 text-xs text-gray-500 dark:text-green-300/60">
            {maxMinor > 0
              ? `Up to ${formatMinor(maxMinor, group.currency)} can be settled between these two.`
              : "This person does not owe anything to the other person."}
          </p>
        )}
        {errors.amount && <p className={errCls}>{errors.amount.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={`${inputCls} dark:[color-scheme:dark]`} {...register("date")} />
          {errors.date && <p className={errCls}>{errors.date.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input className={inputCls} {...register("note")} />
          {errors.note && <p className={errCls}>{errors.note.message}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 dark:hover:bg-emerald-500"
        >
          {isSubmitting ? "Saving..." : "Record payment"}
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