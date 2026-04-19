import { apiClient } from '../apiClient'
import type { LoginRequest, LoginResponse } from './auth.types'

export async function login(payload: LoginRequest) {
  const res = await apiClient.post<LoginResponse>('admin/login', payload)
  // Storage key aligned with the main web app login payload.
  localStorage.setItem('user', JSON.stringify(res.data))
  return res.data
}

export function logout() {
  localStorage.removeItem('user')
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
  return Boolean(token)
}

