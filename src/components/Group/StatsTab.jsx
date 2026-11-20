import { useMemo } from "react";
import { useOutletContext, useParams } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGroupLedger } from "../../hooks/useGroupLedger";
import { useTheme } from "../../hooks/useTheme";
import { getCategory } from "../../utils/categories";
import { downloadCsv, expensesToCsv } from "../../utils/csv";
import { currencyDigits, formatMinor } from "../../utils/minorUnits";
import { perMemberSummary, spendingByCategory, spendingByMonth } from "../../utils/stats";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10";

const PIE_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#6b7280"];

export default function StatsTab() {
  const { groupId } = useParams();
  const { group, members, membersLoading, membersError } = useOutletContext();
  const { expenses, loading, error } = useGroupLedger(groupId);
  const { theme } = useTheme();

  const digits = currencyDigits(group.currency);
  const money = (minor) => formatMinor(minor, group.currency);
  const nameOf = (uid) => members.find((m) => m.id === uid)?.name ?? "Former member";

  // Recharts takes colours as props, so the theme decides them here.
  const axisColor = theme === "dark" ? "#bbf7d0" : "#4b5563";
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "#0c1f17" : "#ffffff",
    border: `1px solid ${gridColor}`,
    borderRadius: 12,
    color: theme === "dark" ? "#ffffff" : "#111827",
  };

  const byCategory = useMemo(
    () => spendingByCategory(expenses).map((r) => ({ ...r, name: getCategory(r.category).label })),
    [expenses]
  );
  const byMonth = useMemo(() => spendingByMonth(expenses), [expenses]);
  const perMember = useMemo(() => perMemberSummary(expenses), [expenses]);
  const liveCount = expenses.filter((e) => !e.deleted).length;

  function exportCsv() {
    const safeName = group.name.replace(/[^\w-]+/g, "_");
    downloadCsv(`${safeName}-expenses.csv`, expensesToCsv(expenses, nameOf, digits));
  }

  if (membersLoading || loading) {
    return <p className="mt-6 text-sm text-gray-500 dark:text-green-300/60">Loading stats...</p>;
  }
  if (membersError || error) {
    return (
      <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        Could not load stats{error?.code ? ` (${error.code})` : ""}.
      </p>
    );
  }
  if (liveCount === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
        <p className="font-semibold text-gray-900 dark:text-white">No stats yet</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
          Charts appear after the first expense.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spending by category</h2>
          <button type="button" className={btnQuiet} onClick={exportCsv}>
            Export CSV
          </button>
        </div>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="amountMinor" nameKey="name" outerRadius="80%" label={(d) => d.name}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {byCategory.map((r) => (
            <li key={r.category} className="flex justify-between text-gray-900 dark:text-white">
              <span>{r.name}</span>
              <span className="font-medium">{money(r.amountMinor)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spending over time</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
                tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v / 10 ** digits)}
              />
              <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} cursor={{ fill: gridColor }} />
              <Bar dataKey="amountMinor" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paid vs share, per member</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
          Expenses only. Payments are not included, so use the Balances tab for what is owed now.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-green-300/60">
                <th className="py-2 font-medium">Member</th>
                <th className="py-2 text-right font-medium">Paid</th>
                <th className="py-2 text-right font-medium">Share</th>
                <th className="py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {perMember.map((r) => (
                <tr key={r.id} className="border-t border-emerald-100 text-gray-900 dark:border-white/5 dark:text-white">
                  <td className="py-2">{nameOf(r.id)}</td>
                  <td className="py-2 text-right">{money(r.paid)}</td>
                  <td className="py-2 text-right">{money(r.share)}</td>
                  <td
                    className={`py-2 text-right font-semibold ${
                      r.difference >= 0
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {r.difference >= 0 ? "+" : "-"}
                    {money(Math.abs(r.difference))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}