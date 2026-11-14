export default function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center bg-green-50 dark:bg-[#06150f]"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-white/10 dark:border-t-emerald-400" />
    </div>
  )
}