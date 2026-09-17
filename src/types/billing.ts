export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'voided'

export type InvoiceType = 'client' | 'proforma'

export type InvoiceSource = 'deal_done' | 'renewal' | 'manual' | 'adjustment'

export type TaxMode = 'intra_state' | 'inter_state'

export type BillingClientStatus = 'active' | 'inactive'

export interface BillingAddress {
  line1?: string
  line2?: string
  city?: string
  state?: string
  state_code?: string
  pincode?: string
}

export interface BillingPartySnapshot {
  legal_name?: string
  trade_name?: string
  billing_name?: string
  company_name?: string
  gstin?: string
  pan?: string
  cin?: string
  website?: string
  email?: string
  phone?: string
  billing_email?: string
  billing_phone?: string
  billing_address?: BillingAddress
  place_of_supply_state?: string
  place_of_supply_state_code?: string
  is_gst_registered?: boolean
}

export interface ShipToSnapshot {
  company_name?: string
  billing_name?: string
  gstin?: string
  billing_email?: string
  billing_phone?: string
  billing_address?: BillingAddress
  name?: string
  phone?: string
  address?: BillingAddress
}

export interface BillingSnapshot {
  seller?: BillingPartySnapshot
  buyer?: BillingPartySnapshot
  ship_to?: ShipToSnapshot
}

export interface InvoiceLineItem {
  _id?: string
  description: string
  details?: string
  hsn_sac?: string
  quantity?: number
  unit_price: number
  discount?: number
  tax_rate?: number
  period_start?: string
  period_end?: string
  amount?: number
  tax_amount?: number
  total?: number
}

export interface InvoiceCommercial {
  cofynd_revenue?: number
  operator_payable?: number
  commission_notes?: string
}

export interface Invoice {
  _id?: string
  id?: string
  invoice_number?: string
  proforma_invoice_number?: string
  invoice_type?: InvoiceType
  status?: InvoiceStatus
  customerId?: string
  billingClientId?: string
  enquiryId?: string
  space_type?: string
  source?: InvoiceSource
  seller_state_code?: string
  tax_mode?: TaxMode
  billing_snapshot?: BillingSnapshot
  line_items?: InvoiceLineItem[]
  subtotal?: number
  discount_total?: number
  taxable_amount?: number
  cgst?: number
  sgst?: number
  igst?: number
  total?: number
  balance_due?: number
  amount_paid?: number
  due_date?: string
  issue_date?: string
  notes?: string
  terms?: string
  commercial?: InvoiceCommercial
  payment_link_url?: string
  razorpay_payment_id?: string
  pdf_url?: string | null
  email_sent_at?: string
  email_deliveries?: InvoiceEmailDelivery[]
  added_on?: string
  updated_on?: string
}

export interface InvoicePreviewPayload {
  invoice: Pick<
    Invoice,
    '_id' | 'id' | 'invoice_number' | 'invoice_type' | 'status' | 'total' | 'space_type'
  >
  html: string
  print_html: string
  pdf_url?: string | null
  filename?: string
}

export interface GeneratePdfResult {
  pdf_url: string
  filename: string
}

export interface InvoiceNumberPreview {
  series_key?: string
  next_invoice_number?: string
  last_invoice_number?: string | null
  last_issued_at?: string | null
}

export interface BankDetails {
  account_name?: string
  account_number?: string
  ifsc?: string
  bank_name?: string
  address?: BillingAddress
}

export interface InvoicePrefixes {
  client_vo?: string
  client_cw?: string
  proforma_vo?: string
  proforma_cw?: string
}

export interface BillingProfile {
  legal_name?: string
  trade_name?: string
  pan?: string
  cin?: string
  email?: string
  phone?: string
  website?: string
  bank_details?: BankDetails
  default_payment_terms_days?: number
  default_late_payment_interest_rate?: number
  default_tax_rate?: number
  invoice_prefixes?: InvoicePrefixes
}

export interface StateGstProfile {
  _id?: string
  state_code: string
  state: string
  gstin: string
  address?: BillingAddress
  is_default?: boolean
}

