import { apiClient } from '../apiClient'
import type { ObjectResponse } from '../apiClient'

export async function saveUploadImageMeta(image: unknown) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/upload', image)
  return res.data
}

export async function deleteS3File(payload: unknown) {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/file/delete', payload)
  return res.data
}
