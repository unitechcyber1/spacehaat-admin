import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'
import type { MediaItem, MediaImageRef } from './types'

/** GET `admin/medias` — matches Angular `FeaturedSpaceService.getMedia`. */
export async function getMedias(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<MediaItem>>('admin/medias', { params })
  return res.data
}

/**
 * No dedicated GET-by-id in Angular; walk pages until the row is found (same data as list).
 */
export async function getMediaByIdScan(mediaId: string): Promise<MediaItem | null> {
  let page = 1
  const limit = 100
  for (let i = 0; i < 50; i++) {
    const res = await getMedias({ limit, page })
    const rows = res.data ?? []
    const found = rows.find((r) => String(r.id ?? r._id) === mediaId)
    if (found) return found
    const total = res.totalRecords ?? 0
    if (rows.length === 0 || page * limit >= total) break
    page += 1
  }
  return null
}

/** POST `admin/media` or PUT `admin/media/:id` — matches `saveMediaImage`. */
export async function saveMedia(payload: MediaItem) {
  const id = payload.id ?? payload._id
  if (id) {
    const res = await apiClient.put<ObjectResponse<MediaItem>>(`admin/media/${id}`, payload)
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<MediaItem>>('admin/media', payload)
  return res.data
}

/**
 * POST `admin/media/delete/:id` with image payload — matches `deleteMediaImage`.
 * Second argument is the image object (Angular passes `element?.image`).
 */
export async function deleteMedia(mediaId: string, imagePayload: MediaImageRef | Record<string, unknown>) {
  const res = await apiClient.post<ObjectResponse<unknown>>(`admin/media/delete/${mediaId}`, imagePayload)
  return res.data
}
