import { getStoredUserInner, isStoredUserAdmin } from './auth.service'

const NO_ACCESS_PATH = '/layout/no-access'

function trimSlash(p: string) {
  return p.replace(/\/+$/, '') || '/'
}

/** Menu paths granted to the signed-in user (sales, etc.). Admins are not restricted by this list. */
export function getUserAccessPaths(): string[] {
  const inner = getStoredUserInner()
  if (!inner) return []
  const raw = inner.access
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.startsWith('/'))
}

/**
 * True when `pathname` is allowed for the current user.
 * - Admins: always true (except unauthenticated — caller must gate auth first).
 * - Others: pathname must exactly match, or be under, one of the `access` paths.
 * - `/layout/no-access` is always allowed for signed-in users (escape hatch + logout).
 */
export function isLayoutPathAllowed(pathname: string): boolean {
  const path = trimSlash(pathname)
  if (!path.startsWith('/layout')) return true
  if (path === trimSlash(NO_ACCESS_PATH)) return true
  if (isStoredUserAdmin()) return true

  const access = getUserAccessPaths()
  if (access.length === 0) return false

  for (const allowed of access) {
    const base = trimSlash(allowed)
    if (!base.startsWith('/layout')) continue
    if (path === base) return true
    if (path.startsWith(`${base}/`)) return true
  }
  return false
}

/** First screen after login or `/layout` when the user is restricted to a subset of routes. */
export function getDefaultLayoutPathForUser(): string {
  if (isStoredUserAdmin()) return '/layout/space-from-listing'
  const paths = getUserAccessPaths()
  if (paths.length === 0) return NO_ACCESS_PATH
  const preferred = '/layout/space-from-listing'
  if (paths.some((p) => trimSlash(p) === preferred)) return preferred
  const sorted = [...paths].map(trimSlash).sort((a, b) => a.localeCompare(b))
  return sorted[0] ?? NO_ACCESS_PATH
}

export function getNoAccessPath() {
  return NO_ACCESS_PATH
}

/** Use after login or for `returnUrl` — only allows in-profile `/layout` destinations. */
export function resolveSafeReturnUrl(raw: string | null | undefined): string {
  const fallback = getDefaultLayoutPathForUser()
  if (!raw || typeof raw !== 'string' || !raw.startsWith('/')) return fallback
  if (raw.startsWith('/auth')) return fallback
  const qIndex = raw.indexOf('?')
  const pathOnly = qIndex >= 0 ? raw.slice(0, qIndex) : raw
  const qs = qIndex >= 0 ? raw.slice(qIndex + 1) : ''
  if (!pathOnly.startsWith('/layout')) return fallback
  if (!isLayoutPathAllowed(pathOnly)) return fallback
  return qs ? `${pathOnly}?${qs}` : pathOnly
}
