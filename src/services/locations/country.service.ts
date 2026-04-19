import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { Country } from './types'

export async function getCountries(params: Record<string, any>) {
  const res = await apiClient.get<ArrayResponse<Country>>('admin/countries', { params })
  return res.data
}

export async function saveCountry(payload: Partial<Country> & { id?: string }) {
  if (payload.id) {
    const res = await apiClient.put<ObjectResponse<Country>>(
      `admin/country/${payload.id}`,
      payload,
    )
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<Country>>('admin/country', payload)
  return res.data
}

export async function removeCountry(id: string) {
  const res = await apiClient.delete<ObjectResponse<Country>>(`admin/country/delete/${id}`)
  return res.data
}

