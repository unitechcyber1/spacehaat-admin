import { apiClient } from '../apiClient'

export type VerificationMethod = 'call' | 'visit' | 'documents'
export type Verification = { verified_at: string | null; verified_by: string; verified_method: VerificationMethod | '' }

/** Marks a coworking space or PG as verified today (by the logged-in admin), or removes it. */
export async function setListingVerification(
  kind: 'workspace' | 'pg',
  id: string,
  body: { method: VerificationMethod } | { remove: true },
): Promise<Verification> {
  const res = await apiClient.put<{ message: string; data: Verification }>(`admin/listing-verification/${kind}/${id}`, body)
  return res.data.data
}