export interface ProductCatalogItem {
  _id?: string
  id?: string
  sku: string
  name: string
  description?: string
  space_type: string
  category?: string
  unit?: string
  default_rate?: number
  tax_rate?: number
  hsn_sac?: string
  enabled?: boolean
}

export interface InvoiceMeta {
  billingProfile?: BillingProfile
  stateProfiles?: StateGstProfile[]
  spaceTypes?: string[]
  invoiceStatuses?: InvoiceStatus[]
  invoiceTypes?: InvoiceType[]
  taxModes?: TaxMode[]
  pricingMode?: string
  supplier?: string
  invoiceCreationMode?: 'billing_client' | 'customer'
  billingClientRequired?: boolean
  default_payment_terms_days?: number
  default_late_payment_interest_rate?: number
  default_invoice_terms?: string
}

export interface ClientBillingProfile {
  billing_name?: string
  billing_email?: string
  billing_phone?: string
  company_name?: string
  gstin?: string
  pan?: string
  is_gst_registered?: boolean
  billing_address?: BillingAddress
  place_of_supply_state?: string
  place_of_supply_state_code?: string
}

export interface CreateInvoiceFromBillingClientPayload {
  billingClientId?: string
  billing_client?: ClientBillingProfile & { default_space_type?: string; notes?: string }
  space_type?: string
  seller_state_code?: string
  source?: InvoiceSource
  invoice_type?: InvoiceType
  notes?: string
  terms?: string
  due_date?: string
  issue_date?: string
  line_items?: InvoiceLineItem[]
  commercial?: InvoiceCommercial
}

export interface IssueInvoicePayload {
  invoice_type: InvoiceType
}

export interface InvoiceSendSuggested {
  to: string[]
  cc: string[]
  bcc: string[]
  reply_to: string
  subject: string
  message: string
  attach_pdf: boolean
  include_payment_link: boolean
  pdf_url?: string | null
  client_name?: string
}

export interface InvoiceEmailDelivery {
  _id?: string
  sent_at?: string
  to?: string[]
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  subject?: string
  message?: string
  attach_pdf?: boolean
  include_payment_link?: boolean
  status?: 'sent' | 'failed'
  error?: string
  ses_message_id?: string
}

export interface InvoiceSendPrefill {
  invoice_id?: string
  invoice_number?: string
  status?: InvoiceStatus
  suggested: InvoiceSendSuggested
  email_deliveries: InvoiceEmailDelivery[]
}

export interface SendInvoicePayload {
  to?: string[]
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  subject?: string
  message?: string
  attach_pdf?: boolean
  include_payment_link?: boolean
  includePaymentLink?: boolean
  invoice_type?: InvoiceType
}

export interface MarkPaidPayload {
  amount_paid?: number
  razorpay_payment_id?: string
  issue_tax_invoice_on_payment?: boolean
}

export interface UpdateInvoicePayload {
  line_items?: InvoiceLineItem[]
  seller_state_code?: string
  billingClientId?: string
  invoice_type?: InvoiceType
  notes?: string
  terms?: string
  due_date?: string
  issue_date?: string
  commercial?: InvoiceCommercial
}

export interface BillingClient {
  _id?: string
  id?: string
  billing_name: string
  billing_email?: string
  billing_phone?: string
  company_name?: string
  gstin?: string
  pan?: string
  is_gst_registered?: boolean
  billing_address?: BillingAddress
  place_of_supply_state?: string
  place_of_supply_state_code?: string
  ship_to_same_as_billing?: boolean
  ship_to_name?: string
  ship_to_company_name?: string
  ship_to_email?: string
  ship_to_phone?: string
  ship_to_gstin?: string
  shipping_address?: BillingAddress
  default_space_type?: string
  status?: BillingClientStatus
  notes?: string
  added_on?: string
  updated_on?: string
}

export interface BillingClientMeta {
  statuses: BillingClientStatus[]
  spaceTypes: string[]
}

export type BillingClientPayload = Omit<BillingClient, '_id' | 'id' | 'added_on' | 'updated_on'>
