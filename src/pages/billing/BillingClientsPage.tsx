import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowPathIcon, DocumentPlusIcon, EyeIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { ListPagination } from '../../components/ListPagination'
import { resolveListTotal } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { deactivateBillingClient, listBillingClients } from '../../services/billing/billingClient.service'
import type { BillingClient } from '../../types/billing'
import { BillingBadge } from './BillingBadge'
import {
  billingClientRecordId,
  spaceTypeChipClass,
  stateLabel,
} from './billingHelpers'

export function BillingClientsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const debouncedSearch = useDebouncedValue(search, 300)

  const params = useMemo(
    () => ({
      limit: pageSize,
      skip: (page - 1) * pageSize,
      status: statusFilter,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [debouncedSearch, page, pageSize, statusFilter],
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing-clients', params],
    queryFn: () => listBillingClients(params),
    staleTime: 10_000,
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateBillingClient(id),
    onSuccess: () => {
      toast.success('Client deactivated')
      qc.invalidateQueries({ queryKey: ['billing-clients'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to deactivate')
    },
  })

  const rows = (data?.data ?? []) as BillingClient[]
  const total = resolveListTotal(data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const clientState = (row: BillingClient) =>
    row.place_of_supply_state_code ?? row.billing_address?.state_code

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('active')
    setPage(1)
    setPageSize(10)
  }

  return (
    <>
      <div className="bill-toolbar-card">
        <div className="bill-filters">
          <label className="bill-filter bill-filter--grow">
            <input
              id="bc-search"
              type="search"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value) }}
              placeholder="Name, company, email, GSTIN…"
              aria-label="Search clients"
            />
          </label>
          <label className="bill-filter">
            <select
              id="bc-status"
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
              aria-label="Status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All statuses</option>
            </select>
          </label>
          <button type="button" className="bill-action-btn !w-auto !px-3 gap-1.5" onClick={resetFilters}>
            <ArrowPathIcon aria-hidden />
            <span className="text-xs font-bold">Clear</span>
          </button>
        </div>
      </div>

      <div className="bill-table-card">
        <div className="bill-meta">
          {isLoading
            ? 'Loading…'
            : isError
              ? (error as Error)?.message ?? 'Failed to load clients'
              : `${total} client${total === 1 ? '' : 's'}`}
        </div>
        <div className="bill-table-scroll">
          <table className="bill-table bill-table--clients">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Default space</th>
                <th>Status</th>
                <th className="bill-td-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="bill-empty">Loading clients…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="bill-empty">No clients found. Add a billing client to start creating invoices.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = billingClientRecordId(row)
                  const company = row.company_name?.trim()
                  return (
                    <tr
                      key={id}
                      className="bill-row-click"
                      onClick={() => navigate(`/layout/billing/clients/${id}`)}
                    >
                      <td>
                        <div className="bill-cell-title">{row.billing_name}</div>
                        {company && company !== row.billing_name ? (
                          <div className="bill-cell-sub" title={company}>{company}</div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap" title={row.billing_email || undefined}>{row.billing_email || '—'}</td>
                      <td className="whitespace-nowrap tnum" title={row.gstin || undefined}>{row.gstin || '—'}</td>
                      <td className="whitespace-nowrap text-muted" title={stateLabel(clientState(row))}>
                        {clientState(row) || '—'}
                      </td>
                      <td>
                        {row.default_space_type ? (
                          <BillingBadge className={spaceTypeChipClass(row.default_space_type)}>
                            {row.default_space_type}
                          </BillingBadge>
                        ) : '—'}
                      </td>
                      <td>
                        <BillingBadge className={row.status === 'inactive' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>
                          {row.status ?? 'active'}
                        </BillingBadge>
                      </td>
                      <td className="bill-td-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="bill-action-group">
                          <button
                            type="button"
                            className="bill-action-btn"
                            title="View / edit"
                            onClick={() => navigate(`/layout/billing/clients/${id}`)}
                          >
                            <EyeIcon aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="bill-action-btn violet"
                            title="Create invoice"
                            onClick={() =>
                              navigate(`/layout/billing/invoices/new?billingClientId=${encodeURIComponent(id)}`)
                            }
                          >
                            <DocumentPlusIcon aria-hidden />
                          </button>
                          {row.status === 'active' ? (
                            <button
                              type="button"
                              className="bill-action-btn danger"
                              title="Deactivate"
                              disabled={deactivateMut.isPending}
                              onClick={() => deactivateMut.mutate(id)}
                            >
                              <NoSymbolIcon aria-hidden />
                            </button>
                          ) : null}
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
