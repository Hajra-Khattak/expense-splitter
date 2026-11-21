import { useState, useMemo } from "react";
import { useOutletContext, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useExpenses } from "../../hooks/useExpenses";
import { deleteExpense } from "../../services/expenseService";
// import { CATEGORIES } from "../../utils/categories";
import { CATEGORIES, getCategory } from "../../utils/categories";
import { formatMinor } from "../../utils/minorUnits";
import ExpenseForm from "./ExpenseForm";
import { EMPTY_FILTERS, SORTS, filterExpenses } from "../../utils/expenseFilters";
import ConfirmDialog from "../ConfirmDialog";
import GroupImport from "../Group/GroupImport";


const btnPrimary =
  "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-500";
const btnQuiet =
  "rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-emerald-100 dark:bg-white/[0.03] dark:text-green-100 dark:hover:bg-white/10 mt-3";
const selectCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0c1f17] dark:text-white";

const optionCls =
  "bg-white text-gray-900 dark:bg-[#0c1f17] dark:text-white";

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#0c1f17] dark:text-white";

export default function ExpensesTab() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { group, members, membersLoading, membersError, isAdmin } = useOutletContext();
  const { expenses, loading, loadingMore, error, hasMore, loadMore, refresh } =
    useExpenses(groupId);

    const [filters, setFilters] = useState(EMPTY_FILTERS);
const visible = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // the expense being edited, or null
  const [toDelete, setToDelete] = useState(null); // the expense waiting for confirmation
const [deleting, setDeleting] = useState(false);
  const nameOf = (uid) => members.find((m) => m.id === uid)?.name ?? "Former member";
  const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
  const canChange = (e) => e.createdBy === user.uid || isAdmin;

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSaved() {
    closeForm();
    await refresh(); // useExpenses uses getDocs, so reload after every change
  }

  // async function handleDelete(expense) {
  //   if (!window.confirm(`Delete "${expense.description}"?`)) return;
  //   try {
  //     await deleteExpense(groupId, user, expense);
  //     toast.success("Expense deleted");
  //     await refresh();
  //   } catch (err) {
  //     console.error("delete expense failed", err.code, err.message);
  //     toast.error(err.message || "Could not delete the expense");
  //   }
  // }
  async function confirmDelete() {
  if (!toDelete) return;
  setDeleting(true);
  try {
    await deleteExpense(groupId, user, toDelete);
    toast.success("Expense deleted");
    setToDelete(null);
    await refresh();
  } catch (err) {
    console.error("delete expense failed", err.code, err.message);
    toast.error(err.message || "Could not delete the expense");
  } finally {
    setDeleting(false);
  }
}

  if (membersLoading) {
    return <p className="mt-6 text-sm text-gray-500 dark:text-green-300/60">Loading members...</p>;
  }
  if (membersError) {
    return (
      <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        Could not load the members.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {!showForm && !editing && !group.archived && (
        <button type="button" className={btnPrimary} onClick={() => setShowForm(true)}>
          Add expense
        </button>
      )}
      {isAdmin && !group.archived && !showForm && !editing && (
  <GroupImport groupId={groupId} group={group} members={members} user={user} onImported={refresh} />
)}

      {(showForm || editing) && (
        <ExpenseForm
          key={editing?.id ?? "new"}
          groupId={groupId}
          group={group}
          members={members}
          user={user}
          initial={editing}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      )}

      {loading && (
        <p className="text-sm text-gray-500 dark:text-green-300/60">Loading expenses...</p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          Could not load expenses ({error.code ?? "error"}).
        </p>
      )}

      {!loading && !error && expenses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
          <p className="font-semibold text-gray-900 dark:text-white">  No expenses yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
            Add the first one to start splitting.
          </p>
        </div>
      )}

      {/* Filter bar */}
{!loading && !error && expenses.length > 0 && (
  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0c1f17] sm:grid-cols-2 lg:grid-cols-3">

    
    <input
      type="text"
      placeholder="Search expenses..."
      value={filters.text}
      onChange={setFilter("text")}
      className={inputCls}
    />

    
    <input
      type="date"
      value={filters.from}
      onChange={setFilter("from")}
       className={inputCls}
    />

   
    <input
      type="date"
      value={filters.to}
      onChange={setFilter("to")}
       className={inputCls}
    />

    
    <select
      value={filters.category}
      onChange={setFilter("category")}
      className={selectCls}
    >
      <option value="all" className={optionCls}>
        All categories
      </option>

      {CATEGORIES.map((category) => (
        <option
          key={category.id}
          value={category.id}
           className={optionCls}
        >
          {category.label}
        </option>
      ))}
    </select>

   
    <select
      value={filters.paidBy}
      onChange={setFilter("paidBy")}
      className={selectCls}
    >
      <option value="all" className={optionCls}>
        All members
      </option>

      {members.map((member) => (
        <option
          key={member.id}
          value={member.id}
          className={optionCls}
        >
          {member.name}
        </option>
      ))}
    </select>

  
    <select
      value={filters.sort}
      onChange={setFilter("sort")}
      className={selectCls}
    >
      {SORTS.map((sort) => (
        // <option
        //   key={sort.value}
        //   value={sort.value}
        //   className={optionCls}
        // >
        //   {sort.label}
        // </option>
        <option
          key={sort.id}
          value={sort.id}
          className={optionCls}
        >
          {sort.label}
        </option>
      ))}
    </select>

  </div>
)}

    
{!loading && !error && expenses.length > 0 && visible.length === 0 && (
  <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
    <p className="font-semibold text-gray-900 dark:text-white">
      No expenses match your filters
    </p>
    <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
      Try changing your filters.
    </p>
    <button
      type="button"
      className={btnQuiet}
      onClick={() => setFilters(EMPTY_FILTERS)}
    >
      Clear filters
    </button>
  </div>
)}


<ul className="space-y-2">
  {visible.map((e) => {
    const { icon: Icon, color } = getCategory(e.category);
    return (
      <li
        key={e.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-50 p-4 dark:bg-white/[0.03]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-white/5">
            <Icon size={20} className={color} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900 dark:text-white">
              {e.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-green-300/60">
              {e.date} · {categoryLabel(e.category)} · paid by {nameOf(e.paidBy)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatMinor(e.amountMinor, group.currency)}
          </span>
          {canChange(e) && !group.archived && (
            <>
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
            </>
          )}
        </div>
      </li>
    );
  })}
</ul>

      {hasMore && (
        <button type="button" className={btnQuiet} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}

      <ConfirmDialog
  open={!!toDelete}
  title="Delete expense?"
  message={
    toDelete
      ? `"${toDelete.description}" will be removed from the group and from everyone's balance.`
      : ""
  }
  confirmLabel="Delete"
  busy={deleting}
  onConfirm={confirmDelete}
  onCancel={() => setToDelete(null)}
/>
    </div>
  );
}