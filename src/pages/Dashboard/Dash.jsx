
import React from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  CreditCard,
  Settings,
  Search,
  Bell,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Plus,
  MoreHorizontal,
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Smartphone,
  Coffee,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";

const COLORS = {
  dark: "#064E3B",
  deep: "#047857",
  primary: "#059669",
  accent: "#A7F3D0",
  background: "#F0FDF4",
};

const stats = [
  {
    title: "Total Balance",
    amount: "$12,395.10",
    change: "+14.50%",
    positive: true,
    icon: Wallet,
    data: "0,24 15,20 30,23 45,15 60,18 75,9 90,13 105,3 120,7",
  },
  {
    title: "Total Income",
    amount: "$4,210.00",
    change: "+25.00%",
    positive: true,
    icon: TrendingUp,
    data: "0,30 15,24 30,28 45,15 60,19 75,12 90,17 105,5 120,8",
  },
  {
    title: "Total Expenses",
    amount: "$4,613.40",
    change: "+12.30%",
    positive: false,
    icon: TrendingDown,
    data: "0,10 15,18 30,13 45,25 60,10 75,15 90,3 105,17 120,23",
  },
  {
    title: "Total Savings",
    amount: "$3,680.60",
    change: "+36.70%",
    positive: true,
    icon: Target,
    data: "0,28 15,19 30,4 45,14 60,25 75,12 90,20 105,7 120,2",
  },
];

const transactions = [
  {
    name: "Spotify Premium",
    category: "Entertainment",
    date: "Nov 12, 2026",
    amount: "-$11.99",
    status: "Approved",
    icon: Coffee,
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Grocery Store",
    category: "Groceries",
    date: "Nov 11, 2026",
    amount: "-$85.00",
    status: "Approved",
    icon: ShoppingBag,
    color: "bg-orange-100 text-orange-600",
  },
  {
    name: "Salary",
    category: "Income",
    date: "Nov 10, 2026",
    amount: "+$3,500.00",
    status: "Received",
    icon: Wallet,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Restaurant",
    category: "Food",
    date: "Nov 09, 2026",
    amount: "-$45.50",
    status: "Approved",
    icon: Utensils,
    color: "bg-pink-100 text-pink-600",
  },
];

const payments = [
  { name: "Netflix Subscription", date: "Nov 15, 2026", amount: "$15.99", icon: Smartphone },
  { name: "Internet Bill", date: "Nov 18, 2026", amount: "$35.00", icon: Wallet },
  { name: "House Rent", date: "Nov 20, 2026", amount: "$250.00", icon: Home },
];

const goals = [
  { name: "New Laptop", saved: "$1,200", target: "$2,000", progress: 60, color: "#059669" },
  { name: "Vacation", saved: "$850", target: "$1,500", progress: 57, color: "#34D399" },
  { name: "Emergency Fund", saved: "$3,200", target: "$5,000", progress: 64, color: "#047857" },
];

const categories = [
  { name: "Shopping", amount: "$1,200", percentage: "35%", color: "#059669", icon: ShoppingBag },
  { name: "Food & Dining", amount: "$850", percentage: "25%", color: "#34D399", icon: Utensils },
  { name: "Transport", amount: "$600", percentage: "20%", color: "#A7F3D0", icon: Car },
  { name: "Others", amount: "$400", percentage: "20%", color: "#047857", icon: Home },
];

