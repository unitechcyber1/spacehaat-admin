import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { SearchableCitySelect } from '../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../components/Table'
import { cn } from '../../lib/ui'
import { env } from '../../lib/env'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import {
  changeOfficeSpaceStatus,
  deleteOfficeSpace,
  getOfficeSpaces,
} from '../../services/office-space/office-space.service'
import type { OfficeSpaceListItem } from '../../services/office-space/types'
import { getCities } from '../../services/locations/city.service'

const ADMIN_USER_ID = '5f2ce468ecdb5a5d67f0c621'

function officeRowId(row: OfficeSpaceListItem): string {
  return String(row.id ?? row._id ?? '')
}

function statusLabel(status: string | undefined) {
  if (status === 'approve') return 'ENABLED'
  if (status === 'reject') return 'DISABLED'
  if (status === 'pending') return 'PENDING'
  return status ?? '—'
}

function statusClass(status: string | undefined) {
  if (status === 'approve') return 'text-emerald-700'
  if (status === 'reject') return 'text-rose-700'
  if (status === 'pending') return 'text-amber-700'
  return 'text-slate-600'
}

function microLocationLine(row: OfficeSpaceListItem): string {
  const ml = row.location?.micro_location
  if (!ml) return '—'
  if (Array.isArray(ml)) {
    const parts = ml.map((m) => m?.name).filter(Boolean) as string[]
    return parts.length ? parts.join(', ') : '—'
  }
  if (typeof ml === 'object' && 'name' in ml && ml.name) return String(ml.name)
  return '—'
}

function cityName(row: OfficeSpaceListItem): string {
  const c = row.location?.city
  if (c && typeof c === 'object' && 'name' in c && c.name) return String(c.name)
  return 'No City'
}

