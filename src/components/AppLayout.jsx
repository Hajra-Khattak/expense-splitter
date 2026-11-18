import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import { useAuth } from '../hooks/useAuth'
import { ensureProfile } from '../services/friendService'

const icons = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z',
  plus: 'M12 5v14M5 12h14',
  users: 'M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-6 1.3-6 4v2h12v-2c0-2.7-3.3-4-6-4Zm8 0c-.3 0-.6 0-1 .1 1.2.9 2 2.1 2 3.9v2h6v-2c0-2.7-3.3-4-7-4Z',
  user: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z',
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  )
}

// later: Groups, Balances, Stats
const navItems = [
  { to: '/app', label: 'Overview', icon: 'home', end: true },
  { to: '/app/groups/new', label: 'New group', icon: 'plus' },
  { to: '/app/friends', label: 'Friends', icon: 'users' },
  { to: '/app/profile', label: 'Profile', icon: 'user' },
]

const STORAGE_KEY = 'sidebar-collapsed'

// Remember the choice on this device. Default: collapsed (icons only).
function getInitialCollapsed() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') return true
    if (saved === 'false') return false
  } catch {
    // storage can be blocked
  }
  return true
}

const linkClass =
  (collapsed) =>
  ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      collapsed ? 'md:justify-center md:px-0' : ''
    } ${
      isActive
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300'
        : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-green-200/70 dark:hover:bg-white/5 dark:hover:text-green-100'
    }`

function Logo() {
  return (
    <Link to="/app" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">
        S
      </span>
      <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
        SplitEase.
      </span>
    </Link>
  )
}

export default function AppLayout() {
  const [open, setOpen] = useState(false) // mobile drawer
  const [collapsed, setCollapsed] = useState(getInitialCollapsed) // desktop sidebar

  // Save the desktop sidebar choice.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  // Close the mobile drawer with Escape (only listen while it is open).
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const { user } = useAuth()
const { uid, displayName, email, photoURL } = user ?? {}

useEffect(() => {
  if (!uid) return
  ensureProfile({ uid, displayName, email, photoURL }).catch((err) =>
    console.error('profile sync failed', err.code, err.message)
  )
}, [uid, displayName, email, photoURL])

  return (
    <div className="min-h-screen bg-green-50 text-gray-800 dark:bg-[#06150f] dark:text-green-50">
      {/* Navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-emerald-100 bg-white/90 px-4 backdrop-blur dark:border-white/5 dark:bg-[#08190f]/90 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-nav"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 text-emerald-700 transition hover:bg-emerald-50 dark:border-white/10 dark:text-emerald-300 dark:hover:bg-white/10 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Logo />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* Dark overlay behind the drawer (small screens only) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Navigation: a drawer on small screens, a collapsible sidebar from md up */}
      <aside
        id="app-nav"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-emerald-100 bg-white p-4 transition-[transform,width] duration-200 dark:border-white/5 dark:bg-[#08190f] md:visible md:top-16 md:z-20 md:translate-x-0 ${
          collapsed ? 'md:w-20' : 'md:w-64'
        } ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        {/* Drawer header (small screens only) */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-emerald-50 dark:text-green-300 dark:hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={linkClass(collapsed)}
            >
              <Icon name={item.icon} />
              {/* The label is always visible in the mobile drawer, and hidden on desktop when collapsed */}
              <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Collapse / expand button (desktop only) */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : undefined}
          className={`mt-auto hidden items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-green-200/60 dark:hover:bg-white/5 dark:hover:text-green-100 md:flex ${
            collapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      {/* Page content: the left margin follows the sidebar width */}
      <main
        className={`min-w-0 p-4 transition-[margin] duration-200 sm:p-6 lg:p-8 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Outlet />
      </main>
    </div>
  )
}