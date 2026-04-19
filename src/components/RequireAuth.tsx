import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../services/auth/auth.service'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/login?returnUrl=${returnUrl}`} replace />
  }
  return children
}

