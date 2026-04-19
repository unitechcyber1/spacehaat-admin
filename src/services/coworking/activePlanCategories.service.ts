import { apiClient } from '../apiClient'
import type { ArrayResponse } from '../apiClient'

/** Active coworking plan categories — `admin/Active_category`. */
export type PlanCategoryOption = { id?: string; name?: string; description?: string }

export async function getActivePlanCategories() {
  const res = await apiClient.get<ArrayResponse<PlanCategoryOption>>('admin/Active_category')
  return res.data
}
