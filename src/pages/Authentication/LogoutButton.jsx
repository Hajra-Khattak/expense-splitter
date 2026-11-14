import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'

export default function LogoutButton({ className = '' }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Could not log out. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? 'Logging out...' : 'Log out'}
    </button>
  )
}