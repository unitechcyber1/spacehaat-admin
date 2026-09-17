import { apiClient, type ArrayResponse, type ObjectResponse } from '../apiClient'
import type {
  BillingProfile,
  CreateInvoiceFromBillingClientPayload,
  Invoice,
  InvoiceMeta,
  InvoiceNumberPreview,
  InvoiceSendPrefill,
  IssueInvoicePayload,
  MarkPaidPayload,
  ProductCatalogItem,
  SendInvoicePayload,
  StateGstProfile,
  UpdateInvoicePayload,
} from '../../types/billing'

export async function getInvoiceMeta() {
  const res = await apiClient.get<ObjectResponse<InvoiceMeta>>('admin/invoices/meta')
  return res.data.data
}

export async function getInvoiceNumberPreview(
  spaceType: string,
  invoiceType: string,
  sellerStateCode?: string,
) {
  const params: Record<string, string> = {
    space_type: spaceType,
    invoice_type: invoiceType,
  }
  if (sellerStateCode?.trim()) params.seller_state_code = sellerStateCode.trim()
  const res = await apiClient.get<ObjectResponse<InvoiceNumberPreview>>(
    'admin/invoices/number-preview',
    { params },
  )
  return res.data.data
}

export async function getInvoices(params: Record<string, string | number>) {
  const res = await apiClient.get<ArrayResponse<Invoice>>('admin/invoices', { params })
  return res.data
}

export async function getInvoice(id: string) {
  const res = await apiClient.get<ObjectResponse<Invoice>>(`admin/invoices/${id}`)
  return res.data.data
}

export async function getInvoiceHtml(id: string, print = false) {
  const params: Record<string, string> = { format: 'html' }
  if (print) params.print = '1'
  const res = await apiClient.get<string>(`admin/invoices/${id}/html`, {
    params,
    responseType: 'text',
  })
  return res.data
}

export async function createFromBillingClient(payload: CreateInvoiceFromBillingClientPayload) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(
    'admin/invoices/from-billing-client',
    payload,
  )
  return res.data
}

export async function createDraft(payload: CreateInvoiceFromBillingClientPayload) {
  const res = await apiClient.post<ObjectResponse<Invoice>>('admin/invoices', payload)
  return res.data
}

export async function updateInvoice(id: string, payload: UpdateInvoicePayload) {
  const res = await apiClient.put<ObjectResponse<Invoice>>(`admin/invoices/${id}`, payload)
  return res.data
}

export async function issueInvoice(id: string, payload: IssueInvoicePayload) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(`admin/invoices/${id}/issue`, payload)
  return res.data
}

export async function getInvoiceSendPrefill(id: string) {
  const res = await apiClient.get<ObjectResponse<InvoiceSendPrefill>>(
    `admin/invoices/${id}/send/prefill`,
  )
  return res.data.data
}

export async function sendInvoice(id: string, payload: SendInvoicePayload = {}) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(`admin/invoices/${id}/send`, payload)
  return res.data
}

export async function createPaymentLink(id: string) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(
    `admin/invoices/${id}/payment-link`,
    {},
  )
  return res.data
}

export async function markPaid(id: string, payload: MarkPaidPayload = {}) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(`admin/invoices/${id}/mark-paid`, payload)
  return res.data
}

export async function convertToTax(id: string) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(`admin/invoices/${id}/convert-to-tax`, {})
  return res.data
}

export async function cancelInvoice(id: string) {
  const res = await apiClient.post<ObjectResponse<Invoice>>(`admin/invoices/${id}/cancel`, {})
  return res.data
}

export async function getBillingProfile() {
  const res = await apiClient.get<ObjectResponse<BillingProfile>>('admin/billing-profile')
  return res.data.data
}

export async function updateBillingProfile(payload: BillingProfile) {
  const res = await apiClient.put<ObjectResponse<BillingProfile>>('admin/billing-profile', payload)
  return res.data
}

export async function getStateProfiles() {
  const res = await apiClient.get<ArrayResponse<StateGstProfile>>(
    'admin/billing-profile/state-profiles',
  )
  return res.data
}

export async function saveStateProfile(payload: StateGstProfile) {
  const res = await apiClient.post<ObjectResponse<StateGstProfile>>(
    'admin/billing-profile/state-profiles',
    payload,
  )
  return res.data
}

export async function deleteStateProfile(stateCode: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(
    `admin/billing-profile/state-profiles/${stateCode}`,
  )
  return res.data
}

export async function getProductCatalog(params?: Record<string, string>) {
  const res = await apiClient.get<ArrayResponse<ProductCatalogItem>>('admin/product-catalog', {
    params,
  })
  return res.data
}

export async function saveProductCatalogItem(payload: ProductCatalogItem) {
  const id = payload._id ?? payload.id
  if (id) {
    const res = await apiClient.put<ObjectResponse<ProductCatalogItem>>(
      `admin/product-catalog/${id}`,
      payload,
    )
    return res.data
  }
  const res = await apiClient.post<ObjectResponse<ProductCatalogItem>>(
    'admin/product-catalog',
    payload,
  )
  return res.data
}

export async function deleteProductCatalogItem(id: string) {
  const res = await apiClient.delete<ObjectResponse<unknown>>(`admin/product-catalog/${id}`)
  return res.data
}

export async function seedProductCatalog() {
  const res = await apiClient.post<ObjectResponse<unknown>>('admin/product-catalog/seed', {})
  return res.data
}
