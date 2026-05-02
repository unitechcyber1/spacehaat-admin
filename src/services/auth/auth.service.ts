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

