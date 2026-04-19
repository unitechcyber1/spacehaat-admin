import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { WorkspaceListItem } from './types'

export async function getWorkspaces(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<WorkspaceListItem>>('admin/workspaces', { params })
  return res.data
}

export async function getWorkspaceById(workspaceId: string) {
  const res = await apiClient.get<ObjectResponse<WorkspaceListItem>>(`admin/workspace/${workspaceId}`)
  return res.data
}

export async function getPopularWorkspaces() {
  const res = await apiClient.get<ObjectResponse<{ popularSpaces?: WorkspaceListItem[] }>>(
    'admin/workSpace/popular/space',
  )
  return res.data
}

export async function savePopularWorkspace(payload: {
  id: string
  is_popular: { value: boolean; order: number }
}) {
  const id = String(payload.id)
  // Backend often expects Mongo `_id`; list APIs may only populate `_id`, and omitting `id` breaks lookups.
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/workSpace/popular', {
    data: { id, _id: id, is_popular: payload.is_popular },
  })
  return res.data
}

export async function changePopularSpacesOrder(payload: {
  initialPosition: number
  finalPosition: number
  shiftedId: string
}) {
  const res = await apiClient.post<ObjectResponse<unknown>>(
    'admin/workSpace/popular/changeOrder',
    payload,
  )
  return res.data
}

export async function getPriorityWorkspaces(params: { type?: string; city?: string }) {
  const res = await apiClient.get<ObjectResponse<{ prioritySpaces?: WorkspaceListItem[] }>>(
    'admin/workSpace/priority/type',
    { params },
  )
  return res.data
}

export async function savePriorityWorkspace(payload: {
  id: string
  type: string
  data: {
    is_active: boolean
    order: number
    city?: string
    name?: string
  }
}) {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/workSpace/priority', payload)
  return res.data
}

export async function changePrioritySpacesOrder(payload: Record<string, unknown>) {
  const res = await apiClient.post<ObjectResponse<unknown>>(
    'admin/workSpace/priority/changeOrder',
    payload,
  )
  return res.data
}

export async function changeWorkspaceStatus(workspace: WorkspaceListItem) {
  const res = await apiClient.post<ObjectResponse<unknown>>(
    `admin/workSpace/changeStatus/${workspace.id}`,
    workspace,
  )
  return res.data
}

export async function deleteWorkspace(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/workSpace/${id}`)
  return res.data
}

export async function saveWorkspace(payload: Record<string, unknown>) {
  const id = payload.id as string | undefined
  if (id) {
    const res = await apiClient.put<ObjectResponse<unknown>>(`admin/workSpace/${id}`, payload)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/workSpace', payload)
  return res.data
}

export async function updateWorkspaceSlug(body: { id: string; slug: string }) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/workspaces/slug/update', body)
  return res.data
}
