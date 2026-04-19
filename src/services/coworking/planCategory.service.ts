import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { CoworkingCategoryPlan } from './types'

export async function getCoworkingCategoryPlans(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<CoworkingCategoryPlan>>('admin/categorys', { params })
  return res.data
}

export async function saveCoworkingCategoryPlan(payload: CoworkingCategoryPlan) {
  if (payload.id) {
    const res = await apiClient.put<ObjectResponse<CoworkingCategoryPlan>>(
      `admin/category/${payload.id}`,
      payload,
    )
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<CoworkingCategoryPlan>>('admin/category', payload)
  return res.data
}

export async function deleteCoworkingCategoryPlan(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/category/${id}`)
  return res.data
}

export async function changeCoworkingCategoryStatus(id: string) {
  const res = await apiClient.get<ObjectResponse<unknown>>(`admin/category/changeStatus/${id}`)
  return res.data
}
