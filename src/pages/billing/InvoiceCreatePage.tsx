import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  ScaleIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import {
  createFromBillingClient,
  getInvoice,
  getInvoiceMeta,
  getInvoiceNumberPreview,
  updateInvoice,
} from '../../services/billing/billing.service'
import { getBillingClient, listBillingClients } from '../../services/billing/billingClient.service'
import type {
  BillingClient,
  BillingProfile,
  InvoiceLineItem,
  InvoiceSource,
  InvoiceType,
  StateGstProfile,
} from '../../types/billing'
import {
  BILLING_SPACE_TYPES,
  billingClientRecordId,
  buildDefaultInvoiceTerms,
  canEditInvoice,
  cloneLineItems,
  emptyLineItem,
  formatDocDateLong,
  formatInr,
  invoiceRecordId,
} from './billingHelpers'
import './billing.css'

type ClientMode = 'search' | 'selected'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function InvoiceCreatePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(invoiceId)

  const [clientSearch, setClientSearch] = useState('')
  const [clientMode, setClientMode] = useState<ClientMode>('search')
  const [selectedClient, setSelectedClient] = useState<BillingClient | null>(null)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null)
  const [stateProfiles, setStateProfiles] = useState<StateGstProfile[]>([])
  const [sellerStateCode, setSellerStateCode] = useState('')
  const [spaceType, setSpaceType] = useState<string>('Coworking Space')
  const [source, setSource] = useState<InvoiceSource>('manual')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('client')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(true)
  const [showTotalInPdf, setShowTotalInPdf] = useState(true)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([emptyLineItem()])
  const [lineDescOpen, setLineDescOpen] = useState<Record<number, boolean>>({})
  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [dueDate, setDueDate] = useState('')
  const [dueDateTouched, setDueDateTouched] = useState(false)
  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState('')
  const [numberPreview, setNumberPreview] = useState('')
  const [lastNumberHint, setLastNumberHint] = useState('')

  const debouncedClientSearch = useDebouncedValue(clientSearch, 300)

  const metaQ = useQuery({
    queryKey: ['billing', 'meta'],
    queryFn: getInvoiceMeta,
  })

  const editQ = useQuery({
    queryKey: ['billing', 'invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId!),
    enabled: isEdit,
  })

  const clientListQ = useQuery({
    queryKey: ['billing-clients', 'picker', debouncedClientSearch],
    queryFn: () =>
      listBillingClients({
        limit: 20,
        skip: 0,
        status: 'active',
        search: debouncedClientSearch.trim(),
      }),
    enabled: clientDropdownOpen,
    staleTime: 5_000,
  })

  const paymentTermsDays =
    billingProfile?.default_payment_terms_days ?? metaQ.data?.default_payment_terms_days ?? 7

  useEffect(() => {
    if (!metaQ.data) return
    setBillingProfile(metaQ.data.billingProfile ?? null)
    setStateProfiles(metaQ.data.stateProfiles ?? [])
    const def = metaQ.data.stateProfiles?.find((s) => s.is_default)
    if (def && !isEdit) setSellerStateCode(def.state_code)
    if (!isEdit) {
      setTerms(buildDefaultInvoiceTerms(metaQ.data.billingProfile))
      setDueDate(addDaysIso(todayIso(), paymentTermsDays))
    }
  }, [metaQ.data, isEdit, paymentTermsDays])

  useEffect(() => {
    if (!isEdit) return
    const inv = editQ.data
    if (!inv) return
    if (!canEditInvoice(inv)) {
      toast.error('This invoice cannot be edited in its current status')
      navigate(`/layout/billing/invoices/${invoiceId}/preview`, { replace: true })
      return
    }
    setLineItems(cloneLineItems(inv.line_items).length ? cloneLineItems(inv.line_items) : [emptyLineItem()])
    setNotes(inv.notes ?? '')
    setTerms(inv.terms?.trim() || buildDefaultInvoiceTerms(billingProfile))
    setSellerStateCode(inv.seller_state_code ?? sellerStateCode)
    setSpaceType(inv.space_type ?? spaceType)
    setSource(inv.source ?? 'manual')
    setInvoiceType(inv.invoice_type ?? 'client')
    setInvoiceDate(inv.issue_date ? inv.issue_date.slice(0, 10) : todayIso())
    setDueDate(inv.due_date ? inv.due_date.slice(0, 10) : addDaysIso(invoiceDate, paymentTermsDays))
    setDueDateTouched(!!inv.due_date)
    setSavedInvoiceNumber(inv.invoice_number ?? '')
    if (inv.billingClientId) {
      void getBillingClient(inv.billingClientId).then((c) => {
        setSelectedClient(c)
        setClientMode('selected')
      }).catch(() => {})
    }
  }, [billingProfile, editQ.data, invoiceDate, invoiceId, isEdit, navigate, paymentTermsDays, sellerStateCode, spaceType])

  useEffect(() => {
    const preId = searchParams.get('billingClientId')
    if (!isEdit && preId) {
      void getBillingClient(preId).then((c) => selectClient(c)).catch(() => {})
    }
  }, [isEdit, searchParams])

  useEffect(() => {
    if (savedInvoiceNumber) return
    if (!spaceType || !invoiceType) return
    void getInvoiceNumberPreview(spaceType, invoiceType, sellerStateCode)
      .then((res) => {
        setNumberPreview(res?.next_invoice_number ?? '')
        setLastNumberHint(
          res?.last_invoice_number ? `Last No: ${res.last_invoice_number}` : '',
        )
      })
      .catch(() => {
        setNumberPreview('')
        setLastNumberHint('')
      })
  }, [invoiceType, savedInvoiceNumber, sellerStateCode, spaceType])

  const buyerStateCode = useMemo(() => {
    if (clientMode === 'selected' && selectedClient) {
      return selectedClient.place_of_supply_state_code ?? selectedClient.billing_address?.state_code ?? ''
    }
    return ''
  }, [clientMode, selectedClient])

  const isIntraState = !!sellerStateCode && !!buyerStateCode && sellerStateCode === buyerStateCode

  const lineAmount = (row: InvoiceLineItem) => {
    const qty = Number(row.quantity) || 0
    const price = Number(row.unit_price) || 0
    const disc = Number(row.discount) || 0
    return Math.max(0, qty * price - disc)
  }

  const lineTaxTotal = (row: InvoiceLineItem) => {
    const taxable = lineAmount(row)
    const rate = Number(row.tax_rate) || 0
    return (taxable * rate) / 100
  }

  const lineCgst = (row: InvoiceLineItem) => (isIntraState ? lineTaxTotal(row) / 2 : 0)
  const lineSgst = (row: InvoiceLineItem) => (isIntraState ? lineTaxTotal(row) / 2 : 0)
  const lineIgst = (row: InvoiceLineItem) => (!isIntraState ? lineTaxTotal(row) : 0)
  const lineTotal = (row: InvoiceLineItem) => lineAmount(row) + lineTaxTotal(row)

  const subtotal = () => lineItems.reduce((s, r) => s + lineAmount(r), 0)
  const totalCgst = () => lineItems.reduce((s, r) => s + lineCgst(r), 0)
  const totalSgst = () => lineItems.reduce((s, r) => s + lineSgst(r), 0)
  const totalIgst = () => lineItems.reduce((s, r) => s + lineIgst(r), 0)
  const grandTotal = () => lineItems.reduce((s, r) => s + lineTotal(r), 0)

  const selectedSeller = stateProfiles.find((s) => s.state_code === sellerStateCode)

  const sellerDisplayName = () =>
    billingProfile?.legal_name || billingProfile?.trade_name || 'SpaceHaat'

  const sellerAddressLine = () => {
    const a = selectedSeller?.address
    if (!a) return '—'
    return [a.line1, a.city, a.state, a.pincode].filter(Boolean).join(', ')
  }

  const selectClient = (client: BillingClient) => {
    setSelectedClient(client)
    setClientMode('selected')
    setClientDropdownOpen(false)
    if (
      client.default_space_type &&
      BILLING_SPACE_TYPES.includes(client.default_space_type as (typeof BILLING_SPACE_TYPES)[number])
    ) {
      setSpaceType(client.default_space_type)
    }
  }

  const clearClient = () => {
    setSelectedClient(null)
    setClientMode('search')
    setClientSearch('')
  }

  const updateLine = (index: number, partial: Partial<InvoiceLineItem>) => {
    setLineItems((items) => items.map((row, i) => (i === index ? { ...row, ...partial } : row)))
  }

  const addLine = () => setLineItems((items) => [...items, emptyLineItem()])
  const duplicateLine = (index: number) => {
    setLineItems((items) => {
      const copy = { ...items[index] }
      return [...items.slice(0, index + 1), copy, ...items.slice(index + 1)]
    })
  }
  const removeLine = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems((items) => items.filter((_, i) => i !== index))
  }

  const invoiceHeading = () =>
    invoiceType === 'proforma' ? 'DRAFT PROFORMA INVOICE' : 'DRAFT TAX INVOICE'

  const resolvedTerms = () => terms.trim() || buildDefaultInvoiceTerms(billingProfile)

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!invoiceDate) throw new Error('Select invoice date')
      if (!dueDate) throw new Error('Select due date')
      if (!sellerStateCode) throw new Error('Select seller GST state')
      if (!lineItems.some((l) => l.description?.trim() && Number(l.unit_price) > 0)) {
        throw new Error('Add at least one line item with description and rate')
      }
      if (isEdit) {
        return updateInvoice(invoiceId!, {
          line_items: lineItems,
          seller_state_code: sellerStateCode,
          invoice_type: invoiceType,
          notes: notes || undefined,
          terms: resolvedTerms(),
          issue_date: invoiceDate,
          due_date: dueDate,
          billingClientId:
            clientMode === 'selected' && selectedClient
              ? billingClientRecordId(selectedClient)
              : undefined,
        })
      }
      if (clientMode !== 'selected' || !selectedClient) throw new Error('Select a billing client')
      if (!selectedClient.place_of_supply_state_code) {
        throw new Error('Client is missing place of supply state code — edit the client first')
      }
      return createFromBillingClient({
        billingClientId: billingClientRecordId(selectedClient),
        space_type: spaceType,
        seller_state_code: sellerStateCode,
        source,
        invoice_type: invoiceType,
        notes: notes || undefined,
        terms: resolvedTerms(),
        issue_date: invoiceDate,
        due_date: dueDate,
        line_items: lineItems,
      })
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'Invoice saved' : 'Draft saved')
      const id = isEdit ? invoiceId! : invoiceRecordId(res.data)
      navigate(`/layout/billing/invoices/${id}/preview`)
    },
    onError: (e: unknown) => {
      const msg =
        (e as Error)?.message ??
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Save failed'
      toast.error(msg)
    },
  })

  const clientResults = (clientListQ.data?.data ?? []) as BillingClient[]
  const invoiceNumberDisplay = savedInvoiceNumber || numberPreview || '—'

  const back = () => {
    if (isEdit && invoiceId) navigate(`/layout/billing/invoices/${invoiceId}/preview`)
    else navigate('/layout/billing/invoices')
  }

  if (isEdit && editQ.isLoading) {
    return (
      <div className="ic-page">
        <p className="text-center text-muted">Loading invoice…</p>
      </div>
    )
  }

  return (
    <div className="ic-page">
      <button type="button" className="ic-back" onClick={back}>
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        {isEdit ? 'Back to preview' : 'Back to invoices'}
      </button>

      <h1 className="ic-title">{isEdit ? 'Edit Invoice' : 'Create New Invoice'}</h1>

      <nav className="ic-steps" aria-label="Progress">
        <div className="ic-step ic-step--active">
          <span className="ic-step-num">1</span>
          <span className="ic-step-label">Add Invoice Details</span>
        </div>
        <ChevronRightIcon className="ic-step-chevron h-5 w-5" aria-hidden />
        <div className="ic-step ic-step--next">
          <span className="ic-step-num">2</span>
          <span className="ic-step-label">Review &amp; Issue</span>
        </div>
      </nav>

      <div className="ic-sheet">
        <div className="ic-sheet-accent" aria-hidden />
        <div className="ic-sheet-body">
          <h2 className="ic-invoice-heading">{invoiceHeading()}</h2>

          <div className="ic-doc-fields">
            <div className="ic-doc-field">
              <span className="ic-doc-label">
                Invoice No <span className="ic-doc-req">*</span>
              </span>
              <div className="ic-doc-value">{invoiceNumberDisplay}</div>
              {lastNumberHint ? <p className="ic-doc-hint">{lastNumberHint}</p> : null}
            </div>
            <div className="ic-doc-field">
              <span className="ic-doc-label">
                Invoice Date <span className="ic-doc-req">*</span>
              </span>
              <label className="ic-doc-date-wrap">
                <span>{formatDocDateLong(invoiceDate) || 'Select date'}</span>
                <CalendarDaysIcon className="h-4 w-4 text-muted" aria-hidden />
                <input
                  type="date"
                  className="ic-doc-date-native"
                  value={invoiceDate}
                  onChange={(e) => {
                    setInvoiceDate(e.target.value)
                    if (!dueDateTouched) setDueDate(addDaysIso(e.target.value, paymentTermsDays))
                  }}
                />
              </label>
            </div>
            <div className="ic-doc-field">
              <span className="ic-doc-label">Due Date</span>
              <label className="ic-doc-date-wrap">
                <span>{formatDocDateLong(dueDate) || 'Select date'}</span>
                <CalendarDaysIcon className="h-4 w-4 text-muted" aria-hidden />
                <input
                  type="date"
                  className="ic-doc-date-native"
                  value={dueDate}
                  min={invoiceDate || undefined}
                  onChange={(e) => {
                    setDueDateTouched(true)
                    setDueDate(e.target.value)
                  }}
                />
              </label>
            </div>
          </div>

          <div className="ic-meta-row">
            <div className="ic-field-underline">
              <label>Module <span className="ic-doc-req">*</span></label>
              <select value={spaceType} onChange={(e) => setSpaceType(e.target.value)}>
                {BILLING_SPACE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="ic-field-underline">
              <label>Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value as InvoiceSource)}>
                <option value="manual">Manual</option>
                <option value="renewal">Renewal</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div className="ic-field-underline">
              <label>Invoice type <span className="ic-doc-req">*</span></label>
              <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}>
                <option value="proforma">Proforma</option>
                <option value="client">Tax Invoice</option>
              </select>
            </div>
          </div>

          <div className="ic-parties">
            <div>
              <label className="ic-party-label">
                Bill From <span className="ic-party-sub">(Your Details)</span>
              </label>
              <select
                className="ic-select-box"
                value={sellerStateCode}
                onChange={(e) => setSellerStateCode(e.target.value)}
              >
                {stateProfiles.map((s) => (
                  <option key={s.state_code} value={s.state_code}>
                    {billingProfile?.legal_name || 'SpaceHaat'} — {s.state} ({s.state_code})
                  </option>
                ))}
              </select>
              {selectedSeller ? (
                <div className="ic-party-card">
                  <p className="ic-party-name">{sellerDisplayName()}</p>
                  <p className="ic-party-line">{sellerAddressLine()}</p>
                  <p className="ic-party-line"><strong>GSTIN:</strong> {selectedSeller.gstin || '—'}</p>
                  {billingProfile?.pan ? (
                    <p className="ic-party-line"><strong>PAN:</strong> {billingProfile.pan}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="ic-party-relative">
              <label className="ic-party-label">
                Bill To <span className="ic-party-sub">(Client&apos;s Details)</span>
              </label>

              {clientMode === 'selected' && selectedClient ? (
                <div className="ic-party-card">
                  {!isEdit ? (
                    <button type="button" className="ic-party-change" onClick={clearClient}>
                      Change
                    </button>
                  ) : null}
                  <p className="ic-party-name">{selectedClient.billing_name}</p>
                  {selectedClient.company_name ? (
                    <p className="ic-party-line">{selectedClient.company_name}</p>
                  ) : null}
                  {selectedClient.billing_address?.line1 ? (
                    <p className="ic-party-line">{selectedClient.billing_address.line1}</p>
                  ) : null}
                  <p className="ic-party-line">
                    {selectedClient.place_of_supply_state || selectedClient.billing_address?.state || '—'}, India
                  </p>
                  {selectedClient.gstin ? (
                    <p className="ic-party-line"><strong>GSTIN:</strong> {selectedClient.gstin}</p>
                  ) : null}
                  {selectedClient.billing_email ? (
                    <p className="ic-party-line">{selectedClient.billing_email}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="ic-select-box text-left"
                    onClick={() => setClientDropdownOpen((o) => !o)}
                  >
                    {clientSearch || 'Select a Client'}
                  </button>
                  {clientDropdownOpen ? (
                    <div className="ic-client-dropdown">
                      <input
                        type="search"
                        className="ic-dropdown-search"
                        value={clientSearch}
                        placeholder="Search name, company, email, GSTIN…"
                        onChange={(e) => setClientSearch(e.target.value)}
                        autoFocus
                      />
                      {clientListQ.isLoading ? (
                        <p className="px-2 py-1 text-sm text-muted">Loading…</p>
                      ) : clientResults.length === 0 ? (
                        <p className="px-2 py-1 text-sm text-muted">No clients found</p>
                      ) : (
                        clientResults.map((c) => (
                          <button
                            key={billingClientRecordId(c)}
                            type="button"
                            className="ic-dropdown-item"
                            onClick={() => selectClient(c)}
                          >
                            <strong>{c.billing_name}</strong>
                            <span>{c.company_name || c.billing_email || '—'}</span>
                          </button>
                        ))
                      )}
                      <button
                        type="button"
                        className="ic-btn-brand !mt-2"
                        onClick={() => navigate('/layout/billing/clients/new')}
                      >
                        <PlusIcon className="h-4 w-4" aria-hidden />
                        Add New Client
                      </button>
                    </div>
                  ) : null}
                  {!clientDropdownOpen ? (
                    <div className="ic-party-card ic-party-card--empty">
                      <p className="text-sm text-muted">Select Client/Business from the list OR</p>
                      <button
                        type="button"
                        className="ic-btn-brand"
                        onClick={() => navigate('/layout/billing/clients/new')}
                      >
                        <PlusIcon className="h-4 w-4" aria-hidden />
                        Add New Client
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="ic-toolbar-chips">
            <span className="ic-chip">₹ Indian Rupee (INR, ₹)</span>
            {buyerStateCode ? (
              <span className="ic-chip">
                {isIntraState ? 'CGST + SGST (intra-state)' : 'IGST (inter-state)'}
              </span>
            ) : null}
          </div>

          <div className="ic-items-section">
              <div className={`ic-items-header ${isIntraState ? 'ic-items-header--intra' : ''}`}>
                <span>Item</span>
                <span>HSN/SAC</span>
                <span>GST Rate</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
                {isIntraState ? (
                  <>
                    <span>CGST</span>
                    <span>SGST</span>
                  </>
                ) : (
                  <span>IGST</span>
                )}
                <span>Total</span>
              </div>

              {lineItems.map((row, index) => (
                <div key={index} className="ic-item-card">
                  <div className="ic-item-bar">
                    <span>{index + 1}.</span>
                    <div className="flex gap-1">
                      <button type="button" className="ic-item-link !p-1" onClick={() => duplicateLine(index)}>
                        <DocumentDuplicateIcon className="h-4 w-4" aria-hidden />
                      </button>
                      {lineItems.length > 1 ? (
                        <button type="button" className="ic-item-link !p-1" onClick={() => removeLine(index)}>
                          <XMarkIcon className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className={`ic-item-grid ${isIntraState ? 'ic-item-grid--intra' : ''}`}>
                    <input
                      className="ic-item-input"
                      value={row.description}
                      placeholder="Item Name / SKU Id"
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                    />
                    <input
                      className="ic-item-input"
                      value={row.hsn_sac ?? ''}
                      placeholder="997212"
                      onChange={(e) => updateLine(index, { hsn_sac: e.target.value })}
                    />
                    <input
                      className="ic-item-input"
                      type="number"
                      min={0}
                      value={row.tax_rate ?? 18}
                      onChange={(e) => updateLine(index, { tax_rate: Number(e.target.value) })}
                    />
                    <input
                      className="ic-item-input"
                      type="number"
                      min={0}
                      value={row.quantity ?? 1}
                      onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    />
                    <input
                      className="ic-item-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.unit_price}
                      onChange={(e) => updateLine(index, { unit_price: Number(e.target.value) })}
                    />
                    <div className="ic-item-calc">{formatInr(lineAmount(row))}</div>
                    {isIntraState ? (
                      <>
                        <div className="ic-item-calc">{formatInr(lineCgst(row))}</div>
                        <div className="ic-item-calc">{formatInr(lineSgst(row))}</div>
                      </>
                    ) : (
                      <div className="ic-item-calc">{formatInr(lineIgst(row))}</div>
                    )}
                    <div className="ic-item-calc">{formatInr(lineTotal(row))}</div>
                  </div>
                  <button
                    type="button"
                    className="ic-item-link"
                    onClick={() => setLineDescOpen((p) => ({ ...p, [index]: !p[index] }))}
                  >
                    <PlusIcon className="h-3.5 w-3.5" aria-hidden />
                    {lineDescOpen[index] ? 'Hide Description' : 'Add Description'}
                  </button>
                  {lineDescOpen[index] ? (
                    <div className="px-3 pb-3">
                      <textarea
                        className="ic-item-input !w-full"
                        rows={2}
                        value={row.details ?? ''}
                        placeholder="Detailed description for this line item"
                        onChange={(e) => updateLine(index, { details: e.target.value })}
                      />
                    </div>
                  ) : null}
                </div>
              ))}

              <button type="button" className="ic-add-line" onClick={addLine}>
                <PlusIcon className="h-4 w-4" aria-hidden />
                Add New Line
              </button>
          </div>

          <div className="ic-summary-wrap">
            <aside className="ic-summary">
              <header className="ic-summary-head">
                <span>Show Total in PDF</span>
                <button
                  type="button"
                  className="bill-action-btn !border-0 !bg-transparent"
                  onClick={() => setShowTotalInPdf((v) => !v)}
                  aria-pressed={showTotalInPdf}
                >
                  {showTotalInPdf ? (
                    <EyeIcon className="h-4 w-4" aria-hidden />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </header>
              <div className="ic-summary-row">
                <span>Amount</span>
                <strong>{formatInr(subtotal())}</strong>
              </div>
              {isIntraState ? (
                <>
                  <div className="ic-summary-row">
                    <span>SGST</span>
                    <strong>{formatInr(totalSgst())}</strong>
                  </div>
                  <div className="ic-summary-row">
                    <span>CGST</span>
                    <strong>{formatInr(totalCgst())}</strong>
                  </div>
                </>
              ) : (
                <div className="ic-summary-row">
                  <span>IGST</span>
                  <strong>{formatInr(totalIgst())}</strong>
                </div>
              )}
              <footer className="ic-summary-foot">
                <span>Total (INR)</span>
                <span>{formatInr(grandTotal())}</span>
              </footer>
            </aside>
          </div>

          {notesOpen ? (
            <div className="ic-notes-block">
              <label className="text-sm font-bold">Notes</label>
              <textarea
                rows={3}
                value={notes}
                placeholder="Optional notes for this invoice"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          ) : null}

          {termsOpen ? (
            <div className="ic-notes-block">
              <label className="text-sm font-bold">Terms &amp; Conditions</label>
              <textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
          ) : null}

          <div className="ic-extra-bar">
            <button
              type="button"
              className={`ic-extra-btn ${notesOpen ? 'ic-extra-btn--active' : ''}`}
              onClick={() => setNotesOpen((v) => !v)}
            >
              Notes
            </button>
            <button
              type="button"
              className={`ic-extra-btn ${termsOpen ? 'ic-extra-btn--active' : ''}`}
              onClick={() => setTermsOpen((v) => !v)}
            >
              <ScaleIcon className="h-4 w-4" aria-hidden />
              Terms &amp; Conditions
            </button>
          </div>

          <footer className="ic-footer">
            <button
              type="button"
              className="ic-btn-primary"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? 'Saving…' : 'Save Draft'}
            </button>
            <button type="button" className="ic-btn-outline" onClick={back}>
              Cancel
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
