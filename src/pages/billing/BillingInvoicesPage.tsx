import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  EyeIcon,
  PencilSquareIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { ListPagination } from '../../components/ListPagination'
import { resolveListTotal } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { getInvoiceMeta, getInvoices } from '../../services/billing/billing.service'
import { listBillingClients } from '../../services/billing/billingClient.service'
import {
  downloadPdf,
  generatePdf,
  openPrintTab,
  viewPdf,
} from '../../services/billing/invoiceDocument.service'
import type { BillingClient, Invoice } from '../../types/billing'
import { BillingBadge } from './BillingBadge'
import {
  BILLING_SPACE_TYPES,
  buyerCompanyName,
  buyerDisplayName,
  billingClientRecordId,
  fmtDocDate,
  formatInr,
  invoiceRecordId,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  invoiceTypeBadgeClass,
  invoiceTypeLabel,
  spaceTypeChipClass,
  stateLabel,
} from './billingHelpers'
import './billing.css'

export function BillingInvoicesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState('')
  const [spaceTypeFilter, setSpaceTypeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [billingClientFilterId, setBillingClientFilterId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rowDocBusy, setRowDocBusy] = useState<Record<string, string | null>>({})

  const debouncedClientSearch = useDebouncedValue(clientSearch, 300)

  const metaQ = useQuery({
    queryKey: ['billing', 'meta'],
    queryFn: getInvoiceMeta,
    staleTime: 60_000,
  })

  const clientSearchQ = useQuery({
    queryKey: ['billing-clients', 'search', debouncedClientSearch],
    queryFn: () =>
      listBillingClients({
        limit: 20,
        skip: 0,
        status: 'active',
        search: debouncedClientSearch.trim(),
      }),
    enabled: debouncedClientSearch.trim().length > 0 && !billingClientFilterId,
    staleTime: 5_000,
  })

  const params = useMemo(() => {
    const p: Record<string, string | number> = {
      limit: pageSize,
      skip: (page - 1) * pageSize,
    }
    if (statusFilter) p.status = statusFilter
    if (spaceTypeFilter) p.space_type = spaceTypeFilter
    if (sourceFilter) p.source = sourceFilter
    if (billingClientFilterId) p.billingClientId = billingClientFilterId
    if (startDate) p.startDate = startDate
    if (endDate) p.endDate = endDate
    return p
  }, [
    billingClientFilterId,
    endDate,
    page,
    pageSize,
    sourceFilter,
    spaceTypeFilter,
    startDate,
    statusFilter,
  ])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing', 'invoices', params],
    queryFn: () => getInvoices(params),
    staleTime: 10_000,
  })

  const rows = (data?.data ?? []) as Invoice[]
  const total = resolveListTotal(data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const statusOptions = metaQ.data?.invoiceStatuses ?? [
    'draft',
    'issued',
    'sent',
    'paid',
    'overdue',
    'cancelled',
  ]

  const setRowBusy = (id: string, action: string | null) => {
    setRowDocBusy((prev) => ({ ...prev, [id]: action }))
  }

  const ensurePdfAndRetry = async (row: Invoice, retry: () => void) => {
    if (row.pdf_url) {
      toast.error('Could not load PDF — try again')
      return
    }
    try {
      const result = await generatePdf(invoiceRecordId(row))
      if (result?.pdf_url) {
        row.pdf_url = result.pdf_url
        retry()
      } else {
        toast.error('Could not load PDF — try again')
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Could not load PDF — try again')
    }
  }

  const handlePrint = async (row: Invoice) => {
    const id = invoiceRecordId(row)
    setRowBusy(id, 'print')
    try {
      await openPrintTab(id)
    } catch {
      toast.error('Could not open print page — try again')
    } finally {
      setRowBusy(id, null)
    }
  }

  const handleViewPdf = async (row: Invoice) => {
    const id = invoiceRecordId(row)
    setRowBusy(id, 'view')
    try {
      await viewPdf(id, row.pdf_url)
    } catch {
      await ensurePdfAndRetry(row, () => void handleViewPdf(row))
    } finally {
      setRowBusy(id, null)
    }
  }

  const handleDownloadPdf = async (row: Invoice) => {
    const id = invoiceRecordId(row)
    setRowBusy(id, 'download')
    try {
      await downloadPdf(id, undefined, row.pdf_url)
    } catch {
      await ensurePdfAndRetry(row, () => void handleDownloadPdf(row))
    } finally {
      setRowBusy(id, null)
    }
  }

  const selectClientFilter = (client: BillingClient) => {
    setBillingClientFilterId(billingClientRecordId(client))
    setClientSearch(client.billing_name || client.company_name || '')
    setPage(1)
  }

  const clearFilters = () => {
    setStatusFilter('')
    setSpaceTypeFilter('')
    setSourceFilter('')
    setBillingClientFilterId('')
    setClientSearch('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const clientResults = (clientSearchQ.data?.data ?? []) as BillingClient[]

  return (
    <>
      <div className="bill-toolbar-card">
        <div className="bill-filters">
          <label className="bill-filter">
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
              aria-label="Status"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{invoiceStatusLabel(s)}</option>
              ))}
            </select>
          </label>
          <label className="bill-filter">
            <select
              value={spaceTypeFilter}
              onChange={(e) => { setPage(1); setSpaceTypeFilter(e.target.value) }}
              aria-label="Module"
            >
              <option value="">All modules</option>
              {BILLING_SPACE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="bill-filter">
            <select
              value={sourceFilter}
              onChange={(e) => { setPage(1); setSourceFilter(e.target.value) }}
              aria-label="Source"
            >
              <option value="">All sources</option>
              <option value="manual">Manual</option>
              <option value="deal_done">Deal done</option>
              <option value="renewal">Renewal</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </label>
          <label className="bill-filter bill-filter--grow">
            <input
              type="search"
              value={clientSearch}
              placeholder="Filter by billing client…"
              onChange={(e) => {
                setClientSearch(e.target.value)
                if (billingClientFilterId) setBillingClientFilterId('')
              }}
            />
            {billingClientFilterId ? (
              <button
                type="button"
                className="ml-2 shrink-0 text-xs font-semibold text-violet-600"
                onClick={() => {
                  setBillingClientFilterId('')
                  setClientSearch('')
                  setPage(1)
                }}
              >
                Clear
              </button>
            ) : null}
            {!billingClientFilterId && debouncedClientSearch.trim() && clientResults.length > 0 ? (
              <div className="bill-client-picks">
                {clientResults.map((c) => (
                  <button
                    key={billingClientRecordId(c)}
                    type="button"
                    className="bill-client-pick"
                    onClick={() => selectClientFilter(c)}
                  >
                    {c.billing_name}
                    {c.company_name ? ` · ${c.company_name}` : ''}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <label className="bill-filter">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setPage(1); setStartDate(e.target.value) }}
              aria-label="From date"
            />
          </label>
          <label className="bill-filter">
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setPage(1); setEndDate(e.target.value) }}
              aria-label="To date"
            />
          </label>
          <button type="button" className="bill-action-btn !w-auto !px-3 gap-1.5" onClick={clearFilters}>
            <ArrowPathIcon aria-hidden />
            <span className="text-xs font-bold">Clear</span>
          </button>
        </div>
      </div>

      <div className="bill-table-card">
        <div className="bill-meta">
          {isLoading ? 'Loading…' : isError ? (error as Error)?.message ?? 'Failed to load' : `${total} invoice${total === 1 ? '' : 's'}`}
        </div>
        <div className="bill-table-scroll">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Status</th>
                <th>Client</th>
                <th>Module</th>
                <th>GST state</th>
                <th className="bill-td-num">Total</th>
                <th className="bill-td-num">Balance</th>
                <th>Due</th>
                <th className="bill-td-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="bill-empty">Loading invoices…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="bill-empty">No invoices found. Try adjusting filters or create a new invoice.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = invoiceRecordId(row)
                  const busy = rowDocBusy[id]
                  const company = buyerCompanyName(row)
                  return (
                    <tr
                      key={id}
                      className="bill-row-click"
                      onClick={() => navigate(`/layout/billing/invoices/${id}/preview`)}
                    >
                      <td>
                        <div className="bill-cell-title">{row.invoice_number ?? 'Draft'}</div>
                        {!row.invoice_number ? (
                          <div className="bill-cell-sub">Not issued yet</div>
                        ) : null}
                      </td>
                      <td>
                        <BillingBadge className={invoiceTypeBadgeClass(row.invoice_type)}>
                          {invoiceTypeLabel(row.invoice_type)}
                        </BillingBadge>
                      </td>
                      <td>
                        <BillingBadge className={invoiceStatusBadgeClass(row.status)}>
                          {invoiceStatusLabel(row.status)}
                        </BillingBadge>
                      </td>
                      <td>
                        <div className="bill-cell-title">{buyerDisplayName(row)}</div>
                        {company && company !== '—' ? (
                          <div className="bill-cell-sub">{company}</div>
                        ) : null}
                      </td>
                      <td>
                        {row.space_type ? (
                          <BillingBadge className={spaceTypeChipClass(row.space_type)}>
                            {row.space_type}
                          </BillingBadge>
                        ) : '—'}
                      </td>
                      <td className="text-sm text-muted">{stateLabel(row.seller_state_code)}</td>
                      <td className="bill-td-num"><strong>{formatInr(row.total)}</strong></td>
                      <td className="bill-td-num">{formatInr(row.balance_due)}</td>
                      <td className="whitespace-nowrap text-sm">{fmtDocDate(row.due_date)}</td>
                      <td className="bill-td-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="bill-action-group">
                          <button
                            type="button"
                            className="bill-action-btn"
                            title="Open invoice"
                            onClick={() => navigate(`/layout/billing/invoices/${id}/preview`)}
                          >
                            <EyeIcon aria-hidden />
                          </button>
                          {row.status === 'draft' ? (
                            <button
                              type="button"
                              className="bill-action-btn"
                              title="Edit"
                              onClick={() => navigate(`/layout/billing/invoices/${id}/edit`)}
                            >
                              <PencilSquareIcon aria-hidden />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="bill-action-btn"
                            title="Print"
                            disabled={!!busy}
                            onClick={() => void handlePrint(row)}
                          >
                            <PrinterIcon aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="bill-action-btn"
                            title="View PDF"
                            disabled={!!busy}
                            onClick={() => void handleViewPdf(row)}
                          >
                            <DocumentMagnifyingGlassIcon aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="bill-action-btn"
                            title="Download PDF"
                            disabled={!!busy}
                            onClick={() => void handleDownloadPdf(row)}
                          >
                            <ArrowDownTrayIcon aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <ListPagination
          currentPage={Math.min(page, totalPages)}
          pageCount={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          loading={isLoading}
        />
      </div>
    </>
  )
}
