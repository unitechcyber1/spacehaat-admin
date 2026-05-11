import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'

export type PgRecord = Record<string, unknown>

export async function getPgs(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<PgRecord>>('admin/pgs', { params })
  return res.data
}

export async function getPgById(pgId: string) {
  const res = await apiClient.get<ObjectResponse<PgRecord>>(`admin/pg/${encodeURIComponent(pgId)}`)
  return res.data
}

export async function createPg(payload: Record<string, unknown>) {
  const res = await apiClient.post<ObjectResponse<PgRecord>>('admin/pg', payload)
  return res.data
}

export async function updatePg(id: string, payload: Record<string, unknown>) {
  const res = await apiClient.put<ObjectResponse<PgRecord>>(
    `admin/pg/${encodeURIComponent(id)}`,
    payload,
  )
  return res.data
}

export async function deletePg(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/pg/${encodeURIComponent(id)}`)
  return res.data
}

/** At least one of status, adminApproved, verified, active must be present in body. */
export async function changePgStatus(pgId: string, body: Record<string, unknown>) {
  const res = await apiClient.post<ObjectResponse<unknown>>(
    `admin/pg/changeStatus/${encodeURIComponent(pgId)}`,
    body,
  )
  return res.data
}
