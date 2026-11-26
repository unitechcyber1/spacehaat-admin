import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'

export type VoStatus = 'Active' | 'Inactive'

export type VoImage = { url: string; name?: string }

export type VirtualOfficeListing = {
  id?: string
  spaceName: string
  slug?: string
  city: string
  state?: string
  locality?: string
  fullAddress?: string
  phoneNumber?: string
  status?: VoStatus
  isActive?: boolean
  /** What the operator charges us, per year. */
  annualPriceInr?: number
  monthlyPriceInr?: number
  /** What the customer pays, per year. */
  sellingPriceInr?: number
  sellingMonthlyPriceInr?: number
  priceAfterCouponInr?: number
  marginInr?: number | null
  cityTier?: string
  amenities?: string
  amenityList?: string[]
  contactNotes?: string
  remarks?: string
  lastUpdatedLabel?: string
  couponCode?: string
  couponPercentage?: number
  images?: VoImage[]
  added_on?: string
  updated_on?: string
}

export type VoStats = {
  totals: { total: number; active: number; inactive: number; withCoupon: number; minPrice: number; maxPrice: number; noPrice: number }
  cities: { city: string; total: number; active: number }[]
  tiers: string[]
}

export const VO_TIERS = ['Tier 1', 'Tier 2', 'Tier 3']

/** Amenities offered with most plans; the field is free text, these are quick picks. */
export const VO_AMENITY_PICKS = [
  'Business Address',
  'Mail Handling',
  'GST Registration',
  'Company Registration',
  'Meeting Rooms',
  'Reception Services',
  'Lounge Access',
  'Dedicated Support',
]

export async function listVirtualOffices(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<VirtualOfficeListing>>('admin/virtualOfficeListings', { params })
  return res.data
}

export async function getVirtualOfficeStats() {
  const res = await apiClient.get<ObjectResponse<VoStats>>('admin/virtualOfficeListings/stats')
  return res.data.data
}

export async function getVirtualOffice(id: string) {
  const res = await apiClient.get<ObjectResponse<VirtualOfficeListing>>(`admin/virtualOfficeListings/${id}`)
  return res.data.data
}

export async function saveVirtualOffice(vo: VirtualOfficeListing) {
  if (vo.id) {
    const res = await apiClient.put<ObjectResponse<VirtualOfficeListing>>(`admin/virtualOfficeListings/${vo.id}`, vo)
    return res.data.data
  }
  const res = await apiClient.post<ObjectResponse<VirtualOfficeListing>>('admin/virtualOfficeListings', vo)
  return res.data.data
}

export async function deleteVirtualOffice(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/virtualOfficeListings/${id}`)
  return res.data
}

export function formatInr(n?: number | null) {
  if (!n) return '—'
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** Server message from an axios error, else the error's own message. */
export function errorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message ?? err?.message ?? fallback
}
