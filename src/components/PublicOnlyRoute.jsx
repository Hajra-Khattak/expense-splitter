import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import FullPageSpinner from './FullPageSpinner'

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  if (user) {
    const from = location.state?.from?.pathname || '/app'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}