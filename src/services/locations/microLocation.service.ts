import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { MicroLocation } from './types'

export async function getMicroLocations(params: Record<string, any>) {
  const res = await apiClient.get<ArrayResponse<MicroLocation>>('admin/microLocations', { params })
  return res.data
}

export async function getMicroLocationsByCity(cityId: string) {
  const res = await apiClient.get<ArrayResponse<MicroLocation>>(`admin/microLocationByCity/${cityId}`)
  return res.data
}

/**
 * Form picker: same listing as the micro-location admin page — filter by `city` and optional `name`
 * (query params). Use when you need search; `getMicroLocationsByCity` stays for simple full lists.
 */
export async function getMicroLocationsForCityForm(cityId: string, options?: { name?: string }) {
  const params: Record<string, unknown> = {
    city: cityId,
    limit: 5000,
    page: 1,
  }
  const raw = options?.name?.trim()
  if (raw) params.name = raw.toLowerCase()
  const res = await apiClient.get<ArrayResponse<MicroLocation>>('admin/microLocations', { params })
  return res.data
}

export async function saveMicroLocation(payload: any & { id?: string }) {
  if (payload.id) {
    const res = await apiClient.put<ObjectResponse<MicroLocation>>(
      `admin/microLocation/${payload.id}`,
      payload,
    )
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<MicroLocation>>('admin/microLocation', payload)
  return res.data
}

export async function removeMicroLocation(id: string) {
  const res = await apiClient.delete<ObjectResponse<MicroLocation>>(
    `admin/microLocation/delete/${id}`,
  )
  return res.data
}

