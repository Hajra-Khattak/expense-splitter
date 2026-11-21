import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { getInitials } from '../utils/getInitials'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef(null)

  const name = user?.displayName || 'Account'
  const initial = getInitials(user?.displayName)

  useEffect(() => {
    if (!open) return

    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Could not log out. Please try again.')
      setLoggingOut(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white py-1 pl-1 pr-3 transition hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-800 dark:text-green-50 sm:block">
          {name}
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 text-gray-500 transition dark:text-green-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-lg dark:border-white/10 dark:bg-[#0c1f17]"
        >
          <div className="border-b border-emerald-100 px-4 py-3 dark:border-white/10">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-green-300/70">{user?.email}</p>
          </div>

          <div className="p-1">
            <Link
              to="/app/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-gray-700 transition hover:bg-emerald-50 dark:text-green-100 dark:hover:bg-white/5"
            >
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}