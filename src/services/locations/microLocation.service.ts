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

