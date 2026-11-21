import { useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useGroupLedger } from "../../hooks/useGroupLedger";
import { computeBalances, pairwiseDebts } from "../../utils/balances";
import { simplifyDebts } from "../../utils/settleUp";
import { formatMinor } from "../../utils/minorUnits";
import { reverseSettlement } from "../../services/settlementUndo";
import SettlementForm from "./SettlementForm";
import ConfirmDialog from "../ConfirmDialog";
import { downloadMemberPdf } from "../../utils/groupPdf";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const btnPrimary =
  "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-500";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-emerald-100 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10";

const REVERSAL = /^Reversal of payment (\S+)/;

export default function SettleUpTab() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { group, members, membersLoading, membersError, isAdmin } = useOutletContext();
  const { expenses, settlements, loading, error } = useGroupLedger(groupId);

  
  const [form, setForm] = useState(null);
  const [mode, setMode] = useState("simplified"); 
  const [toUndo, setToUndo] = useState(null); 
  const [undoing, setUndoing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const net = useMemo(() => computeBalances(expenses, settlements), [expenses, settlements]);
  const simplified = useMemo(() => simplifyDebts(net), [net]);
  const original = useMemo(() => pairwiseDebts(expenses, settlements), [expenses, settlements]);
  const suggestions = mode === "simplified" ? simplified : original;

  const history = useMemo(
    () => [...settlements].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [settlements]
  );
  
  const reversedIds = useMemo(() => {
    const ids = new Set();
    for (const s of settlements) {
      const m = REVERSAL.exec(s.note ?? "");
      if (m) ids.add(m[1]);
    }
    return ids;
  }, [settlements]);

  const nameOf = (uid) => members.find((m) => m.id === uid)?.name ?? "Former member";
  const money = (minor) => formatMinor(minor, group.currency);
  const canRecord = (from, to) =>
    !group.archived && (isAdmin || from === user.uid || to === user.uid);
  const canUndo = (s) =>
    !group.archived &&
    !REVERSAL.test(s.note ?? "") &&
    !reversedIds.has(s.id) &&
    (isAdmin || s.createdBy === user.uid) &&
    (isAdmin || s.from === user.uid || s.to === user.uid);


    async function exportPdf() {
  setPdfBusy(true);
  try {
    await downloadMemberPdf({
      group,
      me: { id: user.uid, name: nameOf(user.uid) },
      nameOf,
      net,
      suggestions: simplified,
      expenses,
      settlements,
    });
  } catch (err) {
    console.error("pdf failed", err);
    toast.error("Could not create the PDF.");
  } finally {
    setPdfBusy(false);
  }
}
  async function confirmUndo() {
    if (!toUndo) return;
    setUndoing(true);
    try {
      await reverseSettlement(groupId, user, toUndo);
      toast.success("Payment reversed");
      setToUndo(null);
    } catch (err) {
      console.error("undo settlement failed", err.code, err.message);
      toast.error(err.message || "Could not undo the payment");
    } finally {
      setUndoing(false);
    }
  }

  if (membersLoading || loading) {
    return <p className="mt-6 text-sm text-gray-500 dark:text-green-300/60">Loading...</p>;
  }
  if (membersError || error) {
    return (
      <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        Could not load settle up data{error?.code ? ` (${error.code})` : ""}.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {form && (
        <SettlementForm
          key={JSON.stringify(form)}
          groupId={groupId}
          group={group}
          members={members}
          user={user}
          isAdmin={isAdmin}
          net={net}
          prefill={form.from ? form : null}
          onSaved={() => setForm(null)}
          onCancel={() => setForm(null)}
        />
      )}

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === "simplified" ? "Suggested payments" : "Original debts"}
          </h2>
          <div className="flex flex-wrap  ">

          {!form && !group.archived && (
            <button type="button" className={btnPrimary} onClick={() => setForm({})}>
              Record a payment
            </button>
          )}
          <button type="button" className={`ml-3 px-4 py-2 rounded-lg text-white hover:bg-yellow-700 transition-colors bg-yellow-800`} onClick={exportPdf} disabled={pdfBusy}>
  {pdfBusy ? "Creating..." : "Download my PDF"}
</button>
          </div>

        </div>

        <div className="mt-3 flex gap-2" role="group" aria-label="Debt view">
          {[
            ["simplified", "Simplified"],
            ["original", "Original"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                mode === id
                  ? "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                  : "bg-green-50 text-gray-700 hover:bg-emerald-100 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-green-300/60">
            Everyone is settled up. Nothing to pay.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-gray-500 dark:text-green-300/60">
              {mode === "simplified"
                ? `The fewest payments that clear every balance (${suggestions.length}).`
                : `Direct debts between pairs, before simplification (${suggestions.length}).`}
            </p>
            <ul className="mt-3 space-y-2">
              {suggestions.map((p) => (
                <li
                  key={`${p.from}-${p.to}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-3 dark:bg-white/[0.03]"
                >
                  <span className="text-sm text-gray-900 dark:text-white">
                    <strong>{nameOf(p.from)}</strong> pays <strong>{nameOf(p.to)}</strong>{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-300">{money(p.amountMinor)}</span>
                  </span>
                  {canRecord(p.from, p.to) && (
                    <button type="button" className={btnQuiet} onClick={() => setForm(p)}>
                      Record payment
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment history</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-green-300/60">No payments recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-3 dark:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {nameOf(s.from)} paid {nameOf(s.to)}
                    {reversedIds.has(s.id) && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-green-300/60">(reversed)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-green-300/60">
                    {s.date}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-white">{money(s.amountMinor)}</span>
                  {canUndo(s) && (
                    <button type="button" className={btnQuiet} onClick={() => setToUndo(s)}>
                      Undo
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!toUndo}
        title="Undo this payment?"
        message={
          toUndo
            ? `A new payment of ${money(toUndo.amountMinor)} from ${nameOf(toUndo.to)} to ${nameOf(toUndo.from)} will be added. The original stays in the history.`
            : ""
        }
        confirmLabel="Undo"
        busy={undoing}
        onConfirm={confirmUndo}
        onCancel={() => setToUndo(null)}
      />
    </div>
  );
}