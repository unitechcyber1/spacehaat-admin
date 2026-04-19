import { apiClient } from '../apiClient'
import type { ArrayResponse } from '../apiClient'

export type SubBuilderRow = { id?: string; _id?: string; name?: string; builder?: string }

/** GET `admin/subbuilders` — matches Angular `SubBuilderService.getSubBuilders`. */
export async function getSubBuilders(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<SubBuilderRow>>('admin/subbuilders', { params })
  return res.data
}
