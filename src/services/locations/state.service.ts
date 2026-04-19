import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { State } from './types'

export async function getStates(params: Record<string, any>) {
  const res = await apiClient.get<ArrayResponse<State>>('admin/states', { params })
  return res.data
}

export async function getStatesByCountry(countryId: string) {
  const res = await apiClient.get<ArrayResponse<State>>(`admin/stateByCountry/${countryId}`)
  return res.data
}

export async function saveState(payload: any & { id?: string }) {
  if (payload.id) {
    const res = await apiClient.put<ObjectResponse<State>>(`admin/state/${payload.id}`, payload)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<State>>('admin/state', payload)
  return res.data
}

export async function removeState(id: string) {
  const res = await apiClient.delete<ObjectResponse<State>>(`admin/state/delete/${id}`)
  return res.data
}

