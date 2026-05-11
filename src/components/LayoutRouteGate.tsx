import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../services/auth/auth.service'
import {
  getDefaultLayoutPathForUser,
  isLayoutPathAllowed,
} from '../services/auth/routeAccess'

/**
 * After `RequireAuth`, restricts `/layout/**` to routes listed in the signed-in user's `access`
 * (except admins, who may use any layout route). Unknown paths redirect to the user's default
 * layout URL or `/layout/no-access`.
 */
export function LayoutRouteGate() {
  const location = useLocation()
  if (!isAuthenticated()) return <Outlet />

  const path = location.pathname
  if (isLayoutPathAllowed(path)) return <Outlet />

  const fallback = getDefaultLayoutPathForUser()
  return <Navigate to={fallback} replace state={{ from: path }} />
}
