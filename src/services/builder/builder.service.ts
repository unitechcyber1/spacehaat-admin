import { apiClient } from '../apiClient'
import type { ArrayResponse } from '../apiClient'

export type BuilderRow = { id?: string; _id?: string; name?: string; status?: string }

/** GET `admin/builders` — matches Angular `BuilderService.getBuilders`. */
export async function getBuilders(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<BuilderRow>>('admin/builders', { params })
  return res.data
}