function formatAddedOn(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function userKindLabel(user: OfficeSpaceListItem['user']): 'Admin' | 'User' {
  if (!user?.id) return 'Admin'
  if (String(user.id) === ADMIN_USER_ID) return 'Admin'
  return 'User'
}

type SortCol = 'productId' | 'name' | 'location' | 'city' | 'addedon' | 'status' | ''

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

const filterLabelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'

export function OfficeSpaceListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [productIdInput, setProductIdInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [buildingNameInput, setBuildingNameInput] = useState('')
  const [locationInput, setLocationInput] = useState('')

  const debouncedProductId = useDebouncedValue(productIdInput, 1000)
  const debouncedName = useDebouncedValue(nameInput, 1000)
  const debouncedBuildingName = useDebouncedValue(buildingNameInput, 1000)
  const debouncedLocation = useDebouncedValue(locationInput, 500)

  const [city, setCity] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approve' | 'reject'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<SortCol>('')
  const [orderBy, setOrderBy] = useState<'1' | '-1' | ''>('')

  const [userDialog, setUserDialog] = useState<{
    name: string
    email: string
    phone: string
  } | null>(null)

  const params = useMemo(
    () => ({
      limit: pageSize,
      page,
      ...(debouncedProductId.trim() ? { productId: debouncedProductId.trim().toLowerCase() } : {}),
      ...(debouncedName.trim() ? { name: debouncedName.trim().toLowerCase() } : {}),
      ...(debouncedBuildingName.trim() ? { building_name: debouncedBuildingName.trim().toLowerCase() } : {}),
      ...(city ? { city } : {}),
      ...(debouncedLocation.trim() ? { location: debouncedLocation.trim().toLowerCase() } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(sortBy ? { sortBy, orderBy: orderBy || '1' } : {}),
    }),
    [
      pageSize,
      page,
      debouncedProductId,
      debouncedName,
      debouncedBuildingName,
      city,
      debouncedLocation,
      statusFilter,
      sortBy,
      orderBy,
    ],
  )

  const listQ = useQuery({
    queryKey: ['office-spaces', params],
    queryFn: () => getOfficeSpaces(params),
    staleTime: 10_000,
  })

  const citiesQ = useQuery({
    queryKey: ['cities', 'office-spaces'],
    queryFn: () => getCities({ limit: 200_000 }),
    staleTime: 60_000,
  })

  const cityOptions = useMemo(() => {
    const raw = (citiesQ.data?.data ?? []) as Record<string, unknown>[]
    const seen = new Set<string>()
    const out: { id: string; name: string }[] = []
    for (const c of raw) {
      const id = c.id ?? c._id
      if (id == null || String(id).trim() === '') continue
      const sid = String(id)
      if (seen.has(sid)) continue
      seen.add(sid)
      const name = String(c.name ?? c.city_name ?? '')
      out.push({ id: sid, name })
    }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return out
  }, [citiesQ.data?.data])

  const [confirm, setConfirm] = useState<
    | null
    | { type: 'delete'; id: string; name: string }
    | { type: 'enable'; row: OfficeSpaceListItem }
    | { type: 'disable'; row: OfficeSpaceListItem }
  >(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteOfficeSpace(id),
    onSuccess: () => {
      toast.success('Office space deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['office-spaces'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const statusMut = useMutation({
    mutationFn: ({ row, next }: { row: OfficeSpaceListItem; next: string }) =>
      changeOfficeSpaceStatus({ ...row, status: next }),
    onSuccess: (_, v) => {
      toast.success(v.next === 'approve' ? 'Enabled' : 'Disabled')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['office-spaces'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  function toggleSort(col: SortCol) {
    if (!col) return
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

  function sortIndicator(col: SortCol) {
    if (!col || sortBy !== col) return '↕'
    return orderBy === '-1' ? '↓' : '↑'
  }

  function onPreview(row: OfficeSpaceListItem) {
    const slug = (row.slug ?? '').toLowerCase().trim()
    if (!slug) {
      toast.error('Missing slug.')
      return
    }
    const base = env.officeUrl?.replace(/\/$/, '')
    if (!base) {
      toast.error('Set VITE_OFFICE_URL in .env for preview (e.g. https://site.com/office-space/rent/).')
      return
    }
    window.open(`${base}/${slug}`, '_blank', 'noopener,noreferrer')
  }

  function openUserDetails(row: OfficeSpaceListItem) {
    const u = row.user
    setUserDialog({
      name: u?.name ?? '',
      email: u?.email ?? '',
      phone: u?.phone_number ?? '',
    })
  }

  const data = listQ.data
  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as OfficeSpaceListItem[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <>
      <PageShell
        title="Office space"
        description="Office Space table — filters and columns match the legacy Angular admin list."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/office-space/add')}>
            Add office space
          </Button>
        }
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/25 p-1 shadow-md shadow-slate-200/50 ring-1 ring-white/80">
          <div className="rounded-[0.875rem] bg-white/85 p-5 backdrop-blur-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <p className="text-xs text-slate-500">
                  Product ID, name, and building name wait 1s after you pause typing (same as Angular).
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setProductIdInput('')
                  setNameInput('')
                  setBuildingNameInput('')
                  setLocationInput('')
                  setCity('')
                  setStatusFilter('all')
                  setSortBy('')
                  setOrderBy('')
                  setPage(1)
                  setPageSize(10)
                }}
              >
                Reset filters
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="os-filter-product-id">
                  Product ID
                </label>
                <Input
                  id="os-filter-product-id"
                  value={productIdInput}
                  onChange={(e) => {
                    setPage(1)
                    setProductIdInput(e.target.value)
                  }}
                  placeholder="Product Id"
                  className="rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="os-filter-name">
                  Name
                </label>
                <Input
                  id="os-filter-name"
                  value={nameInput}
                  onChange={(e) => {
                    setPage(1)
                    setNameInput(e.target.value)
                  }}
                  placeholder="Search name"
                  className="rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="os-filter-building">
                  Building name
                </label>
                <Input
                  id="os-filter-building"
                  value={buildingNameInput}
                  onChange={(e) => {
                    setPage(1)
                    setBuildingNameInput(e.target.value)
                  }}
                  placeholder="Search building name"
                  className="rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} id="os-filter-city-label" htmlFor="os-filter-city">
                  City
                </label>
                <SearchableCitySelect
                  id="os-filter-city"
                  aria-labelledby="os-filter-city-label"
                  cities={cityOptions}
                  value={city}
                  loading={citiesQ.isLoading}
                  onChange={(id) => {
                    setPage(1)
                    setCity(id)
                  }}
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="os-filter-location">
                  Location
                </label>
                <Input
                  id="os-filter-location"
                  value={locationInput}
                  onChange={(e) => {
                    setPage(1)
                    setLocationInput(e.target.value)
                  }}
                  placeholder="Search location"
                  className="rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="os-filter-status">
                  Status
                </label>
                <select
                  id="os-filter-status"
                  className={filterSelectClass}
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1)
                    setStatusFilter(e.target.value as typeof statusFilter)
                  }}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approve">Enable</option>
                  <option value="reject">Disable</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="os-filter-pagesize">
                  Per page
                </label>
                <select
                  id="os-filter-pagesize"
                  className={filterSelectClass}
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1)
                    setPageSize(Number(e.target.value))
                  }}
                >
                  {[5, 10, 25, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50/80 px-4 py-3">
          <div className="text-sm text-slate-600">
            {listQ.isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" aria-hidden />
                Loading…
              </span>
            ) : (
              <>
                <span className="font-semibold text-slate-800">{total}</span>
                <span className="text-slate-500"> record{total !== 1 ? 's' : ''}</span>
              </>
            )}
            {listQ.isError ? (
              <span className="ml-2 text-rose-600">{(listQ.error as Error)?.message ?? 'Failed to load'}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="bg-white/90"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <div className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="secondary"
              className="bg-white/90"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <Table>
            <thead className="bg-gradient-to-r from-slate-50 to-sky-50/40">
              <tr>
                <Th>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                    onClick={() => toggleSort('productId')}
                  >
                    Product Id {sortIndicator('productId')}
                  </button>
                </Th>
                <Th>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                    onClick={() => toggleSort('name')}
                  >
                    Name {sortIndicator('name')}
                  </button>
                </Th>
                <Th>User</Th>
                <Th>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                    onClick={() => toggleSort('city')}
                  >
                    City {sortIndicator('city')}
                  </button>
                </Th>
                <Th>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                    onClick={() => toggleSort('location')}
                  >
                    Location {sortIndicator('location')}
                  </button>
                </Th>
                <Th>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                    onClick={() => toggleSort('addedon')}
                  >
                    Added on {sortIndicator('addedon')}
                  </button>
                </Th>
                <Th>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                    onClick={() => toggleSort('status')}
                  >
                    Status {sortIndicator('status')}
                  </button>
                </Th>
                <Th>Edit</Th>
                <Th>Preview</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {!listQ.isLoading && rows.length === 0 ? (
                <Tr>
                  <Td colSpan={10} className="py-16 text-center text-sm text-slate-500">
                    No office spaces match these filters.
                  </Td>
                </Tr>
              ) : null}
              {rows.map((row) => {
                const id = officeRowId(row)
                return (
                  <Tr key={id || row.name}>
                    <Td className="whitespace-nowrap text-slate-800">{row.productId ?? ''}</Td>
                    <Td className="min-w-[140px] font-medium text-slate-900">{row.name ?? '—'}</Td>
                    <Td>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-violet-700"
                        onClick={() => openUserDetails(row)}
                      >
                        {userKindLabel(row.user)}
                      </Button>
                    </Td>
                    <Td>{cityName(row)}</Td>
                    <Td className="max-w-[220px] text-sm text-slate-700">{microLocationLine(row)}</Td>
                    <Td className="whitespace-nowrap text-sm">{formatAddedOn(row.added_on)}</Td>
                    <Td className={cn('font-medium', statusClass(row.status))}>{statusLabel(row.status)}</Td>
                    <Td>
                      <Button
                        variant="ghost"
                        disabled={!id}
                        onClick={() => navigate(`/layout/office-space/detail/${id}`)}
                      >
                        Edit
                      </Button>
                    </Td>
                    <Td>
                      <Button variant="ghost" onClick={() => onPreview(row)}>
                        Preview
                      </Button>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          className="text-emerald-700"
                          onClick={() => setConfirm({ type: 'enable', row })}
                        >
                          Enable
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-amber-700"
                          onClick={() => setConfirm({ type: 'disable', row })}
                        >
                          Disable
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-rose-700"
                          onClick={() => setConfirm({ type: 'delete', id, name: row.name ?? '' })}
                        >
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      </PageShell>

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title="Delete office space?"
        description={confirm?.type === 'delete' ? `Remove “${confirm.name}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.type === 'delete' && delMut.mutate(confirm.id)}
      />

      <ConfirmDialog
        open={confirm?.type === 'enable'}
        title="Enable office space?"
        description={confirm?.type === 'enable' ? `Set “${confirm.row.name}” to ENABLED?` : undefined}
        confirmText="Enable"
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'enable' && statusMut.mutate({ row: confirm.row, next: 'approve' })
        }
      />

      <ConfirmDialog
        open={confirm?.type === 'disable'}
        title="Disable office space?"
        description={confirm?.type === 'disable' ? `Set “${confirm.row.name}” to DISABLED?` : undefined}
        confirmText="Disable"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'disable' && statusMut.mutate({ row: confirm.row, next: 'reject' })
        }
      />

      {userDialog ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="os-user-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl"
          >
            <h2 id="os-user-dialog-title" className="text-lg font-semibold text-slate-900">
              User details
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="text-slate-900">{userDialog.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-900">{userDialog.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-900">{userDialog.phone || '—'}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="primary" onClick={() => setUserDialog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
