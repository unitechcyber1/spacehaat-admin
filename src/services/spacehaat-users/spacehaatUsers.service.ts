import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'

function stripParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

export async function listSpacehaatUsers(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<Record<string, unknown>>>('admin/userList', {
    params: stripParams({ ...params, roles: 'sales' }),
  })
  return res.data
}

export async function getSpacehaatUserById(userId: string) {
  const res = await apiClient.get<ObjectResponse<Record<string, unknown>>>(
    `admin/user/${encodeURIComponent(userId)}`,
  )
  return res.data
}

export async function deleteSpacehaatUser(userId: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(
    `admin/deleteUser/${encodeURIComponent(userId)}`,
  )
  return res.data
}

export async function createSpacehaatAdminUser(payload: {
  name: string | null
  password: string | null
  email: string | null
  phone_number: string | null
  role: string
}) {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/createAdmin', payload)
  return res.data
}

export async function updateSpacehaatAdminUser(payload: Record<string, unknown>) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/updateUser', payload)
  return res.data
}

export async function updateSpacehaatUserAccess(payload: Record<string, unknown>) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/updateAccess', payload)
  return res.data
}
