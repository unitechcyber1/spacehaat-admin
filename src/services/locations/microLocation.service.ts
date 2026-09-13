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

/** Priority admin — mirrors Angular `MicroLocationService` priority endpoints. */
export type MicroLocationSpaceType = 'for_coworking' | 'for_coliving' | 'for_office'

export type MicroLocationPriorityRow = MicroLocation & {
  _id?: string
  isSelected?: boolean
  priority?: Partial<
    Record<
      MicroLocationSpaceType,
      { order?: number; is_active?: boolean; city?: string; name?: string }
    >
  >
}

export async function getMicroLocationsByCityAndSpaceType(params: Record<string, unknown>) {
  const res = await apiClient.get<
    ArrayResponse<MicroLocation> & { totleRecords?: number }
  >('admin/microLocationByCityAndSpaceType', { params })
  const body = res.data
  return {
    ...body,
    totalRecords:
      body.totalRecords ?? body.totleRecords ?? (Array.isArray(body.data) ? body.data.length : 0),
  }
}

export async function getPriorityMicrolocations(params: { type: string; city: string }) {
  const res = await apiClient.get<
    ObjectResponse<{ prioritySpaces?: MicroLocationPriorityRow[] }>
  >('admin/microLocation/priority/type', { params })
  return res.data
}

export async function saveMicrolocationPriority(payload: {
  id: string
  type: string
  data: { is_active: boolean; order: number; city?: string; name?: string }
}) {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/microLocation/priority', payload)
  return res.data
}

export async function dragMicrolocationPriority(payload: {
  updatedLocations: MicroLocationPriorityRow[]
  spaceType: string
}) {
  const res = await apiClient.put<ObjectResponse<unknown>>(
    'admin/microLocation/priority/drag',
    payload,
  )
  return res.data
}

