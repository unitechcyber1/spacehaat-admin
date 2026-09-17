import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { UserDetailsModal } from '../../components/UserDetailsModal'
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

function statusPillClass(status: string | undefined) {
  if (status === 'approve') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'reject') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (status === 'pending') return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

function iconButtonClass(tone: 'slate' | 'emerald' | 'amber' | 'rose' | 'violet' = 'slate') {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
      : tone === 'amber'
        ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-900'
        : tone === 'rose'
          ? 'text-rose-700 hover:bg-rose-50 hover:text-rose-900'
          : tone === 'violet'
            ? 'text-violet-700 hover:bg-violet-50 hover:text-violet-900'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'

  return cn(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200/80 transition',
    'focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40',
    toneClass,
  )
}

function IconTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap',
          'rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg',
          'opacity-0 transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        {label}
      </span>
    </span>
  )
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
    role: 'Admin' | 'User'
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
      role: userKindLabel(row.user),
    })
  }

  const data = listQ.data
  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as OfficeSpaceListItem[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
        <div className="filter-card">
          <div className="filter-card-inner">
            <div className="filter-card-head">
              <div>
                <h2 className="filter-card-title">Filters</h2>
                <p className="text-xs text-slate-500">
                  Product ID, name, and building name wait 1s after you pause typing (same as Angular).
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 border-slate-200/80 bg-surface text-slate-700 hover:bg-slate-50"
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

            <div className="filter-card-body cols-6">
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
            </div>
          </div>
        </div>

        <ListPageMeta
          loading={listQ.isLoading}
          loadingLabel="Loading office spaces…"
          total={total}
          noun="office space"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[22%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('name')}
                >
                  Name {sortIndicator('name')}
                </button>
              </Th>
              <Th className="w-[10%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('productId')}
                >
                  ID {sortIndicator('productId')}
                </button>
              </Th>
              <Th className="w-[8%] text-center">User</Th>
              <Th className="w-[12%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('city')}
                >
                  City {sortIndicator('city')}
                </button>
              </Th>
              <Th className="w-[18%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('location')}
                >
                  Location {sortIndicator('location')}
                </button>
              </Th>
              <Th className="w-[10%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('addedon')}
                >
                  Added {sortIndicator('addedon')}
                </button>
              </Th>
              <Th className="w-[10%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('status')}
                >
                  Status {sortIndicator('status')}
                </button>
              </Th>
              <Th className="w-[10%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr>
                <Td colSpan={8} className="py-16 text-center text-sm text-slate-500">
                  Loading…
                </Td>
              </Tr>
            ) : rows.length === 0 ? (
              <Tr>
                <Td colSpan={8} className="py-16 text-center text-sm text-slate-500">
                  No office spaces match these filters.
                </Td>
              </Tr>
            ) : (
              rows.map((row) => {
                const id = officeRowId(row)
                const canPreview = row.status === 'approve'
                return (
                  <Tr key={id || row.name}>
                    <Td className="align-middle">
                      <div className="min-w-0 max-w-[280px]">
                        <div className="line-clamp-2 font-semibold leading-snug text-slate-900">
                          {row.name ?? '—'}
                        </div>
                        {row.slug ? (
                          <div className="mt-0.5 truncate text-xs text-slate-500">/{row.slug}</div>
                        ) : null}
                      </div>
                    </Td>
                    <Td className="align-middle">
                      <span className="tnum text-xs font-medium text-slate-600">{row.productId ?? '—'}</span>
                    </Td>
                    <Td className="align-middle">
                      <button
                        type="button"
                        className="user-chip"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openUserDetails(row)
                        }}
                        aria-label={`View ${userKindLabel(row.user)} details`}
                      >
                        <UserCircleIcon aria-hidden />
                        <span className="truncate">{userKindLabel(row.user)}</span>
                      </button>
                    </Td>
                    <Td className="align-middle">
                      <span className="truncate text-sm text-slate-700">{cityName(row)}</span>
                    </Td>
                    <Td className="align-middle">
                      <span className="line-clamp-2 text-sm text-slate-700">{microLocationLine(row)}</span>
                    </Td>
                    <Td className="align-middle whitespace-nowrap text-sm text-slate-600">
                      {formatAddedOn(row.added_on)}
                    </Td>
                    <Td className="align-middle">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
                          statusPillClass(row.status),
                          statusClass(row.status),
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </Td>
                    <Td className="align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <IconTooltip label="Edit">
                          <button
                            type="button"
                            className={iconButtonClass('slate')}
                            disabled={!id}
                            onClick={() => navigate(`/layout/office-space/detail/${id}`)}
                            aria-label="Edit office space"
                          >
                            <PencilSquareIcon className="h-5 w-5" aria-hidden />
                          </button>
                        </IconTooltip>
                        <IconTooltip label={canPreview ? 'Preview on site' : 'Preview (enabled only)'}>
                          <button
                            type="button"
                            className={iconButtonClass(canPreview ? 'slate' : 'amber')}
                            onClick={() => onPreview(row)}
                            aria-label="Preview office space"
                          >
                            <EyeIcon className="h-5 w-5" aria-hidden />
                          </button>
                        </IconTooltip>
                        <IconTooltip label="Enable">
                          <button
                            type="button"
                            className={iconButtonClass('emerald')}
                            onClick={() => setConfirm({ type: 'enable', row })}
                            aria-label="Enable office space"
                          >
                            <CheckCircleIcon className="h-5 w-5" aria-hidden />
                          </button>
                        </IconTooltip>
                        <IconTooltip label="Disable">
                          <button
                            type="button"
                            className={iconButtonClass('amber')}
                            onClick={() => setConfirm({ type: 'disable', row })}
                            aria-label="Disable office space"
                          >
                            <XCircleIcon className="h-5 w-5" aria-hidden />
                          </button>
                        </IconTooltip>
                        <IconTooltip label="Delete">
                          <button
                            type="button"
                            className={iconButtonClass('rose')}
                            onClick={() => setConfirm({ type: 'delete', id, name: row.name ?? '' })}
                            aria-label="Delete office space"
                          >
                            <TrashIcon className="h-5 w-5" aria-hidden />
                          </button>
                        </IconTooltip>
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
          pageSizeOptions={[5, 10, 25, 100]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          loading={listQ.isLoading}
          className="mt-0 border-0 bg-transparent px-1 shadow-none ring-0"
        />
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

      <UserDetailsModal
        open={Boolean(userDialog)}
        onClose={() => setUserDialog(null)}
        name={userDialog?.name}
        email={userDialog?.email}
        phone={userDialog?.phone}
        role={userDialog?.role}
      />
    </>
  )
}
