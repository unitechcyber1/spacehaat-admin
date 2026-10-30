import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'

export type ManagedOfficeStatus = 'pending' | 'approve' | 'reject' | 'inprogress'
export type ManagedOfficeSeatType = 'warm_shell' | 'ready_to_move_in' | 'bare_shell'

/** Managed office list row — loose typing for list payloads. */
export type ManagedOfficeListItem = {
  id?: string
  _id?: string
  name?: string
  slug?: string
  status?: ManagedOfficeStatus
  no_of_seats?: number
  centre_type?: string
  is_new_launch?: boolean
  brand?: { id?: string; name?: string; slug?: string } | string
  location?: {
    city?: { id?: string; name?: string } | string
    micro_location?: { id?: string; name?: string } | string
    micro_location_string?: string
    building_name?: string
  }
  images?: { order?: number; image?: { id?: string; s3_link?: string; title?: string } | string }[]
  plans?: { seat_type?: ManagedOfficeSeatType; price?: number; should_show?: boolean }[]
  added_on?: string
  updated_on?: string
}

export async function getManagedOffices(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<ManagedOfficeListItem>>('admin/managedOffices', { params })
  return res.data
}

export async function getManagedOfficeBrands() {
  const res = await apiClient.get<ArrayResponse<{ id?: string; name?: string; slug?: string }>>(
    'admin/managedOffices/brands',
  )
  return res.data
}

export async function getManagedOfficeById(id: string) {
  const res = await apiClient.get<ObjectResponse<Record<string, any>>>(
    `admin/managedOffice/${encodeURIComponent(id)}`,
  )
  return res.data
}

export async function saveManagedOffice(payload: Record<string, unknown>) {
  const id = payload.id as string | undefined
  if (id) {
    const res = await apiClient.put<ObjectResponse<Record<string, any>>>(
      `admin/managedOffice/${encodeURIComponent(id)}`,
      payload,
    )
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<Record<string, any>>>('admin/managedOffice', payload)
  return res.data
}

export async function changeManagedOfficeStatus(id: string, status: ManagedOfficeStatus) {
  if (!id) throw new Error('Missing managed office id')
  const res = await apiClient.post<ObjectResponse<unknown>>(
    `admin/managedOffice/changeStatus/${encodeURIComponent(id)}`,
    { status },
  )
  return res.data
}

export async function deleteManagedOffice(id: string) {
  if (!id) throw new Error('Missing managed office id')
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/managedOffice/${encodeURIComponent(id)}`)
  return res.data
}

export async function updateManagedOfficeSlug(body: { id: string; slug: string }) {
  const res = await apiClient.put<ObjectResponse<{ slug?: string }>>('admin/managedOffices/slug/update', body)
  return res.data
}
