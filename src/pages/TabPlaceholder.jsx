export default function TabPlaceholder({ title }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0c1f17]">
      <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-green-300/70">Coming soon.</p>
    </div>
  );
}