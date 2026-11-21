import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { usePersonalExpenses } from "../../hooks/usePersonalExpenses";
import { deletePersonalExpense } from "../../services/personalExpenseService";
import { CATEGORIES, getCategory } from "../../utils/categories";
import { EMPTY_FILTERS, filterExpenses } from "../../utils/expenseFilters";
import { formatMinor } from "../../utils/minorUnits";
import ConfirmDialog from "../../components/ConfirmDialog";
import PersonalExpenseForm from "../../components/Personal/PersonalExpenseForm";
import PersonalImportExport from "../../components/Personal/PersonalImportExport";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const btnPrimary =
  "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-500";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-emerald-100 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10";
const fieldCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0c1f17] dark:text-white dark:scheme-dark";
const optionCls = "bg-white text-gray-900 dark:bg-[#0c1f17] dark:text-white";

export default function PersonalExpenses() {
  const { user } = useAuth();
  const { items, loading, error } = usePersonalExpenses(user?.uid);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const visible = useMemo(() => filterExpenses(items, filters), [items, filters]);

 
  const monthTotals = useMemo(() => {
    const month = new Date().toLocaleDateString("en-CA").slice(0, 7);
    const totals = {};
    for (const e of items) {
      if (e.date.startsWith(month)) totals[e.currency] = (totals[e.currency] ?? 0) + e.amountMinor;
    }
    return Object.entries(totals);
  }, [items]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePersonalExpense(user.uid, toDelete.id);
      toast.success("Expense deleted");
      setToDelete(null);
    } catch (err) {
      console.error("delete personal expense failed", err.code, err.message);
      toast.error(err.message || "Could not delete the expense");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My expenses</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
          Private to you. No group sees these, and nothing is split.
        </p>
      </div>

      {monthTotals.length > 0 && (
        <section className={card}>
          <h2 className="text-sm font-medium text-gray-500 dark:text-green-300/60">Spent this month</h2>
          <ul className="mt-1 space-y-1">
            {monthTotals.map(([currency, minor]) => (
              <li key={currency} className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatMinor(minor, currency)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!showForm && !editing && (
        <button type="button" className={btnPrimary} onClick={() => setShowForm(true)}>
          Add my expense
        </button>
      )}
      {!loading && !error && <PersonalImportExport user={user} items={items} />}

      {(showForm || editing) && (
        <PersonalExpenseForm
          key={editing?.id ?? "new"}
          user={user}
          initial={editing}
          onSaved={closeForm}
          onCancel={closeForm}
        />
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-green-300/60">Loading your expenses...</p>}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          Could not load your expenses ({error.code ?? "error"}).
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
          <p className="font-semibold text-gray-900 dark:text-white">No expenses yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
            Add a taxi, a bill or lunch to start tracking.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Search..."
            aria-label="Search my expenses"
            value={filters.text}
            onChange={setFilter("text")}
            className={fieldCls}
          />
          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={setFilter("category")}
            className={fieldCls}
          >
            <option value="all" className={optionCls}>All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id} className={optionCls}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {!loading && !error && items.length > 0 && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
          <p className="font-semibold text-gray-900 dark:text-white">No expenses match your filters</p>
          <button type="button" className={`${btnQuiet} mt-3`} onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((e) => {
          const { icon: Icon, color, label } = getCategory(e.category);
          return (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-4 dark:bg-white/[0.03]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-white/5">
                  <Icon size={20} className={color} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900 dark:text-white">{e.description}</p>
                  <p className="text-xs text-gray-500 dark:text-green-300/60">
                    {e.date} · {label}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatMinor(e.amountMinor, e.currency)}
                </span>
                <button
                  type="button"
                  className={btnQuiet}
                  onClick={() => {
                    setShowForm(false);
                    setEditing(e);
                  }}
                >
                  Edit
                </button>
                <button type="button" className={btnQuiet} onClick={() => setToDelete(e)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete expense?"
        message={toDelete ? `"${toDelete.description}" will be deleted for good.` : ""}
        confirmLabel="Delete"
        busyLabel="Deleting..."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}