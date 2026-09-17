import type {
  BillingClient,
  BillingProfile,
  Invoice,
  InvoiceEmailDelivery,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceType,
} from '../../types/billing'

/** All GST state / UT codes (India). */
const ALL_INDIAN_STATE_CODES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
]

const PRIORITY_STATE_CODES = ['06', '07', '09', '10', '27', '29', '33', '36']
const byCode = new Map(ALL_INDIAN_STATE_CODES.map((s) => [s.code, s]))

export const INDIAN_STATE_CODES: { code: string; name: string }[] = [
  ...PRIORITY_STATE_CODES.map((code) => byCode.get(code)).filter(
    (s): s is { code: string; name: string } => !!s,
  ),
  ...ALL_INDIAN_STATE_CODES.filter((s) => !PRIORITY_STATE_CODES.includes(s.code)),
]

export const BILLING_SPACE_TYPES = [
  'Coworking Space',
  'Office Space',
  'PG',
  'Coliving Space',
  'Virtual Office',
] as const

export type BillingSpaceType = (typeof BILLING_SPACE_TYPES)[number]

export function invoiceRecordId(inv: Invoice | null | undefined): string {
  return String(inv?._id ?? inv?.id ?? '').trim()
}

export function billingClientRecordId(c: BillingClient | null | undefined): string {
  return String(c?._id ?? c?.id ?? '').trim()
}

