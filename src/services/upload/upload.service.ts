import { apiClient } from '../apiClient'

/**
 * Unwrap common POST `admin/upload` response shapes:
 * `[item]`, `{ data: [item] }`, `{ data: item }`.
 */
export function normalizeUploadResponse(body: unknown): any {
  if (body == null) return body
  if (typeof body !== 'object') return body
  if (Array.isArray(body)) return body[0] ?? body
  const b = body as Record<string, unknown>
  const d = b.data
  if (Array.isArray(d) && d.length) return d[0]
  if (d && typeof d === 'object' && !Array.isArray(d)) return d
  return body
}

/** POST multipart file to `admin/upload`. */
export async function uploadAdminFile(file: File, category = '') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', category)
  const res = await apiClient.post<unknown>('admin/upload', fd)
  return normalizeUploadResponse(res.data)
}
