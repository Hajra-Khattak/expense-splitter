import { Link } from 'react-router'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useGroups } from '../../hooks/useGroups'

/* ---------- helpers ---------- */
// All money is stored in minor units (12.50 -> 1250). Format only for display.
// Later, move this into utils/money.js.
const formatMoney = (minor, currency = 'PKR') =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100)

/* ---------- mock data (replace with hooks later) ---------- */
// Money stats, chart, expenses and payments stay mock until Phases 4 and 5.
// Groups are real now: they come from useGroups().
const moneyStats = [
  { label: 'Net balance', value: 135000, hint: 'Across all groups', tone: 'good' },
  { label: 'You are owed', value: 210000, hint: 'From 3 people', tone: 'good' },
  { label: 'You owe', value: 75000, hint: 'To 2 people', tone: 'bad' },
]

const monthly = [
  { month: 'Jun', total: 3200000 },
  { month: 'Jul', total: 4100000 },
  { month: 'Aug', total: 3600000 },
  { month: 'Sep', total: 5200000 },
  { month: 'Oct', total: 4700000 },
  { month: 'Nov', total: 3900000 },
]

const categories = [
  { name: 'Rent', value: 1800000, color: '#34d399' },
  { name: 'Groceries', value: 900000, color: '#10b981' },
  { name: 'Food', value: 650000, color: '#a3e635' },
  { name: 'Transport', value: 300000, color: '#2dd4bf' },
  { name: 'Other', value: 250000, color: '#047857' },
]

const expenses = [
  { id: 1, title: 'Dinner at Savour', group: 'Flat 12B', date: 'Nov 13', paidBy: 'You', amount: 300000 },
  { id: 2, title: 'Taxi to airport', group: 'Murree Trip', date: 'Nov 11', paidBy: 'Ali', amount: 90000 },
  { id: 3, title: 'Electricity bill', group: 'Flat 12B', date: 'Nov 9', paidBy: 'Sara', amount: 450000 },
  { id: 4, title: 'Team lunch', group: 'Office Lunch', date: 'Nov 8', paidBy: 'You', amount: 120000 },
]

const payments = [
  { id: 1, who: 'Ali', direction: 'pay', amount: 130000, group: 'Murree Trip' },
  { id: 2, who: 'Sara', direction: 'receive', amount: 40000, group: 'Flat 12B' },
  { id: 3, who: 'Hamza', direction: 'receive', amount: 170000, group: 'Flat 12B' },
]

/* ---------- shared class names (light first, dark: overrides) ---------- */
const card =
  'rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none'
const title = 'font-semibold text-gray-900 dark:text-white'
const muted = 'text-gray-500 dark:text-green-300/60'
const link =
  'text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200'
const row = 'rounded-xl bg-green-50 dark:bg-white/[0.03]'
const good = 'text-emerald-600 dark:text-emerald-300'
const bad = 'text-rose-600 dark:text-rose-400'

/* ---------- small pieces ---------- */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs shadow-md dark:border-white/10 dark:bg-[#06150f]">
      <p className="text-gray-500 dark:text-green-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
        {formatMoney(payload[0].value)}
      </p>
    </div>
  )
}

