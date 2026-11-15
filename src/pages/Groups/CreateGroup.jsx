import { Link } from "react-router";
import CreateGroupForm from "../../components/Group/CreateGroupForm";

export default function CreateGroup() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
      >
        <span aria-hidden="true">←</span>
        Back to dashboard
      </Link>

      <div className="mt-4 rounded-3xl bg-white p-6 shadow-xl dark:bg-[#0c1f17] dark:shadow-none dark:ring-1 dark:ring-white/5 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New group</h1>
        <p className="mb-8 mt-3 text-sm leading-6 text-gray-500 dark:text-green-300/70">
          Name your group, pick a currency, and invite friends once it is created.
        </p>
        <CreateGroupForm />
      </div>
    </div>
  );
}