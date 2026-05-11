import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { SearchableCitySelect } from '../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../components/Table'
import { cn } from '../../lib/ui'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { deletePg, getPgs } from '../../services/pg/pg.service'
import { getCities } from '../../services/locations/city.service'
import { pgRowId } from './pgFormModel'

type PgRow = Record<string, unknown>

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

const filterLabelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Normalize API date fields (ISO strings, unix seconds/ms, Mongo extended JSON `$date`). */
function coerceDateInput(v: unknown): string | undefined {
  if (v == null) return undefined
  if (typeof v === 'string') {
    const s = v.trim()
    return s ? s : undefined
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v > 9999999999 ? v : v * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
  }
  if (typeof v === 'object' && v !== null && '$date' in v) {
    return coerceDateInput((v as { $date?: unknown }).$date)
  }
  return undefined
}

function pgAddedOn(pg: PgRow): string | undefined {
  for (const k of ['added_on', 'addedOn', 'createdAt', 'created_at', 'dateAdded'] as const) {
    const s = coerceDateInput(pg[k])
    if (s) return s
  }
  return undefined
}

function pgUpdatedOn(pg: PgRow): string | undefined {
  for (const k of ['updated_on', 'updatedOn', 'updatedAt', 'updated_at', 'modifiedAt', 'modified_at'] as const) {
    const s = coerceDateInput(pg[k])
    if (s) return s
  }
  return undefined
}

function cityLabel(pg: PgRow): string {
  const lids = pg.locationIds as Record<string, unknown> | undefined
  const cref = lids?.city
  if (cref && typeof cref === 'object' && cref !== null && 'name' in cref) return String((cref as { name?: string }).name ?? '')
  if (typeof pg.city === 'string' && pg.city) return pg.city
  if (cref && typeof cref === 'string') return '—'
  return '—'
}

function localityLabel(pg: PgRow): string {
  if (typeof pg.locality === 'string' && pg.locality.trim()) return pg.locality
  return '—'
}

function IconTooltip({ label, children }: { label: string; children: React.ReactNode }) {
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

function iconBtnNeutral() {
  return cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200/80 transition',
    'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    'focus:outline-none focus:ring-2 focus:ring-violet-500',
  )
}

type SortCol = 'name' | 'added_on' | 'updated_on' | ''

