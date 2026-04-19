import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { AmenityRecord } from './types'

/** GET `admin/amenties` — matches `AmentyService.getAmentiesList`. */
export async function getAmenities(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<AmenityRecord>>('admin/amenties', { params })
  return res.data
}

export async function saveAmenity(amenity: AmenityRecord) {
  const id = amenity.id ?? amenity._id
  if (id) {
    const res = await apiClient.put<ObjectResponse<AmenityRecord>>(`admin/amenty/${id}`, amenity)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<AmenityRecord>>('admin/amenty', amenity)
  return res.data
}

export async function deleteAmenity(amenityId: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/amenty/${amenityId}`)
  return res.data
}
