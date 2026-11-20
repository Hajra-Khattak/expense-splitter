import { useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router";
import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { useGroupLedger } from "../../hooks/useGroupLedger";
import { computeBalances, pairwiseDebts, verifyBalances } from "../../utils/balances";
import { formatMinor } from "../../utils/minorUnits";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-emerald-100 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10";

export default function BalancesTab() {
  const { groupId } = useParams();
  const { group, members, membersLoading, membersError, isAdmin } = useOutletContext();
  const { expenses, settlements, loading, error } = useGroupLedger(groupId);
  const [report, setReport] = useState(null);

  const net = useMemo(() => computeBalances(expenses, settlements), [expenses, settlements]);
  const pairs = useMemo(() => pairwiseDebts(expenses, settlements), [expenses, settlements]);

  const nameOf = (uid) => members.find((m) => m.id === uid)?.name ?? "Former member";
  const money = (minor) => formatMinor(minor, group.currency);

  if (membersLoading || loading) {
    return <p className="mt-6 text-sm text-gray-500 dark:text-green-300/60">Loading balances...</p>;
  }
  if (membersError || error) {
    return (
      <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        Could not load balances{error?.code ? ` (${error.code})` : ""}.
      </p>
    );
  }

  // Every current member, plus anyone who still has a balance (a former member).
  const ids = [...new Set([...members.map((m) => m.id), ...Object.keys(net)])];
  const rows = ids
    .map((id) => ({ id, value: net[id] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="mt-6 space-y-6">
      {expenses.length === 0 && settlements.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
          <p className="font-semibold text-gray-900 dark:text-white">Nothing to balance yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
            Balances appear after the first expense.
          </p>
        </div>
      )}

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Balances</h2>
        <ul className="mt-3 space-y-2">
          {rows.map(({ id, value }) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-xl bg-green-50 p-3 dark:bg-white/[0.03]"
            >
              <span className="truncate font-medium text-gray-900 dark:text-white">{nameOf(id)}</span>
              {value > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                  <ArrowUpRight size={16} aria-hidden="true" />
                  is owed {money(value)}
                </span>
              )}
              {value < 0 && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  <ArrowDownLeft size={16} aria-hidden="true" />
                  owes {money(-value)}
                </span>
              )}
              {value === 0 && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-green-300/60">
                  <Check size={16} aria-hidden="true" />
                  settled up
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Who owes whom</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
          Direct debts between pairs, before simplification. Use Settle Up for the shortest list
          of payments.
        </p>
        {pairs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-green-300/60">Nobody owes anything.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pairs.map((p) => (
              <li
                key={`${p.from}-${p.to}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-green-50 p-3 text-sm dark:bg-white/[0.03]"
              >
                <span className="text-gray-900 dark:text-white">
                  {nameOf(p.from)} owes {nameOf(p.to)}
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{money(p.amountMinor)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verify balances</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
                Admin tool. Recomputes everything from the full history and checks it.
              </p>
            </div>
            <button type="button" className={btnQuiet} onClick={() => setReport(verifyBalances(expenses, settlements))}>
              Run check
            </button>
          </div>

          {report && report.ok && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-emerald-700 dark:bg-white/[0.03] dark:text-emerald-300">
              <Check size={16} aria-hidden="true" />
              All good: {report.expenseCount} expenses and {report.settlementCount} settlements add up to 0.
            </p>
          )}
          {report && !report.ok && (
            <ul role="alert" className="mt-3 list-disc space-y-1 rounded-xl bg-red-50 py-3 pl-8 pr-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {report.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}