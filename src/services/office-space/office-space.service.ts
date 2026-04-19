import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { OfficeSpaceListItem } from './types'

/** GET `admin/officeSpaces` — matches `OfficeSpaceService.getOfficeSpaces`. */
export async function getOfficeSpaces(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<OfficeSpaceListItem>>('admin/officeSpaces', { params })
  return res.data
}

export async function getOfficeSpaceById(officeSpaceId: string) {
  const res = await apiClient.get<ObjectResponse<Record<string, unknown>>>(`admin/officeSpaces/${officeSpaceId}`)
  return res.data
}

export async function saveOfficeSpace(officeSpace: Record<string, unknown>) {
  const id = officeSpace.id ?? officeSpace._id
  if (id) {
    const res = await apiClient.put<ObjectResponse<Record<string, unknown>>>(
      `admin/officeSpaces/${id}`,
      officeSpace,
    )
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<Record<string, unknown>>>('admin/officeSpaces', officeSpace)
  return res.data
}

export async function updateOfficeSlug(payload: { id: string; slug: string }) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/officeSpaces/slug/update', payload)
  return res.data
}

export async function changeOfficeSpaceStatus(officeSpace: OfficeSpaceListItem) {
  const id = officeSpace.id ?? officeSpace._id
  const res = await apiClient.post<ObjectResponse<unknown>>(
    `admin/officeSpaces/changeStatus/${id}`,
    officeSpace,
  )
  return res.data
}

export async function deleteOfficeSpace(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/officeSpaces/${id}`)
  return res.data
}
