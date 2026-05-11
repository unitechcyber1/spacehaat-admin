import { apiClient } from '../apiClient'
import type { ArrayResponse, ObjectResponse } from '../apiClient'

export type EnquiryLead = Record<string, unknown>
export type GroupedEnquiryRow = { latestLead: EnquiryLead; allLeads: EnquiryLead[] }

function stripListParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

export async function getEnquiries(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<GroupedEnquiryRow>>('admin/enquiries', {
    params: stripListParams(params),
  })
  return res.data
}

export async function getEnquiryById(id: string) {
  const res = await apiClient.get<ObjectResponse<EnquiryLead>>(`admin/enquiry/${encodeURIComponent(id)}`)
  return res.data
}

export async function createManualLead(payload: Record<string, unknown>) {
  const res = await apiClient.post<ObjectResponse<EnquiryLead>>('admin/lead/add', payload)
  return res.data
}

export async function updateManualLead(payload: Record<string, unknown>) {
  const res = await apiClient.put<ObjectResponse<EnquiryLead>>('admin/lead/update', payload)
  return res.data
}

export async function deleteLead(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/deletelead/${encodeURIComponent(id)}`)
  return res.data
}

export async function deleteManyLeads(body: { leads: string[] }) {
  const res = await apiClient.delete<ObjectResponse<unknown>>('admin/deleteMany', { data: body })
  return res.data
}

export async function updateLeadFields(body: Record<string, unknown>) {
  const res = await apiClient.put<ObjectResponse<EnquiryLead>>('admin/update/lead', body)
  return res.data
}

export async function changeEnquiryStatus(leadId: string, body: Record<string, unknown>) {
  const res = await apiClient.post<ObjectResponse<EnquiryLead>>(
    `admin/enquiry/changeStatus/${encodeURIComponent(leadId)}`,
    body,
  )
  return res.data
}

export async function addNoteToLead(body: { id: string; noteContent: string; user: string }) {
  const res = await apiClient.put<ObjectResponse<EnquiryLead>>('admin/add/note', body)
  return res.data
}

export async function deleteNoteInLead(body: { leadId: string; noteId: string }) {
  const res = await apiClient.put<ObjectResponse<EnquiryLead>>('admin/delete/note', body)
  return res.data
}

export async function updateNoteInLead(body: {
  leadId: string
  noteId: string
  updatedContent: string
  user?: string
}) {
  const res = await apiClient.put<ObjectResponse<EnquiryLead>>('admin/update/note', body)
  return res.data
}

export async function updateLeadAccess(body: { leads: string[]; users: string[] }) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/leads/access', body)
  return res.data
}

export async function removeLeadAccess(body: { leads: string[]; users: string[] }) {
  const res = await apiClient.put<ObjectResponse<unknown>>('admin/leads/removeAccess', body)
  return res.data
}

export async function exportLeads(params: Record<string, unknown>) {
  const cleaned = stripListParams(params)
  const res = await apiClient.get<Blob>('admin/exportleads', {
    params: { ...cleaned, limit: '' },
    responseType: 'blob',
  })
  return res.data
}

export type ListingUser = { _id?: string; id?: string; name?: string; lead_source?: string; isMarketing?: boolean }

export async function getListingSalesUsers(params: Record<string, unknown>) {
  const res = await apiClient.get<ArrayResponse<ListingUser>>('admin/userList', {
    params: { ...stripListParams(params), roles: 'sales', limit: 100 },
  })
  return res.data
}
