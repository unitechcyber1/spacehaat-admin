import axios from 'axios'
import { env } from '../lib/env'

type StoredUser = { token?: string } | { user?: { token?: string } }

function getToken(): string | undefined {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return
    const parsed = JSON.parse(raw) as StoredUser
    return (parsed as any)?.token ?? (parsed as any)?.user?.token
  } catch {
    return
  }
}

export const apiClient = axios.create({
  baseURL:
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL_LOCAL as string | undefined) ||
    env.apiBaseUrl ||
    'http://localhost:8000/api/',
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as any).token = token
  }
  // Let the browser set multipart boundary for FormData (a preset Content-Type breaks uploads).
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers as Record<string, unknown> | undefined
    if (h) {
      delete h['Content-Type']
      delete h['content-type']
    }
  }
  return config
})

export type ArrayResponse<T> = { message?: string; totalRecords?: number; data: T[] }
export type ObjectResponse<T> = { message?: string; totalRecords?: number; data: T }

