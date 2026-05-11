import { apiClient } from '../apiClient'
import type { LoginRequest, LoginResponse } from './auth.types'
import { clearStoredAuth, isAuthTokenExpired } from './session'

export async function login(payload: LoginRequest) {
  const res = await apiClient.post<LoginResponse>('admin/login', payload)
  // Storage key aligned with the main web app login payload.
  localStorage.setItem('user', JSON.stringify(res.data))
  return res.data
}

export function logout() {
  clearStoredAuth()
}

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Resolved profile object (login payload may nest under `user`). */
export function getStoredUserInner(): any | null {
  const u = getStoredUser()
  if (!u) return null
  return u.user ?? u
}

export function getStoredUserId(): string {
  const inner = getStoredUserInner()
  if (!inner) return ''
  return String(inner._id ?? inner.id ?? '')
}

export function getStoredUserRole(): string {
  const inner = getStoredUserInner()
  if (!inner) return ''
  return String(inner.role ?? '')
}

export function isStoredUserAdmin(): boolean {
  return getStoredUserRole() === 'admin'
}

/** Mirrors Angular admin: admins always; sales when `create_lead` is true. */
export function canCreateManualLead(): boolean {
  const inner = getStoredUserInner()
  if (!inner) return false
  if (inner.role === 'admin') return true
  return Boolean(inner.create_lead)
}

export function isAuthenticated() {
  const u = getStoredUser()
  const token = u?.token ?? u?.user?.token
  if (!token) return false
  if (isAuthTokenExpired(token)) {
    clearStoredAuth()
    return false
  }
  return true
}

