import { Link } from "react-router";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-6 text-center dark:bg-[#06150f]">
      <p className="text-6xl font-bold text-emerald-600 dark:text-emerald-300">404</p>
      <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-green-300/60">
        This page does not exist or was moved.
      </p>
      <Link
        to="/app"
        className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-500"
      >
        Back to dashboard
      </Link>
    </main>
  );
}