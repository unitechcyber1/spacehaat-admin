import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { City } from './types'

export async function getCities(params: Record<string, any>) {
  const res = await apiClient.get<ArrayResponse<City>>('admin/cities', { params })
  return res.data
}

export async function getCitiesBySpaceType(params: Record<string, any>) {
  const res = await apiClient.get<ArrayResponse<City>>('admin/cities/citiesBySpaceType', { params })
  return res.data
}

export async function getCitiesByState(stateId: string) {
  const res = await apiClient.get<ArrayResponse<City>>(`admin/city/getCityByCountryState/${stateId}`)
  return res.data
}

export async function getCitiesByCountryOnly(countryId: string) {
  const res = await apiClient.get<ArrayResponse<City>>(`admin/city/getCityByCountryOnly/${countryId}`)
  return res.data
}

export async function saveCity(payload: any & { id?: string }) {
  if (payload.id) {
    const res = await apiClient.put<ObjectResponse<City>>(`admin/city/${payload.id}`, payload)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<City>>('admin/city', payload)
  return res.data
}

export async function removeCity(id: string) {
  const res = await apiClient.delete<ObjectResponse<City>>(`admin/city/delete/${id}`)
  return res.data
}

