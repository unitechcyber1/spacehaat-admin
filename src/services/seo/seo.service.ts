import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { SeoRecord } from './types'

export async function getSeos(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<SeoRecord>>('admin/seo', { params })
  return res.data
}

export async function getSeoById(seoId: string) {
  const res = await apiClient.get<ObjectResponse<SeoRecord>>(`admin/seo/${seoId}`)
  return res.data.data
}

export async function saveSeo(seo: SeoRecord) {
  const id = seo.id ?? seo._id
  if (id) {
    const res = await apiClient.put<ObjectResponse<SeoRecord>>(`admin/seo/${id}`, seo)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<SeoRecord>>('admin/seo', seo)
  return res.data
}

export async function deleteSeo(seoId: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/seo/${seoId}`)
  return res.data
}
