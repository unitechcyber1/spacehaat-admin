import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DocumentPlusIcon, EyeIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { IconAction } from '../../components/IconAction'
import { Input, Select } from '../../components/Input'
import { ListFilterCard } from '../../components/ListFilterCard'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { Table, Td, Th, Tr } from '../../components/Table'
import { filterLabelClass, resolveListTotal, workflowStatusPillClass } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { deactivateBillingClient, listBillingClients } from '../../services/billing/billingClient.service'
import type { BillingClient } from '../../types/billing'
import { BillingBadge } from './BillingBadge'
import {
  billingClientRecordId,
  spaceTypeChipClass,
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
    row.place_of_supply_state_code ?? row.billing_address?.state_code ?? '—'

  return (
    <>
      <ListFilterCard
        description="Search billing clients by name, company, email, or GSTIN."
        onReset={() => {
          setSearch('')
          setStatusFilter('active')
          setPage(1)
          setPageSize(10)
        }}
      >
        <div className="min-w-0 sm:col-span-2">
          <label className={filterLabelClass} htmlFor="bc-search">Search</label>
          <Input
            id="bc-search"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value) }}
            placeholder="Name, company, email, GSTIN…"
          />
        </div>
        <div>
          <label className={filterLabelClass} htmlFor="bc-status">Status</label>
          <Select
            id="bc-status"
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </Select>
        </div>
      </ListFilterCard>

      <ListPageMeta
        loading={isLoading}
        total={total}
        noun="client"
        error={isError ? (error as Error)?.message ?? 'Failed to load clients' : null}
      />

      <Table>
        <thead className="bg-surface-2">
          <tr>
            <Th>Billing name</Th>
            <Th>Company</Th>
            <Th>Email</Th>
            <Th>GSTIN</Th>
            <Th>State</Th>
            <Th>Default space</Th>
            <Th>Status</Th>
            <Th className="text-center">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <Tr><Td colSpan={8} className="list-empty">Loading…</Td></Tr>
          ) : rows.length === 0 ? (
            <Tr>
              <Td colSpan={8} className="list-empty">
                <strong>No clients found</strong>
                Add a billing client to start creating invoices.
              </Td>
            </Tr>
          ) : (
            rows.map((row) => {
              const id = billingClientRecordId(row)
              return (
                <Tr
                  key={id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/layout/billing/clients/${id}`)}
                >
                  <Td className="align-middle font-medium">{row.billing_name}</Td>
                  <Td className="align-middle text-muted">{row.company_name || '—'}</Td>
                  <Td className="align-middle text-sm">{row.billing_email || '—'}</Td>
                  <Td className="align-middle text-sm tnum">{row.gstin || '—'}</Td>
                  <Td className="align-middle text-sm">{clientState(row)}</Td>
                  <Td className="align-middle">
                    {row.default_space_type ? (
                      <BillingBadge className={spaceTypeChipClass(row.default_space_type)}>
                        {row.default_space_type}
                      </BillingBadge>
                    ) : '—'}
                  </Td>
                  <Td className="align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${workflowStatusPillClass(row.status)}`}
                    >
                      {row.status ?? 'active'}
                    </span>
                  </Td>
                  <Td className="align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <IconAction
                        label="View / edit"
                        onClick={() => navigate(`/layout/billing/clients/${id}`)}
                      >
                        <EyeIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                      <IconAction
                        label="Create invoice"
                        tone="violet"
                        onClick={() =>
                          navigate(`/layout/billing/invoices/new?billingClientId=${encodeURIComponent(id)}`)
                        }
                      >
                        <DocumentPlusIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                      {row.status === 'active' ? (
                        <IconAction
                          label="Deactivate"
                          tone="rose"
                          disabled={deactivateMut.isPending}
                          onClick={() => deactivateMut.mutate(id)}
                        >
                          <NoSymbolIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              )
            })
          )}
        </tbody>
      </Table>

      <ListPagination
        currentPage={Math.min(page, totalPages)}
        pageCount={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        loading={isLoading}
        className="border-0 bg-transparent px-0 shadow-none ring-0"
      />
    </>
  )
}
