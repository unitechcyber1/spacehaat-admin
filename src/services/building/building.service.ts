import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'

export type CentreType = 'coworking' | 'managed_office'

type IdName = { _id?: string; id?: string; name?: string } | null

export type BuildingRecord = {
  id?: string
  _id?: string
  name: string
  slug?: string
  city?: IdName | string
  micro_location?: IdName | string
  address?: string
  latitude?: number | null
  longitude?: number | null
  image?: string
  description?: string
  is_active?: boolean
  coworking_count?: number
  managed_office_count?: number
  /** Approved, active centres. The website shows a page when this is 2 or more. */
  live_centres?: number
  has_page?: boolean
}

export type BuildingCentre = {
  type: CentreType
  id: string
  name: string
  slug: string
  status?: string
  live: boolean
  city: string | null
  area: string | null
  address: string | null
  building_id: string | null
  building_name: string | null
}

export type BuildingDetail = BuildingRecord & { centres: BuildingCentre[] }

/** Website rule: a building page needs this many live centres. */
export const MIN_CENTRES_FOR_BUILDING_PAGE = 2

export function refId(v: IdName | string | undefined): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  return String(v._id ?? v.id ?? '')
}

export function refName(v: IdName | string | undefined): string {
  return v && typeof v === 'object' ? String(v.name ?? '') : ''
}

export async function getBuildings(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<BuildingRecord>>('admin/buildings', { params })
  return res.data
}

export async function getBuilding(id: string) {
  const res = await apiClient.get<ObjectResponse<BuildingDetail>>(`admin/building/${id}`)
  return res.data.data
}

export async function saveBuilding(payload: Partial<BuildingRecord>, id?: string) {
  const res = id
    ? await apiClient.put<ObjectResponse<BuildingDetail>>(`admin/building/${id}`, payload)
    : await apiClient.post<ObjectResponse<BuildingDetail>>('admin/building', payload)
  return res.data.data
}

export async function deleteBuilding(id: string) {
  await apiClient.delete(`admin/building/${id}`)
}

export async function searchBuildingCentres(q: string, city?: string) {
  const res = await apiClient.get<ArrayResponse<BuildingCentre>>('admin/building-centres/search', {
    params: { q, ...(city ? { city } : {}) },
  })
  return res.data.data
}

export type CentreBuilding = { building: { id: string; name: string; slug: string; is_active: boolean } | null }

export async function getCentreBuilding(type: CentreType, id: string) {
  const res = await apiClient.get<ObjectResponse<CentreBuilding>>(`admin/building-centre/${type}/${id}`)
  return res.data.data
}

/** Put a centre in a building (`buildingId`) or take it out of its building (`null`). Saves at once. */
export async function setCentreBuilding(type: CentreType, id: string, buildingId: string | null) {
  const res = await apiClient.put<ObjectResponse<CentreBuilding>>('admin/building-centre', {
    type,
    id,
    building_id: buildingId,
  })
  return res.data.data
}