// Real groups list: handles loading, error and empty states.
function GroupsPanel({ groups, loading, error, uid }) {
  if (loading) {
    return (
      <ul className="space-y-3" aria-busy="true" aria-label="Loading groups">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-16 animate-pulse rounded-xl bg-emerald-100/60 dark:bg-white/5" />
        ))}
      </ul>
    )
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        {error.code === 'failed-precondition'
          ? 'This list needs a one-time Firestore index. Open the browser console (F12), click the link in the error, create the index, and wait a few minutes.'
          : 'Could not load your groups. Please refresh and try again.'}
      </p>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 p-6 text-center dark:border-white/10">
        <p className="text-sm font-medium text-gray-900 dark:text-white">You are not in any group yet</p>
        <p className={`mt-1 text-xs ${muted}`}>Create one to start splitting expenses.</p>
        <Link
          to="/app/groups/new"
          className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Create your first group
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {groups.map((g) => {
        const count = g.memberIds.length
        return (
          <li key={g.id}>
            <Link
              to={`/app/groups/${g.id}`}
              className={`flex items-center justify-between gap-3 p-3 transition hover:bg-emerald-50 dark:hover:bg-white/[0.06] ${row}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{g.name}</p>
                <p className={`text-xs ${muted}`}>
                  {count} member{count === 1 ? '' : 's'} · {g.currency}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {g.createdBy === uid && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Admin
                  </span>
                )}
                {g.archived && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-green-100">
                    Archived
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------- page ---------- */
export default function Dashboard() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const { groups, loading: groupsLoading, error: groupsError } = useGroups()

  const firstName = user?.displayName?.split(' ')[0] || 'there'
  const totalSpent = categories.reduce((sum, c) => sum + c.value, 0)

  // Real group numbers
  const activeCount = groups.filter((g) => !g.archived).length
  const archivedCount = groups.length - activeCount
  const createdCount = groups.filter((g) => g.createdBy === user?.uid).length

  const stats = [
    ...moneyStats,
    {
      label: 'Active groups',
      value: groupsLoading ? '...' : activeCount,
      hint: groupsLoading ? 'Loading...' : `${createdCount} created by you · ${archivedCount} archived`,
      tone: 'plain',
      isCount: true,
    },
  ]

  // Recharts draws with SVG attributes, so it can't use Tailwind dark: classes.
  const axisColor = isDark ? '#6ee7b7' : '#047857'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.15)'

  return (
    <div>
      {/* Page header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className={`text-sm ${muted}`}>
            Welcome back, {firstName}. Here is where everyone stands.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled
            title="Coming soon"
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-white/5"
          >
            Join group
          </button>
          <Link
            to="/app/groups/new"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            New group
          </Link>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="min-w-0 space-y-5">
          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className={card}>
                <p className={`text-sm ${muted}`}>{s.label}</p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    s.tone === 'good' ? good : s.tone === 'bad' ? bad : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {s.isCount ? s.value : formatMoney(s.value)}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-green-300/50">{s.hint}</p>
              </div>
            ))}
          </section>

          {/* Chart */}
          <section className={card}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className={title}>Group spending</h2>
                <p className={`text-sm ${muted}`}>Total shared expenses per month</p>
              </div>
              <Link to="/app" className={link}>Show more</Link>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: axisColor, fontSize: 12, opacity: 0.7 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => `${v / 100000}k`}
                    tick={{ fill: axisColor, fontSize: 12, opacity: 0.7 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#10b981', strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#spendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Bottom row */}
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className={card}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={title}>Recent expenses</h2>
                <Link to="/app" className={link}>Show more</Link>
              </div>
              <ul className="divide-y divide-emerald-100 dark:divide-white/5">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                      <p className={`text-xs ${muted}`}>{e.group} · {e.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatMoney(e.amount)}</p>
                      <p className={`text-xs ${muted}`}>{e.paidBy} paid</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={card}>
              <h2 className={`mb-4 ${title}`}>Suggested payments</h2>
              <ul className="space-y-3">
                {payments.map((p) => (
                  <li key={p.id} className={`flex items-center justify-between gap-3 p-3 ${row}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-900 dark:text-white">
                        {p.direction === 'pay' ? `You pay ${p.who}` : `${p.who} pays you`}
                      </p>
                      <p className={`text-xs ${muted}`}>{p.group}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${p.direction === 'pay' ? bad : good}`}>
                        {formatMoney(p.amount)}
                      </p>
                      {p.direction === 'pay' && (
                        <button type="button" className={`mt-1 ${link} !text-xs`}>
                          Settle up
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-5">
          <section className={card}>
            <h2 className={`mb-2 ${title}`}>Spending by category</h2>
            <div className="relative mx-auto h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" innerRadius={62} outerRadius={84} paddingAngle={3} stroke="none">
                    {categories.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatMoney(totalSpent)}</p>
                <p className={`text-xs ${muted}`}>this month</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {categories.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-700 dark:text-green-100">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className={muted}>{Math.round((c.value / totalSpent) * 100)}%</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Real groups from Firestore */}
          <section className={card}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={title}>
                Your groups
                {!groupsLoading && !groupsError && ` (${groups.length})`}
              </h2>
            </div>
            <GroupsPanel
              groups={groups}
              loading={groupsLoading}
              error={groupsError}
              uid={user?.uid}
            />
          </section>
        </div>
      </div>
    </div>
  )
}