export function formatDocDateLong(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatInr(value: number | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

export function invoiceStatusLabel(status: InvoiceStatus | string | undefined): string {
  if (!status) return '—'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function invoiceStatusBadgeClass(status: InvoiceStatus | string | undefined): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'issued':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'sent':
      return 'bg-violet-50 text-violet-700 ring-violet-200'
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'overdue':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    case 'cancelled':
    case 'voided':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function invoiceTypeBadgeClass(type: InvoiceType | string | undefined): string {
  return type === 'proforma'
    ? 'bg-amber-50 text-amber-800 ring-amber-200'
    : 'bg-indigo-50 text-indigo-700 ring-indigo-200'
}

export function invoiceTypeLabel(type: InvoiceType | string | undefined): string {
  return type === 'proforma' ? 'Proforma' : 'Tax Invoice'
}

export function spaceTypeChipClass(spaceType: string | undefined): string {
  const s = String(spaceType ?? '').toLowerCase()
  if (s.includes('coworking')) return 'bg-violet-50 text-violet-700 ring-violet-200'
  if (s.includes('virtual')) return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  if (s.includes('office')) return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (s === 'pg') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (s.includes('coliving') || s.includes('co-living')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

export function buyerDisplayName(inv: Invoice): string {
  return (
    inv.billing_snapshot?.buyer?.billing_name ??
    inv.billing_snapshot?.buyer?.company_name ??
    '—'
  )
}

export function buyerCompanyName(inv: Invoice): string {
  return inv.billing_snapshot?.buyer?.company_name ?? '—'
}

export function isLegacyInvoice(inv: Invoice | null | undefined): boolean {
  return !!inv?.customerId && !inv?.billingClientId
}

export function stateLabel(code: string | undefined): string {
  if (!code) return '—'
  const hit = INDIAN_STATE_CODES.find((s) => s.code === code)
  return hit ? `${code} ${hit.name}` : code
}

export function isDraft(inv: Invoice | null | undefined): boolean {
  return inv?.status === 'draft'
}

export function canEditInvoice(inv: Invoice | null | undefined): boolean {
  const status = inv?.status
  return status === 'draft' || status === 'issued' || status === 'sent' || status === 'overdue'
}

export function emptyLineItem(): InvoiceLineItem {
  return {
    description: '',
    details: '',
    hsn_sac: '997212',
    quantity: 1,
    unit_price: 0,
    discount: 0,
    tax_rate: 18,
  }
}

export function cloneLineItems(items: InvoiceLineItem[] | undefined): InvoiceLineItem[] {
  return (items ?? []).map((item) => ({ ...item }))
}

export function emptyBillingClient(): import('../../types/billing').BillingClient {
  return {
    billing_name: '',
    billing_email: '',
    billing_phone: '',
    company_name: '',
    gstin: '',
    pan: '',
    is_gst_registered: false,
    billing_address: {},
    place_of_supply_state: '',
    place_of_supply_state_code: '',
    ship_to_same_as_billing: true,
    ship_to_name: '',
    ship_to_company_name: '',
    ship_to_email: '',
    ship_to_phone: '',
    ship_to_gstin: '',
    shipping_address: {},
    default_space_type: 'Coworking Space',
    status: 'active',
    notes: '',
  }
}

export function sortEmailDeliveriesNewestFirst(
  items: InvoiceEmailDelivery[] | undefined,
): InvoiceEmailDelivery[] {
  return [...(items ?? [])].sort((a, b) => {
    const ta = a.sent_at ? new Date(a.sent_at).getTime() : 0
    const tb = b.sent_at ? new Date(b.sent_at).getTime() : 0
    return tb - ta
  })
}

export function formatEmailSentAt(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatEmailRecipientList(recipients?: string[]): string {
  return (recipients ?? []).filter(Boolean).join(', ') || '—'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

export function isValidInvoiceEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return false
  return EMAIL_RE.test(normalized)
}

export function splitEmailTokens(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function validateInvoiceSendEmails(payload: {
  to?: string[]
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  pendingTo?: string
  pendingCc?: string
  pendingBcc?: string
}): string | null {
  const checkPending = (value: string | undefined, label: string): string | null => {
    const pending = (value ?? '').trim()
    if (!pending) return null
    if (!isValidInvoiceEmail(pending)) return `Invalid email in ${label}: ${pending}`
    return `Press Enter to add the email in ${label} before sending`
  }

  for (const [value, label] of [
    [payload.pendingTo, 'To'],
    [payload.pendingCc, 'Cc'],
    [payload.pendingBcc, 'Bcc'],
  ] as const) {
    const pendingError = checkPending(value, label)
    if (pendingError) return pendingError
  }

  const all = [...(payload.to ?? []), ...(payload.cc ?? []), ...(payload.bcc ?? [])]
  const invalid = all.filter((email) => !isValidInvoiceEmail(email))
  if (invalid.length) return `Invalid email address(es): ${[...new Set(invalid)].join(', ')}`

  if (payload.reply_to?.trim() && !isValidInvoiceEmail(payload.reply_to)) {
    return 'Invalid reply-to email address'
  }

  if (!(payload.to ?? []).length) return 'Add at least one valid recipient in "To"'

  return null
}

export function buildDefaultInvoiceTerms(profile?: BillingProfile | null): string {
  const days = profile?.default_payment_terms_days ?? 7
  const interestRate = profile?.default_late_payment_interest_rate ?? 18
  return [
    `Payment shall be made within ${days} days from the invoice date`,
    `Delayed payments shall attract interest at ${interestRate}% per annum calculated from the due date until the date of actual payment.`,
  ].join('\n')
}

export function fmtDocDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function syncPlaceOfSupplyFromStateCode(
  code: string,
  target: {
    billing_address?: { state?: string; state_code?: string }
    place_of_supply_state?: string
    place_of_supply_state_code?: string
  },
): void {
  const hit = INDIAN_STATE_CODES.find((s) => s.code === code)
  if (!hit) return
  if (!target.billing_address) target.billing_address = {}
  target.billing_address.state = hit.name
  target.billing_address.state_code = hit.code
  target.place_of_supply_state = hit.name
  target.place_of_supply_state_code = hit.code
}

export function isBillingAdminOnlyPath(pathname: string): boolean {
  return (
    pathname.includes('/billing/settings') ||
    pathname.includes('/billing/product-catalog')
  )
}
