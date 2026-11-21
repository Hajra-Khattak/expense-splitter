import { Link, NavLink, Outlet, useParams } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useGroup } from "../../hooks/useGroup";
import { useMembers } from "../../hooks/useMembers";

const BASE_TABS = [
  ["expenses", "Expenses"],
  ["balances", "Balances"],
  ["settle-up", "Settle Up"],
  ["members", "Members"],
  ["activity", "Activity"],
  ["stats", "Stats"],
];

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const { group, loading, error } = useGroup(groupId);

  const { members, loading: membersLoading, error: membersError } = useMembers(groupId);

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-green-300/70">Loading group...</p>;
  }
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        You can't open this group.
      </p>
    );
  }
  if (!group) {
    return <p className="text-sm text-gray-500 dark:text-green-300/70">Group not found.</p>;
  }

  const me = members.find((m) => m.id === user?.uid);
  const myRole = me?.role;
  const isAdmin = myRole === "admin";

  // Settings is only for admins
  const tabs = isAdmin ? [...BASE_TABS, ["settings", "Settings"]] : BASE_TABS;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
      >
        <span aria-hidden="true">←</span>
        Back to dashboard
      </Link>

      <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
      {group.description && (
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-green-300/70">{group.description}</p>
      )}

      {group.archived && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
        >
          This group is archived. It is read-only until an admin unarchives it.
        </p>
      )}

      <nav
        aria-label="Group sections"
        className="mt-6 flex gap-2 overflow-x-auto border-b border-gray-200 pb-3 dark:border-white/10"
      >
        {tabs.map(([path, text]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                  : "bg-white text-gray-700 hover:bg-emerald-50 dark:bg-white/5 dark:text-green-100 dark:hover:bg-white/10"
              }`
            }
          >
            {text}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ group, members, membersLoading, membersError, isAdmin, myRole }} />
    </div>
  );
}