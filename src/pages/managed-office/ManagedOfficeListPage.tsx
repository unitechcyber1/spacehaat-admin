import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { SearchableCitySelect } from '../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../components/Table'
import { env } from '../../lib/env'
import { cn } from '../../lib/ui'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { workspaceRowId } from '../../lib/workspaceDisplay'
import { getCities } from '../../services/locations/city.service'
import {
  changeManagedOfficeStatus,
  deleteManagedOffice,
  getManagedOfficeBrands,
  getManagedOffices,
  type ManagedOfficeListItem,
  type ManagedOfficeStatus,
} from '../../services/managed-office/managedOffice.service'
import { seatTypeLabel, SEAT_TYPES } from './managedOfficeFormModel'

const LIST_PATH = '/layout/managed-office'

function statusLabel(status: string | undefined) {
  if (status === 'approve') return 'ENABLED'
  if (status === 'reject') return 'DISABLED'
  if (status === 'pending') return 'PENDING'
  if (status === 'inprogress') return 'IN PROGRESS'
  return status ?? '—'
}

function statusPillClass(status: string | undefined) {
  if (status === 'approve') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'reject') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (status === 'pending') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (status === 'inprogress') return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

function nameOf(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return String((value as { name?: string }).name ?? '')
}

function microLabel(o: ManagedOfficeListItem): string {
  return nameOf(o.location?.micro_location) || o.location?.micro_location_string || '—'
}

function priceLabel(o: ManagedOfficeListItem): string {
  const prices = (o.plans ?? [])
    .filter((p) => p.should_show !== false && (p.price ?? 0) > 0)
    .map((p) => p.price as number)
  if (!prices.length) return 'On request'
  return `₹${Math.min(...prices).toLocaleString('en-IN')}`
}

function seatTypesLabel(o: ManagedOfficeListItem): string {
  return [...new Set((o.plans ?? []).map((p) => seatTypeLabel(p.seat_type)).filter(Boolean))].join(', ')
}

function thumb(o: ManagedOfficeListItem): string {
  const first = [...(o.images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.image
  return typeof first === 'object' && first?.s3_link ? first.s3_link : ''
}

function previewUrl(slug?: string): string | null {
  const s = (slug ?? '').trim()
  const base = env.websitePath.replace(/\/$/, '')
  return s && base ? `${base}/managed-office/${s}` : null
}

type SortCol = 'name' | 'city' | 'location' | 'price' | 'status' | 'added_on' | ''

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'
const filterLabelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'
const inputClass = 'rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500'

function iconButtonClass(tone: 'slate' | 'emerald' | 'amber' | 'sky' | 'rose' = 'slate') {
  const toneClass = {
    slate: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    emerald: 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900',
    amber: 'text-amber-700 hover:bg-amber-50 hover:text-amber-900',
    sky: 'text-sky-700 hover:bg-sky-50 hover:text-sky-900',
    rose: 'text-rose-700 hover:bg-rose-50 hover:text-rose-900',
  }[tone]
  return cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200/80 transition',
    'focus:outline-none focus:ring-2 focus:ring-violet-500',
    toneClass,
  )
}

function IconTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-canvas opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}

function openEditInNewTab(id: string) {
  if (!id) return
  const prefix = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const path = `${prefix}${LIST_PATH}/detail/${id}`.replace(/\/+/g, '/')
  window.open(new URL(path, window.location.origin).href, '_blank', 'noopener,noreferrer')
}

type ConfirmState =
  | null
  | { type: 'delete'; id: string; name: string }
  | { type: 'status'; id: string; name: string; next: ManagedOfficeStatus }

const STATUS_COPY: Record<ManagedOfficeStatus, { title: string; verb: string; danger: boolean }> = {
  approve: { title: 'Enable managed office?', verb: 'Enable', danger: false },
  reject: { title: 'Disable managed office?', verb: 'Disable', danger: true },
  inprogress: { title: 'Mark managed office in progress?', verb: 'Mark in progress', danger: false },
  pending: { title: 'Mark managed office pending?', verb: 'Mark pending', danger: false },
}

