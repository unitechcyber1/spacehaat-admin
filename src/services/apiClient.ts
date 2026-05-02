import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '../lib/env'
import {
  getAuthTokenFromStorage,
  isAuthTokenExpired,
  sessionExpiredLogout,
} from './auth/session'

function isLoginPost(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = (config?.url ?? '').toLowerCase()
  const method = (config?.method ?? 'get').toLowerCase()
  return method === 'post' && url.includes('login')
}

export const apiClient = axios.create({
  baseURL:
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL_LOCAL as string | undefined) ||
    env.apiBaseUrl ||
    'http://localhost:8000/api/',
})

apiClient.interceptors.request.use((config) => {
  if (!isLoginPost(config)) {
    const token = getAuthTokenFromStorage()
    if (token && isAuthTokenExpired(token)) {
      sessionExpiredLogout()
      return Promise.reject(new axios.Cancel('SESSION_EXPIRED'))
    }
    if (token) {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, unknown>).token = token
    }
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

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    const cfg = error.config
    if (status === 401 && !isLoginPost(cfg)) {
      sessionExpiredLogout()
    }
    return Promise.reject(error)
  },
)

export type ArrayResponse<T> = { message?: string; totalRecords?: number; data: T[] }
export type ObjectResponse<T> = { message?: string; totalRecords?: number; data: T }

