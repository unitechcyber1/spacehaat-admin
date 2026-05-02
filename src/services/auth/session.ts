/** Shared auth storage + JWT expiry helpers (no axios — safe to import from apiClient). */

type StoredUser = { token?: string } | { user?: { token?: string } }

export function getAuthTokenFromStorage(): string | undefined {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return
    const parsed = JSON.parse(raw) as StoredUser
    return (parsed as { token?: string }).token ?? (parsed as { user?: { token?: string } }).user?.token
  } catch {
    return
  }
}

export function clearStoredAuth() {
  localStorage.removeItem('user')
}

function base64UrlToJson(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const pad = (4 - (base64.length % 4)) % 4
    const padded = base64 + '='.repeat(pad)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Returns Unix `exp` seconds from JWT payload, or null if not a JWT / no exp. */
export function getJwtExpirySeconds(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const payload = base64UrlToJson(parts[1])
  if (!payload || typeof payload.exp !== 'number') return null
  return payload.exp
}

/**
 * True when JWT `exp` is in the past (with skew). False for opaque/non-JWT tokens
 * (those rely on API 401 handling).
 */
export function isAuthTokenExpired(token: string, skewSeconds = 60): boolean {
  const exp = getJwtExpirySeconds(token)
  if (exp == null) return false
  return Date.now() >= (exp - skewSeconds) * 1000
}

export function redirectToLoginWithReturnUrl() {
  const returnPath = window.location.pathname + window.location.search
  const qs = returnPath && returnPath !== '/auth/login' ? `?returnUrl=${encodeURIComponent(returnPath)}` : ''
  window.location.assign(`/auth/login${qs}`)
}

let sessionExpiredHandling = false

/** Clears auth and hard-redirects to login (axios layer — no React Router). */
export function sessionExpiredLogout() {
  if (sessionExpiredHandling) return
  sessionExpiredHandling = true
  clearStoredAuth()
  redirectToLoginWithReturnUrl()
}
