import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { SeoRecord } from './types'

/** `seo` → `Seo` model, `newSeo` → `NewSeo` model; both expose identical admin CRUD routes. */
export type SeoResource = 'seo' | 'newSeo'

export async function getSeos(params: Record<string, unknown>, resource: SeoResource = 'seo') {
  const res = await apiClient.get<ArrayResponse<SeoRecord>>(`admin/${resource}`, { params })
  return res.data
}

export async function getSeoById(seoId: string, resource: SeoResource = 'seo') {
  const res = await apiClient.get<ObjectResponse<SeoRecord>>(`admin/${resource}/${seoId}`)
  return res.data.data
}

export async function saveSeo(seo: SeoRecord, resource: SeoResource = 'seo') {
  const id = seo.id ?? seo._id
  if (id) {
    const res = await apiClient.put<ObjectResponse<SeoRecord>>(`admin/${resource}/${id}`, seo)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<SeoRecord>>(`admin/${resource}`, seo)
  return res.data
}

export async function deleteSeo(seoId: string, resource: SeoResource = 'seo') {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/${resource}/${seoId}`)
  return res.data
}
