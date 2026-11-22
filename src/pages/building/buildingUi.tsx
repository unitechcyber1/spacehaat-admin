import { env } from '../../lib/env'

export function buildingWebsiteUrl(slug?: string) {
  return slug ? `${env.websitePath.replace(/\/$/, '')}/building/${slug}` : ''
}

/** Message from an API error (`{ message }` body) or a thrown Error. */
export function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } }; message?: string } | null
  return err?.response?.data?.message ?? err?.message ?? fallback
}

/** City rows for SearchableCitySelect (the API returns `id` or `_id`). */
export function cityOptions(rows: Array<{ id?: string; _id?: string; name?: string }> | undefined) {
  return (rows ?? []).map((c) => ({ id: String(c.id ?? c._id ?? ''), name: c.name }))
}