function Sidebar() {
  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, active: true },
    { name: "Transactions", icon: ArrowLeftRight },
    { name: "My Wallet", icon: Wallet },
    { name: "Saving Goals", icon: Target },
    { name: "Payments", icon: CreditCard },
  ];

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#064E3B] text-white min-h-screen p-6">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-xl bg-[#A7F3D0] text-[#064E3B] flex items-center justify-center">
          <Wallet size={23} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">BudgetPlanner</h1>
      </div>

      <p className="text-xs uppercase tracking-widest text-emerald-200/60 mb-4">
        Main Menu
      </p>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.name}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
              item.active
                ? "bg-[#A7F3D0] text-[#064E3B] font-semibold"
                : "text-emerald-100 hover:bg-white/10"
            }`}
          >
            <item.icon size={19} />
            {item.name}
          </button>
        ))}
        <ThemeToggle/>
      </nav>

      <div className="mt-auto space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-emerald-100 hover:bg-white/10 rounded-xl">
          <Settings size={19} />
          Settings
        </button>
        <div className="border-t border-white/15 mt-5 pt-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#A7F3D0] text-[#064E3B] flex items-center justify-center font-bold">
            HK
          </div>
          <div>
            <p className="text-sm font-semibold">Hajra Khattak</p>
            <p className="text-xs text-emerald-200">Personal Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatCard({ item }) {
  return (
    <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-gray-500">{item.title}</p>
        <div className="p-2 rounded-lg bg-[#F0FDF4] text-[#059669]">
          <item.icon size={19} />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#064E3B] mb-2">
        {item.amount}
      </h2>

      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-semibold ${item.positive ? "text-emerald-600" : "text-red-500"}`}>
          {item.change}
        </span>
        <span className="text-xs text-gray-400">vs last month</span>
      </div>

      <svg viewBox="0 0 120 35" className="w-full h-10" preserveAspectRatio="none">
        <polyline
          points={item.data}
          fill="none"
          stroke={item.positive ? "#059669" : "#EF4444"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function IncomeChart() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm text-gray-500">Monthly Income</p>
          <h2 className="text-3xl font-bold text-[#064E3B] mt-2">$4,210.00</h2>
          <p className="text-xs text-emerald-600 mt-2">
            <TrendingUp size={14} className="inline mr-1" />
            25% increase from last month
          </p>
        </div>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 outline-none">
          <option>Last 7 months</option>
          <option>Last 30 days</option>
          <option>This year</option>
        </select>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox="0 0 700 230" className="w-full min-w-[450px]" preserveAspectRatio="none">
          {[30, 75, 120, 165, 210].map((y) => (
            <g key={y}>
              <line x1="40" y1={y} x2="690" y2={y} stroke="#E5E7EB" strokeDasharray="4 5" />
              <text x="5" y={y + 4} fontSize="11" fill="#9CA3AF">
                {250 - y}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          <path
            d="M40 150 L85 125 L125 145 L165 110 L205 130 L245 95 L285 115 L325 70 L365 90 L405 40 L445 85 L485 55 L525 110 L565 70 L605 95 L645 40 L690 65 L690 210 L40 210 Z"
            fill="url(#incomeGradient)"
          />

          <path
            d="M40 150 L85 125 L125 145 L165 110 L205 130 L245 95 L285 115 L325 70 L365 90 L405 40 L445 85 L485 55 L525 110 L565 70 L605 95 L645 40 L690 65"
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((month, i) => (
            <text key={month} x={40 + i * 108} y="228" fontSize="12" fill="#9CA3AF">
              {month}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function ExpenseBreakdown() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-[#064E3B]">Expense Breakdown</h3>
        <button className="text-xs text-emerald-700 font-medium">View all</button>
      </div>
           <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-white">
  <h1 className="text-2xl font-bold">
    Welcome to SplitEase
  </h1>

  <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
    <p className="text-gray-600 dark:text-gray-300">
      Manage your expenses easily.
    </p>
  </div>
</div>

      <div className="flex justify-center mb-7">
        <div
          className="w-48 h-48 rounded-full flex items-center justify-center"
          style={{
            background: "conic-gradient(#059669 0% 35%, #34D399 35% 60%, #A7F3D0 60% 80%, #047857 80% 100%)",
          }}
        >
          <div className="w-32 h-32 rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-xs text-gray-400">Total Expense</span>
            <span className="text-2xl font-bold text-[#064E3B]">$3,050</span>
            <span className="text-xs text-gray-400">This month</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#F0FDF4] text-[#047857]">
                <category.icon size={17} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{category.name}</p>
                <p className="text-xs text-gray-400">{category.percentage}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#064E3B]">{category.amount}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Transactions() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-semibold text-[#064E3B]">Recent Transactions</h3>
          <p className="text-xs text-gray-400 mt-1">Your latest financial activity</p>
        </div>
        <button className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
          View all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[550px]">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="pb-4 font-medium">Name</th>
              <th className="pb-4 font-medium">Date</th>
              <th className="pb-4 font-medium">Amount</th>
              <th className="pb-4 font-medium">Status</th>
              <th className="pb-4"></th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.name} className="border-b border-gray-50 last:border-0">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${transaction.color}`}>
                      <transaction.icon size={19} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{transaction.name}</p>
                      <p className="text-xs text-gray-400">{transaction.category}</p>
                    </div>
                  </div>
                </td>
                <td className="text-xs text-gray-500 py-4">{transaction.date}</td>
                <td className={`text-sm font-semibold py-4 ${transaction.amount.startsWith("+") ? "text-emerald-600" : "text-gray-700"}`}>
                  {transaction.amount}
                </td>
                <td className="py-4">
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">
                    {transaction.status}
                  </span>
                </td>
                <td className="py-4">
                  <button className="text-gray-400 hover:text-gray-700">
                    <MoreHorizontal size={19} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UpcomingPayments() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-semibold text-[#064E3B]">Upcoming Payments</h3>
        <button className="text-emerald-700 text-xs font-medium">See all</button>
      </div>

      <div className="space-y-5">
        {payments.map((payment) => (
          <div key={payment.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#047857] flex items-center justify-center">
                <payment.icon size={19} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{payment.name}</p>
                <p className="text-xs text-gray-400">{payment.date}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#064E3B]">{payment.amount}</p>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 bg-[#064E3B] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#047857] transition flex justify-center items-center gap-2">
        <Plus size={17} />
        Add Payment
      </button>
    </div>
  );
}

function SavingGoals() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-[#064E3B]">Saving Goals</h3>
        <button className="text-xs text-emerald-700 font-medium">View all</button>
      </div>

      <div className="space-y-6">
        {goals.map((goal) => (
          <div key={goal.name}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-700">{goal.name}</p>
              <span className="text-xs font-semibold text-[#047857]">{goal.progress}%</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
              />
            </div>

            <p className="text-xs text-gray-400 mt-2">
              {goal.saved} <span className="text-gray-300">of</span> {goal.target}
            </p>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 border border-emerald-200 text-[#047857] py-3 rounded-xl text-sm font-medium hover:bg-[#F0FDF4] transition flex justify-center items-center gap-2">
        <Plus size={17} />
        Create New Goal
      </button>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#F0FDF4] flex">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <p className="text-sm text-gray-500">Welcome back,</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#064E3B] mt-1">
              Dashboard Overview
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Here's what's happening with your money.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-sm text-gray-500">
              <Search size={17} />
              Search...
            </button>

            <button className="relative bg-white border border-emerald-100 p-3 rounded-xl text-[#047857]">
              <Bell size={19} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <button className="flex items-center gap-2 bg-white border border-emerald-100 rounded-xl p-2">
              <div className="w-8 h-8 rounded-lg bg-[#A7F3D0] text-[#064E3B] flex items-center justify-center font-bold text-xs">
                HK
              </div>
              <ChevronDown size={15} className="text-gray-500" />
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {stats.map((item) => (
            <StatCard key={item.title} item={item} />
          ))}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2">
            <IncomeChart />
          </div>
          <ExpenseBreakdown />
        </section>

        {/* Bottom section */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Transactions />
          </div>

          <div className="space-y-6">
            <UpcomingPayments />
            <SavingGoals />
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400 mt-8">
          © 2026 BudgetPlanner. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
