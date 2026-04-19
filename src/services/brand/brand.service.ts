import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { Brand } from './types'

export async function getBrands(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<Brand>>('admin/brands', { params })
  return res.data
}

export async function getBrandById(brandId: string) {
  const res = await apiClient.get<ObjectResponse<Brand>>(`admin/brand/${brandId}`)
  return res.data
}

export async function saveBrand(brand: Brand) {
  if (brand.id) {
    const res = await apiClient.put<ObjectResponse<Brand>>(`admin/brand/${brand.id}`, brand)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<Brand>>('admin/brand', brand)
  return res.data
}

export async function deleteBrand(brandId: string) {
  const res = await apiClient.delete<ObjectResponse<Brand>>(`admin/brand/${brandId}`)
  return res.data
}
