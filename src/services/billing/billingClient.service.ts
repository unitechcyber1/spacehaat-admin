import { apiClient, type ArrayResponse, type ObjectResponse } from '../apiClient'
import type {
  BillingClient,
  BillingClientMeta,
  BillingClientPayload,
  Invoice,
} from '../../types/billing'

export async function getBillingClientMeta() {
  const res = await apiClient.get<ObjectResponse<BillingClientMeta>>('admin/billing-clients/meta')
  return res.data.data
}

export async function listBillingClients(params: Record<string, string | number>) {
  const res = await apiClient.get<ArrayResponse<BillingClient>>('admin/billing-clients', { params })
  return res.data
}

export async function getBillingClient(id: string) {
  const res = await apiClient.get<ObjectResponse<BillingClient>>(`admin/billing-clients/${id}`)
  return res.data.data
}

export async function createBillingClient(payload: BillingClientPayload) {
  const res = await apiClient.post<ObjectResponse<BillingClient>>('admin/billing-clients', payload)
  return res.data
}

export async function updateBillingClient(id: string, payload: BillingClientPayload) {
  const res = await apiClient.put<ObjectResponse<BillingClient>>(
    `admin/billing-clients/${id}`,
    payload,
  )
  return res.data
}

export async function deactivateBillingClient(id: string) {
  const res = await apiClient.post<ObjectResponse<BillingClient>>(
    `admin/billing-clients/${id}/deactivate`,
    {},
  )
  return res.data
}

export async function findOrCreateBillingClient(
  payload: BillingClientPayload & { billingClientId?: string },
) {
  const res = await apiClient.post<
    ObjectResponse<{ client: BillingClient; created: boolean }>
  >('admin/billing-clients/find-or-create', payload)
  return res.data
}

export async function listClientInvoices(
  id: string,
  params?: Record<string, string | number>,
) {
  const res = await apiClient.get<ArrayResponse<Invoice>>(
    `admin/billing-clients/${id}/invoices`,
    { params },
  )
  return res.data
}
