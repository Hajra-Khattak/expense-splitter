import {
  Archive,
  Info,
  Pencil,
  Receipt,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useOutletContext, useParams } from "react-router";
import { useActivity } from "../../hooks/useActivity";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";

const ICONS = {
  expense_added: Receipt,
  expense_edited: Pencil,
  expense_deleted: Trash2,
  settlement_added: Wallet,
  group_created: Users,
  group_renamed: Pencil,
  group_archived: Archive,
  group_unarchived: Archive,
  member_joined: UserPlus,
  member_added: UserPlus,
  member_removed: UserMinus,
  member_left: UserMinus,
  role_changed: ShieldCheck,
};

function formatTime(createdAt) {
  const date = createdAt?.toDate?.();
  return date ? date.toLocaleString() : "";
}

export default function ActivityTab() {
  const { groupId } = useParams();
  const { members, membersLoading, membersError } = useOutletContext();
  const { items, loading, error } = useActivity(groupId);

  const nameOf = (uid) => members.find((m) => m.id === uid)?.name ?? "Former member";

  if (membersLoading || loading) {
    return <p className="mt-6 text-sm text-gray-500 dark:text-green-300/60">Loading activity...</p>;
  }
  if (membersError || error) {
    return (
      <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        Could not load activity{error?.code ? ` (${error.code})` : ""}.
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
        <p className="font-semibold text-gray-900 dark:text-white">No activity yet</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">
          Expenses, payments and member changes will show up here.
        </p>
      </div>
    );
  }

  return (
    <section className={`mt-6 ${card}`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-green-300/60">Latest 50 events, newest first.</p>
      <ul className="mt-3 space-y-2">
        {items.map((a) => {
          const Icon = ICONS[a.type] ?? Info;
          return (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-xl bg-green-50 p-3 dark:bg-white/[0.03]"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 dark:bg-white/5 dark:text-emerald-300">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <strong>{nameOf(a.actorId)}</strong> {a.summary}
                </p>
                <p className="text-xs text-gray-500 dark:text-green-300/60">{formatTime(a.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}