export function PgListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [nameInput, setNameInput] = useState('')
  const [localityInput, setLocalityInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 400)
  const debouncedLocality = useDebouncedValue(localityInput, 400)

  const [cityFilter, setCityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<SortCol>('')
  const [orderAscending, setOrderAscending] = useState(true)

  const params = useMemo(() => {
    const skip = (page - 1) * pageSize
    const p: Record<string, unknown> = {
      limit: pageSize,
      skip,
    }
    const n = debouncedName.trim()
    if (n) p.name = n
    const loc = debouncedLocality.trim()
    if (loc) p.locality = loc
    if (cityFilter && /^[a-f\d]{24}$/i.test(cityFilter)) p.city = cityFilter
    if (statusFilter.trim()) p.status = statusFilter.trim()
    if (sortBy) {
      p.sortBy = sortBy
      p.orderBy = orderAscending ? 1 : -1
    }
    return p
  }, [
    page,
    pageSize,
    debouncedName,
    debouncedLocality,
    cityFilter,
    statusFilter,
    sortBy,
    orderAscending,
  ])

  const listQ = useQuery({
    queryKey: ['pgs', params],
    queryFn: () => getPgs(params),
    staleTime: 10_000,
  })

  const citiesQ = useQuery({
    queryKey: ['cities', 'pg-list'],
    queryFn: () => getCities({ limit: 200_000 }),
    staleTime: 60_000,
  })

  const cityRows = useMemo(() => {
    const raw = (citiesQ.data?.data ?? []) as Record<string, unknown>[]
    const out: { id: string; name: string }[] = []
    const seen = new Set<string>()
    for (const c of raw) {
      const id = c.id ?? c._id
      if (id == null) continue
      const sid = String(id)
      if (seen.has(sid)) continue
      seen.add(sid)
      out.push({ id: sid, name: String(c.name ?? c.city_name ?? '') })
    }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return out
  }, [citiesQ.data?.data])

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deletePg(id),
    onSuccess: () => {
      toast.success('PG deleted')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['pgs'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  function toggleSort(col: SortCol) {
    if (!col) return
    if (sortBy !== col) {
      setSortBy(col)
      setOrderAscending(col === 'name')
    } else {
      setOrderAscending((x) => !x)
    }
    setPage(1)
  }

  function sortIndicator(col: SortCol) {
    if (sortBy !== col) return '↕'
    return orderAscending ? '↑' : '↓'
  }

  const total = listQ.data?.totalRecords ?? listQ.data?.data?.length ?? 0
  const rows = (listQ.data?.data ?? []) as PgRow[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <>
      <PageShell
        title="PG listings"
        description="Paying guest properties — filter, paginate, and manage."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/pg/new')}>
            Add PG
          </Button>
        }
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/30 p-1 shadow-md ring-1 ring-white/80">
          <div className="rounded-[0.875rem] bg-white/85 p-5 backdrop-blur-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <p className="text-xs text-slate-500">Query params map to GET <code className="text-violet-700">admin/pgs</code>.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 border-slate-200/80 bg-white/90"
                onClick={() => {
                  setNameInput('')
                  setLocalityInput('')
                  setCityFilter('')
                  setStatusFilter('')
                  setPage(1)
                  setPageSize(20)
                  setSortBy('')
                  setOrderAscending(true)
                }}
              >
                Reset all
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                <label className={filterLabelClass}>Name contains</label>
                <Input
                  value={nameInput}
                  onChange={(e) => {
                    setPage(1)
                    setNameInput(e.target.value)
                  }}
                  placeholder="Search by name…"
                  className="rounded-xl shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass}>City (ObjectId)</label>
                <SearchableCitySelect
                  cities={cityRows}
                  value={cityFilter}
                  loading={citiesQ.isLoading}
                  onChange={(id) => {
                    setPage(1)
                    setCityFilter(id)
                  }}
                  buttonClassName={filterSelectClass}
                  id="pg-filter-city"
                />
              </div>
              <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                <label className={filterLabelClass}>Locality contains</label>
                <Input
                  value={localityInput}
                  onChange={(e) => {
                    setPage(1)
                    setLocalityInput(e.target.value)
                  }}
                  placeholder="Substring on locality…"
                  className="rounded-xl shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass}>Status (exact)</label>
                <Input
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1)
                    setStatusFilter(e.target.value)
                  }}
                  placeholder="e.g. Active"
                  className="rounded-xl shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="pg-filter-pagesize">
                  Page size
                </label>
                <select
                  id="pg-filter-pagesize"
                  className={filterSelectClass}
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1)
                    setPageSize(Number(e.target.value))
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
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
                <span className="text-slate-500"> PG{total !== 1 ? 's' : ''}</span>
              </>
            )}
            {listQ.isError ? (
              <span className="ml-2 text-rose-600">{(listQ.error as Error)?.message ?? 'Failed to load'}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="bg-white/90" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <div className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80">
              Page {page} of {totalPages}
            </div>
            <Button variant="secondary" className="bg-white/90" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>

        <Table className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200/70">
          <thead className="bg-gradient-to-r from-slate-50 to-violet-50/40">
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
              <Th className="w-[16%]">Locality</Th>
              <Th className="w-[18%]">City</Th>
              <Th className="w-[14%]">Status</Th>
              <Th className="w-[18%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('added_on')}
                >
                  Added {sortIndicator('added_on')}
                </button>
              </Th>
              <Th className="w-[14%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('updated_on')}
                >
                  Updated {sortIndicator('updated_on')}
                </button>
              </Th>
              <Th className="w-[12%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {!listQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="py-16 text-center text-sm text-slate-500">
                  No PGs match these filters.
                </Td>
              </Tr>
            ) : null}
            {rows.map((pg) => {
              const id = pgRowId(pg)
              const name = typeof pg.name === 'string' ? pg.name : '—'
              const st = typeof pg.status === 'string' ? pg.status : pg.status != null ? String(pg.status) : '—'
              const added = pgAddedOn(pg)
              const updated = pgUpdatedOn(pg)

              return (
                <Tr key={id || name}>
                  <Td className="align-middle font-medium text-slate-900">
                    <div className="line-clamp-2 min-w-0">{name}</div>
                  </Td>
                  <Td className="align-middle text-sm text-slate-700">{localityLabel(pg)}</Td>
                  <Td className="align-middle text-sm text-slate-700">{cityLabel(pg)}</Td>
                  <Td className="align-middle whitespace-nowrap text-sm font-medium text-slate-800">{st}</Td>
                  <Td className="align-middle whitespace-nowrap text-xs text-slate-600">{fmtDate(added)}</Td>
                  <Td className="align-middle whitespace-nowrap text-xs text-slate-600">{fmtDate(updated)}</Td>
                  <Td className="align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <IconTooltip label="View / edit">
                        <button
                          type="button"
                          className={iconBtnNeutral()}
                          onClick={() => id && navigate(`/layout/pg/${id}/edit`)}
                          aria-label="View or edit PG"
                          disabled={!id}
                        >
                          <EyeIcon className="h-5 w-5" aria-hidden />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="Edit">
                        <button
                          type="button"
                          className={iconBtnNeutral()}
                          onClick={() => id && navigate(`/layout/pg/${id}/edit`)}
                          aria-label="Edit PG"
                          disabled={!id}
                        >
                          <PencilSquareIcon className="h-5 w-5" aria-hidden />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="Delete">
                        <button
                          type="button"
                          className={cn(iconBtnNeutral(), 'text-rose-700 hover:bg-rose-50 hover:text-rose-900')}
                          onClick={() => id && setConfirmDelete({ id, name })}
                          aria-label="Delete PG"
                          disabled={!id}
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
      </PageShell>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete PG?"
        description={confirmDelete ? `Soft-delete “${confirmDelete.name}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && delMut.mutate(confirmDelete.id)}
      />
    </>
  )
}
