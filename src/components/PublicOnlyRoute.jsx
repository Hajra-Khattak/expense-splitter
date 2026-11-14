import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import FullPageSpinner from './FullPageSpinner'

// Wraps pages only for logged-out people (login, signup, forgot password).
export default function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  // Logged in: go back to the page they wanted, or to the app.
  if (user) {
    const from = location.state?.from?.pathname || '/app'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}