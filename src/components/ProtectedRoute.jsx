import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import FullPageSpinner from './FullPageSpinner'

// Wraps pages that need a logged-in user.
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Firebase has not answered yet: we do not know if the person is logged in.
  if (loading) return <FullPageSpinner />

  // Logged out: go to login and remember where they were heading.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}