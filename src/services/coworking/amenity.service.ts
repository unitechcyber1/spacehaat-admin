import { apiClient } from '../apiClient'
import type { ArrayResponse } from '../apiClient'

export type Amenity = {
  id: string
  name?: string
  category?: string
  for_coWorking?: boolean
  checked?: boolean
}

export async function getAmenities(params: Record<string, unknown> = {}) {
  const res = await apiClient.get<ArrayResponse<Amenity>>('admin/amenties', {
    params: { limit: 1000, ...params },
  })
  return res.data
}
