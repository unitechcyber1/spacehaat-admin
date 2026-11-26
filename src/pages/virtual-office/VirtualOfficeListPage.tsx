import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { IconAction } from '../../components/IconAction'
import { Input } from '../../components/Input'
import { ListFilterCard } from '../../components/ListFilterCard'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { StatusBadge } from '../../components/StatusBadge'
import { Table, Td, Th, Tr } from '../../components/Table'
import { filterLabelClass, filterSelectClass, resolveListTotal, sortIndicator } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import {
  deleteVirtualOffice,
  errorMessage,
  formatInr,
  getVirtualOfficeStats,
  listVirtualOffices,
  VO_TIERS,
  type VirtualOfficeListing,
} from '../../services/virtual-office/virtualOffice.service'

const LIST_PATH = '/layout/virtual-office'

const EMPTY_FILTERS = { city: '', status: '', cityTier: '', hasCoupon: '', minPrice: '', maxPrice: '' }

export function VirtualOfficeListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 400)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('')
  const [orderBy, setOrderBy] = useState<'1' | '-1' | ''>('')
  const [confirm, setConfirm] = useState<VirtualOfficeListing | null>(null)

  const params = useMemo(() => {
    const p: Record<string, unknown> = { limit: pageSize, page }
    if (search.trim()) p.search = search.trim()
    for (const [k, v] of Object.entries(filters)) if (v) p[k] = v
    if (sortBy) {
      p.sortBy = sortBy
      p.orderBy = orderBy || '1'
    }
    return p
  }, [pageSize, page, search, filters, sortBy, orderBy])

  const listQ = useQuery({ queryKey: ['virtual-offices', params], queryFn: () => listVirtualOffices(params), staleTime: 10_000 })
  const statsQ = useQuery({ queryKey: ['virtual-offices', 'stats'], queryFn: getVirtualOfficeStats, staleTime: 30_000 })

  const delMut = useMutation({
    mutationFn: (id: string) => deleteVirtualOffice(id),
    onSuccess: () => {
      toast.success('Virtual office deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['virtual-offices'] })
    },
    onError: (e: unknown) => toast.error(errorMessage(e, 'Delete failed')),
  })

  const rows = (listQ.data?.data ?? []) as VirtualOfficeListing[]
  const total = resolveListTotal(listQ.data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const totals = statsQ.data?.totals

  function setFilter(key: keyof typeof EMPTY_FILTERS, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function toggleSort(col: string) {
    if (sortBy !== col) {
      setSortBy(col)
      setOrderBy('1')
    } else if (orderBy === '1') {
      setOrderBy('-1')
    } else {
      setSortBy('')
      setOrderBy('')
    }
    setPage(1)
  }

  const sortHead = (col: string, label: string) => (
    <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort(col)}>
      {label} {sortIndicator(sortBy === col, orderBy)}
    </button>
  )

  return (
    <>
      <PageShell
        title="Virtual offices"
        description="Business-address plans by city, kept separate from coworking spaces. Operator price is what we pay; selling price is what the customer pays."
        actions={
          <Button variant="primary" onClick={() => navigate(`${LIST_PATH}/add`)}>
            Add virtual office
          </Button>
        }
      >
        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-lab">Listings</div>
            <div className="kpi-val tnum">{totals ? totals.active : '—'}</div>
            <div className="text-xs text-muted">{totals ? `active of ${totals.total} · ${statsQ.data?.cities.length ?? 0} cities` : ' '}</div>
          </div>
          <div className="kpi">
            <div className="kpi-lab">Selling price / year</div>
            <div className="kpi-val tnum text-[22px]">{totals ? `${formatInr(totals.minPrice)} – ${formatInr(totals.maxPrice)}` : '—'}</div>
            <div className="text-xs text-muted">{totals?.noPrice ? `${totals.noPrice} without a price yet` : ' '}</div>
          </div>
          <div className="kpi">
            <div className="kpi-lab">With a coupon</div>
            <div className="kpi-val tnum">{totals ? totals.withCoupon : '—'}</div>
            <div className="text-xs text-muted">{totals ? `${totals.inactive} inactive` : ' '}</div>
          </div>
        </div>

        <ListFilterCard
          description="Search by name, locality, address, amenity or phone."
          onReset={() => {
            setSearchInput('')
            setFilters(EMPTY_FILTERS)
            setPage(1)
            setSortBy('')
            setOrderBy('')
          }}
        >
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="vo-search">Search</label>
            <Input id="vo-search" value={searchInput} onChange={(e) => { setPage(1); setSearchInput(e.target.value) }} placeholder="Space, locality, amenity…" />
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="vo-city">City</label>
            <select id="vo-city" className={filterSelectClass} value={filters.city} onChange={(e) => setFilter('city', e.target.value)}>
              <option value="">All cities</option>
              {(statsQ.data?.cities ?? []).map((c) => (
                <option key={c.city} value={c.city}>{c.city} ({c.total})</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="vo-status">Status</label>
            <select id="vo-status" className={filterSelectClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="vo-tier">City tier</label>
            <select id="vo-tier" className={filterSelectClass} value={filters.cityTier} onChange={(e) => setFilter('cityTier', e.target.value)}>
              <option value="">All tiers</option>
              {VO_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="vo-coupon">Coupon</label>
            <select id="vo-coupon" className={filterSelectClass} value={filters.hasCoupon} onChange={(e) => setFilter('hasCoupon', e.target.value)}>
              <option value="">Any</option>
              <option value="yes">Has a coupon</option>
              <option value="no">No coupon</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="vo-min">Selling price from (₹/yr)</label>
            <Input id="vo-min" type="number" min={0} value={filters.minPrice} onChange={(e) => setFilter('minPrice', e.target.value)} placeholder="0" />
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="vo-max">Selling price to (₹/yr)</label>
            <Input id="vo-max" type="number" min={0} value={filters.maxPrice} onChange={(e) => setFilter('maxPrice', e.target.value)} placeholder="Any" />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={listQ.isLoading}
          total={total}
          noun="virtual office"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th>{sortHead('spaceName', 'Space')}</Th>
              <Th>{sortHead('city', 'City')}</Th>
              <Th className="text-right">{sortHead('annualPriceInr', 'Operator / yr')}</Th>
              <Th className="text-right">{sortHead('sellingPriceInr', 'Selling / yr')}</Th>
              <Th>Coupon</Th>
              <Th>{sortHead('status', 'Status')}</Th>
              <Th>Phone</Th>
              <Th className="text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr><Td colSpan={8} className="list-empty">Loading…</Td></Tr>
            ) : rows.length === 0 ? (
              <Tr><Td colSpan={8} className="list-empty"><strong>No virtual offices</strong>Change the filters, or add one.</Td></Tr>
            ) : (
              rows.map((row) => (
                <Tr key={row.id} className="cursor-pointer" onClick={() => navigate(`${LIST_PATH}/detail/${row.id}`)}>
                  <Td className="align-middle">
                    <div className="font-medium text-ink">{row.spaceName}</div>
                    <div className="text-xs text-muted">{row.locality || '—'}{row.images?.length ? ` · ${row.images.length} photo${row.images.length === 1 ? '' : 's'}` : ''}</div>
                  </Td>
                  <Td className="align-middle text-sm">
                    {row.city}
                    {row.cityTier ? <div className="text-xs text-muted">{row.cityTier}</div> : null}
                  </Td>
                  <Td className="align-middle text-right text-sm tnum text-muted">{formatInr(row.annualPriceInr)}</Td>
                  <Td className="align-middle text-right text-sm tnum">
                    <span className="font-semibold text-ink">{formatInr(row.sellingPriceInr)}</span>
                    {row.marginInr ? <div className={row.marginInr > 0 ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'}>{row.marginInr > 0 ? '+' : ''}{formatInr(row.marginInr)} margin</div> : null}
                  </Td>
                  <Td className="align-middle text-sm">{row.couponCode ? <span className="font-mono text-xs">{row.couponCode} · {row.couponPercentage}%</span> : <span className="text-muted">—</span>}</Td>
                  <Td className="align-middle"><StatusBadge status={row.status} /></Td>
                  <Td className="align-middle text-sm tnum">{row.phoneNumber || <span className="text-muted">—</span>}</Td>
                  <Td className="align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <IconAction label="Edit" onClick={() => navigate(`${LIST_PATH}/detail/${row.id}`)}>
                        <PencilSquareIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                      <IconAction label="Delete" tone="rose" onClick={() => setConfirm(row)}>
                        <TrashIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                    </div>
                  </Td>
                </Tr>
              ))
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
          loading={listQ.isLoading}
          className="border-0 bg-transparent px-0 shadow-none ring-0"
        />
      </PageShell>

      <ConfirmDialog
        open={!!confirm}
        title="Delete virtual office?"
        description={confirm ? `Remove “${confirm.spaceName}” (${confirm.city})? Switching it to Inactive keeps the record instead.` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm?.id) delMut.mutate(confirm.id) }}
      />
    </>
  )
}
