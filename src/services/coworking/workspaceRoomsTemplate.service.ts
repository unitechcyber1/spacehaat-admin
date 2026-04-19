import { apiClient } from '../apiClient'
import type { ArrayResponse } from '../apiClient'

/** Room type templates for workspace `rooms[]` — `admin/rooms`. */
export type WorkspaceRoomTemplate = { id?: string; name?: string }

export async function getWorkspaceRoomTemplates(params: Record<string, unknown> = {}) {
  const res = await apiClient.get<ArrayResponse<WorkspaceRoomTemplate>>('admin/rooms', { params })
  return res.data
}
