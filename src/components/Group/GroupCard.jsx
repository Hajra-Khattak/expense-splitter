import { Link } from "react-router";

export default function GroupCard({ group }) {
  const count = group.memberIds.length;

  return (
    <Link
      to={`/app/groups/${group.id}`}
      className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-[#0c1f17] dark:shadow-none dark:ring-1 dark:ring-white/5 dark:hover:bg-[#10281d]"
    >
      <p className="font-bold text-gray-900 dark:text-white">{group.name}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-green-300/70">
        {count} member{count === 1 ? "" : "s"} · {group.currency}
      </p>
      {/* Net balance per group is added in Phase 5, from balances.js */}
    </Link>
  );
}