export function ManagedOfficeListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [nameInput, setNameInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 600)
  const debouncedLocation = useDebouncedValue(locationInput, 500)
  const [city, setCity] = useState('')
  const [brand, setBrand] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ManagedOfficeStatus>('all')
  const [seatType, setSeatType] = useState('')
  const [priceFilter, setPriceFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState<SortCol>('')
  const [orderBy, setOrderBy] = useState<'1' | '-1' | ''>('')
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const params = useMemo(
    () => ({
      limit: pageSize,
      page,
      ...(debouncedName.trim() ? { name: debouncedName.trim() } : {}),
      ...(city ? { city } : {}),
      ...(debouncedLocation.trim() ? { location: debouncedLocation.trim() } : {}),
      ...(brand ? { brand } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(seatType ? { seat_type: seatType } : {}),
      ...(priceFilter ? { has_price: priceFilter } : {}),
      ...(sortBy ? { sortBy, orderBy: orderBy || '1' } : {}),
    }),
    [pageSize, page, debouncedName, city, debouncedLocation, brand, statusFilter, seatType, priceFilter, sortBy, orderBy],
  )

  const listQ = useQuery({
    queryKey: ['managed-offices', params],
    queryFn: () => getManagedOffices(params),
    staleTime: 10_000,
  })

  const citiesQ = useQuery({
    queryKey: ['cities', 'managed-offices'],
    queryFn: () => getCities({ limit: 200_000 }),
    staleTime: 60_000,
  })

  const brandsQ = useQuery({
    queryKey: ['managed-office-brands'],
    queryFn: getManagedOfficeBrands,
    staleTime: 60_000,
  })

  const cityOptions = useMemo(() => {
    const raw = (citiesQ.data?.data ?? []) as Record<string, unknown>[]
    const seen = new Set<string>()
    const out: { id: string; name: string }[] = []
    for (const c of raw) {
      const id = String(c.id ?? c._id ?? '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push({ id, name: String(c.name ?? '') })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [citiesQ.data?.data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['managed-offices'] })

  const delMut = useMutation({
    mutationFn: (id: string) => deleteManagedOffice(id),
    onSuccess: () => {
      toast.success('Managed office deleted')
      setConfirm(null)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ManagedOfficeStatus }) => changeManagedOfficeStatus(id, next),
    onSuccess: (_, v) => {
      toast.success(`Status set to ${statusLabel(v.next)}`)
      setConfirm(null)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  function toggleSort(col: SortCol) {
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

  function sortHeader(col: SortCol, label: string) {
    const indicator = sortBy !== col ? '↕' : orderBy === '-1' ? '↓' : '↑'
    return (
      <button
        type="button"
        className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
        onClick={() => toggleSort(col)}
      >
        {label} {indicator}
      </button>
    )
  }

  function onPreview(o: ManagedOfficeListItem) {
    if (o.status !== 'approve') {
      toast.error('Preview is only available for enabled managed offices.')
      return
    }
    const url = previewUrl(o.slug)
    if (!url) {
      toast.error(o.slug ? 'Set VITE_WEBSITE_URL to your public site for preview.' : 'Missing slug.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function resetFilters() {
    setNameInput('')
    setLocationInput('')
    setCity('')
    setBrand('')
    setStatusFilter('all')
    setSeatType('')
    setPriceFilter('')
    setSortBy('')
    setOrderBy('')
    setPage(1)
    setPageSize(25)
  }

  const total = listQ.data?.totalRecords ?? listQ.data?.data?.length ?? 0
  const rows = (listQ.data?.data ?? []) as ManagedOfficeListItem[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const confirmDialog = (() => {
    if (!confirm) return null
    if (confirm.type === 'delete') {
      return {
        title: 'Delete managed office?',
        description: `Permanently remove “${confirm.name}”? This cannot be undone.`,
        confirmText: 'Delete',
        danger: true,
        busy: delMut.isPending,
        onConfirm: () => delMut.mutate(confirm.id),
      }
    }
    const copy = STATUS_COPY[confirm.next]
    return {
      title: copy.title,
      description: `Set “${confirm.name}” to ${statusLabel(confirm.next)}?`,
      confirmText: copy.verb,
      danger: copy.danger,
      busy: statusMut.isPending,
      onConfirm: () => statusMut.mutate({ id: confirm.id, next: confirm.next }),
    }
  })()

  return (
    <>
      <PageShell
        title="Managed offices"
        description="Review, edit and publish managed office listings."
        actions={
          <Button variant="primary" onClick={() => navigate(`${LIST_PATH}/add`)}>
            Add managed office
          </Button>
        }
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-surface p-1 shadow-md ring-1 ring-line">
          <div className="rounded-[0.875rem] bg-surface p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <p className="text-xs text-slate-500">Name searches the office name, slug and building.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 border-slate-200/80 bg-surface text-slate-700 hover:bg-slate-50"
                onClick={resetFilters}
              >
                Reset all
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 sm:col-span-2">
                <label className={filterLabelClass} htmlFor="mo-filter-name">Name</label>
                <Input
                  id="mo-filter-name"
                  value={nameInput}
                  onChange={(e) => {
                    setPage(1)
                    setNameInput(e.target.value)
                  }}
                  placeholder="Search by name, slug or building…"
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} id="mo-filter-city-label" htmlFor="mo-filter-city">City</label>
                <SearchableCitySelect
                  id="mo-filter-city"
                  aria-labelledby="mo-filter-city-label"
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
                <label className={filterLabelClass} htmlFor="mo-filter-location">Micro-location</label>
                <Input
                  id="mo-filter-location"
                  value={locationInput}
                  onChange={(e) => {
                    setPage(1)
                    setLocationInput(e.target.value)
                  }}
                  placeholder="e.g. Cyber City"
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="mo-filter-brand">Brand</label>
                <select
                  id="mo-filter-brand"
                  className={filterSelectClass}
                  value={brand}
                  onChange={(e) => {
                    setPage(1)
                    setBrand(e.target.value)
                  }}
                >
                  <option value="">All brands</option>
                  {(brandsQ.data?.data ?? []).map((b) =>
                    b.id ? (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ) : null,
                  )}
                </select>
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="mo-filter-status">Status</label>
                <select
                  id="mo-filter-status"
                  className={filterSelectClass}
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1)
                    setStatusFilter(e.target.value as typeof statusFilter)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="inprogress">In progress</option>
                  <option value="approve">Enabled</option>
                  <option value="reject">Disabled</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="mo-filter-seat">Seat type</label>
                <select
                  id="mo-filter-seat"
                  className={filterSelectClass}
                  value={seatType}
                  onChange={(e) => {
                    setPage(1)
                    setSeatType(e.target.value)
                  }}
                >
                  <option value="">All seat types</option>
                  {SEAT_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="mo-filter-price">Price</label>
                <select
                  id="mo-filter-price"
                  className={filterSelectClass}
                  value={priceFilter}
                  onChange={(e) => {
                    setPage(1)
                    setPriceFilter(e.target.value as typeof priceFilter)
                  }}
                >
                  <option value="">Any</option>
                  <option value="true">Has a price</option>
                  <option value="false">Price on request</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <ListPageMeta
          loading={listQ.isLoading}
          loadingLabel="Loading managed offices…"
          total={total}
          noun="managed office"
          error={listQ.isError ? ((listQ.error as Error)?.message ?? 'Failed to load') : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[26%]">{sortHeader('name', 'Name')}</Th>
              <Th className="w-[11%]">Brand</Th>
              <Th className="w-[10%]">{sortHeader('city', 'City')}</Th>
              <Th className="w-[14%]">{sortHeader('location', 'Micro-location')}</Th>
              <Th className="w-[11%]">{sortHeader('price', 'Price / seat')}</Th>
              <Th className="w-[10%]">{sortHeader('status', 'Status')}</Th>
              <Th className="w-[5%] text-center">Edit</Th>
              <Th className="w-[5%] text-center">Preview</Th>
              <Th className="w-[14%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {!listQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td colSpan={9} className="py-16 text-center text-sm text-slate-500">
                  No managed offices match these filters.
                </Td>
              </Tr>
            ) : null}
            {rows.map((o) => {
              const id = workspaceRowId(o)
              const img = thumb(o)
              const seats = seatTypesLabel(o)
              return (
                <Tr key={id || o.name}>
                  <Td className="align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      {img ? (
                        <img src={img} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="h-10 w-14 shrink-0 rounded-md bg-slate-100 ring-1 ring-slate-200" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{o.name ?? '—'}</div>
                        <div className="truncate text-xs text-slate-500">
                          {o.location?.building_name ? `${o.location.building_name} · ` : ''}/{o.slug}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="align-middle text-sm text-slate-700">{nameOf(o.brand) || '—'}</Td>
                  <Td className="align-middle text-sm text-slate-700">{nameOf(o.location?.city) || '—'}</Td>
                  <Td className="align-middle">
                    <span className="line-clamp-2 text-sm text-slate-700">{microLabel(o)}</span>
                  </Td>
                  <Td className="align-middle">
                    <div className="text-sm font-medium text-slate-800">{priceLabel(o)}</div>
                    {seats ? <div className="text-xs text-slate-500">{seats}</div> : null}
                  </Td>
                  <Td className="align-middle">
                    <span
                      className={cn(
                        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                        statusPillClass(o.status),
                      )}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </Td>
                  <Td className="align-middle text-center">
                    <IconTooltip label="Edit">
                      <button
                        type="button"
                        className={iconButtonClass('slate')}
                        onClick={() => openEditInNewTab(id)}
                        aria-label="Edit managed office"
                      >
                        <PencilSquareIcon className="h-5 w-5" aria-hidden />
                      </button>
                    </IconTooltip>
                  </Td>
                  <Td className="align-middle text-center">
                    <IconTooltip label={o.status === 'approve' ? 'Preview' : 'Preview (enabled only)'}>
                      <button
                        type="button"
                        className={iconButtonClass(o.status === 'approve' ? 'slate' : 'amber')}
                        onClick={() => onPreview(o)}
                        aria-label="Preview managed office"
                      >
                        <EyeIcon className="h-5 w-5" aria-hidden />
                      </button>
                    </IconTooltip>
                  </Td>
                  <Td className="align-middle">
                    <div className="flex items-center justify-center gap-2">
                      {(
                        [
                          ['approve', 'Enable', 'emerald', CheckCircleIcon],
                          ['inprogress', 'In progress', 'sky', ClockIcon],
                          ['reject', 'Disable', 'amber', XCircleIcon],
                        ] as const
                      ).map(([next, label, tone, Icon]) => (
                        <IconTooltip key={next} label={label}>
                          <button
                            type="button"
                            className={iconButtonClass(tone)}
                            disabled={o.status === next}
                            onClick={() => setConfirm({ type: 'status', id, name: o.name ?? '', next })}
                            aria-label={`${label} managed office`}
                          >
                            <Icon className="h-5 w-5" aria-hidden />
                          </button>
                        </IconTooltip>
                      ))}
                      <IconTooltip label="Delete">
                        <button
                          type="button"
                          className={iconButtonClass('rose')}
                          onClick={() => setConfirm({ type: 'delete', id, name: o.name ?? '' })}
                          aria-label="Delete managed office"
                        >
                          <TrashIcon className="h-5 w-5" aria-hidden />
                        </button>
                      </IconTooltip>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>

        <ListPagination
          currentPage={Math.min(page, totalPages)}
          pageCount={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          loading={listQ.isLoading}
          className="border-0 bg-transparent px-0 shadow-none ring-0"
        />
      </PageShell>

      {confirmDialog ? (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          danger={confirmDialog.danger}
          busy={confirmDialog.busy}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmDialog.onConfirm}
        />
      ) : null}
    </>
  )
}
