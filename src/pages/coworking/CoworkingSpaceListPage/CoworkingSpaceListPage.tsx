import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { PageShell } from '../../../components/PageShell'
import { SearchableCitySelect } from '../../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { buildCoworkingListingPreviewUrl } from '../../../lib/coworkingPreviewUrl'
import { cn } from '../../../lib/ui'
import { workspaceCityLabel, workspaceMicroLocationLabel, workspaceRowId } from '../../../lib/workspaceDisplay'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import {
  changeWorkspaceStatus,
  deleteWorkspace,
  getWorkspaces,
} from '../../../services/coworking/workspaces.service'
import type { WorkspaceListItem } from '../../../services/coworking/types'
import { getCities } from '../../../services/locations/city.service'

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

type SortCol = 'name' | 'city' | 'location' | 'status' | ''

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

const filterLabelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'

function openCoworkingEditInNewTab(workspaceId: string) {
  if (!workspaceId) return
  const prefix = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const path = `${prefix}/layout/coworking/spaces/detail/${workspaceId}`.replace(/\/+/g, '/')
  window.open(new URL(path, window.location.origin).href, '_blank', 'noopener,noreferrer')
}

export function CoworkingSpaceListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [nameInput, setNameInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 1000)
  const debouncedLocation = useDebouncedValue(locationInput, 500)
  const [city, setCity] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approve' | 'reject'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<SortCol>('')
  const [orderBy, setOrderBy] = useState<'1' | '-1' | ''>('')

  const params = useMemo(
    () => ({
      limit: pageSize,
      page,
      ...(debouncedName.trim() ? { name: debouncedName.trim().toLowerCase() } : {}),
      ...(city ? { city } : {}),
      ...(debouncedLocation.trim() ? { location: debouncedLocation.trim().toLowerCase() } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(sortBy ? { sortBy, orderBy: orderBy || '1' } : {}),
    }),
    [pageSize, page, debouncedName, city, debouncedLocation, statusFilter, sortBy, orderBy],
  )

  const listQ = useQuery({
    queryKey: ['coworking-spaces', params],
    queryFn: () => getWorkspaces(params),
    staleTime: 10_000,
  })

  const citiesQ = useQuery({
    queryKey: ['cities', 'coworking-spaces'],
    /** Backend paginates `admin/cities`; without `limit` only the first page (often 10) is returned. */
    queryFn: () => getCities({ limit: 200_000 }),
    staleTime: 60_000,
  })

  /** API often returns `_id`; workspaces filter expects a real ObjectId string in `city`. */
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
    | { type: 'enable'; ws: WorkspaceListItem }
    | { type: 'disable'; ws: WorkspaceListItem }
  >(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => {
      toast.success('Workspace deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['coworking-spaces'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const statusMut = useMutation({
    mutationFn: ({ ws, next }: { ws: WorkspaceListItem; next: string }) =>
      changeWorkspaceStatus({ ...ws, status: next } as WorkspaceListItem),
    onSuccess: (_, v) => {
      toast.success(v.next === 'approve' ? 'Enabled' : 'Disabled')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['coworking-spaces'] })
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

  function sortIndicator(col: SortCol) {
    if (sortBy !== col) return '↕'
    return orderBy === '-1' ? '↓' : '↑'
  }

  function onPreview(w: WorkspaceListItem) {
    if (w.status !== 'approve') {
      toast.error('Preview is only available for enabled spaces.')
      return
    }
    const url = buildCoworkingListingPreviewUrl({ slug: w.slug, country_dbname: w.country_dbname })
    if (!url) {
      if (!(w.slug ?? '').trim()) toast.error('Missing slug.')
      else
        toast.error(
          'Set VITE_WEBSITE_URL to your public site (e.g. https://spacehaat.com) for preview. For non-India spaces, also set VITE_WEBSITE_URL_COUNTRY if needed.',
        )
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const data = listQ.data
  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as WorkspaceListItem[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <>
      <PageShell
        title="Coworking spaces"
        description="Search and manage workspace listings."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/coworking/spaces/add')}>
            Add space
          </Button>
        }
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/30 p-1 shadow-md shadow-slate-200/50 ring-1 ring-white/80">
          <div className="rounded-[0.875rem] bg-white/85 p-5 backdrop-blur-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <p className="text-xs text-slate-500">Refine the list below. Name search waits 1s after you pause typing.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setNameInput('')
                  setLocationInput('')
                  setCity('')
                  setStatusFilter('all')
                  setSortBy('')
                  setOrderBy('')
                  setPage(1)
                  setPageSize(10)
                }}
              >
                Reset all
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                <label className={filterLabelClass} htmlFor="coworking-filter-name">
                  Name
                </label>
                <Input
                  id="coworking-filter-name"
                  value={nameInput}
                  onChange={(e) => {
                    setPage(1)
                    setNameInput(e.target.value)
                  }}
                  placeholder="Search by workspace name…"
                  className="rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} id="coworking-filter-city-label" htmlFor="coworking-filter-city">
                  City
                </label>
                <SearchableCitySelect
                  id="coworking-filter-city"
                  aria-labelledby="coworking-filter-city-label"
                  cities={cityOptions}
                  value={city}
                  loading={citiesQ.isLoading}
                  onChange={(id) => {
                    setPage(1)
                    setCity(id)
                  }}
                />
              </div>
              <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                <label className={filterLabelClass} htmlFor="coworking-filter-location">
                  Micro-location
                </label>
                <Input
                  id="coworking-filter-location"
                  value={locationInput}
                  onChange={(e) => {
                    setPage(1)
                    setLocationInput(e.target.value)
                  }}
                  placeholder="Filter by micro-location…"
                  className="rounded-xl py-2.5 shadow-sm ring-slate-200/90 focus:ring-violet-500"
                />
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="coworking-filter-status">
                  Status
                </label>
                <select
                  id="coworking-filter-status"
                  className={filterSelectClass}
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1)
                    setStatusFilter(e.target.value as typeof statusFilter)
                  }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approve">Enabled</option>
                  <option value="reject">Disabled</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className={filterLabelClass} htmlFor="coworking-filter-pagesize">
                  Page size
                </label>
                <select
                  id="coworking-filter-pagesize"
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
                <span className="text-slate-500"> workspace{total !== 1 ? 's' : ''}</span>
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

        <Table className="mt-5">
          <thead className="bg-gradient-to-r from-slate-50 to-violet-50/40">
            <tr>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('name')}
                >
                  Name {sortIndicator('name')}
                </button>
              </Th>
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
                  Micro-location {sortIndicator('location')}
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
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {!listQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="py-16 text-center text-sm text-slate-500">
                  No workspaces match these filters. Try another name, city, micro-location, or status.
                </Td>
              </Tr>
            ) : null}
            {rows.map((w) => (
              <Tr key={workspaceRowId(w) || w.name}>
                <Td className="font-medium text-slate-900">{w.name ?? '—'}</Td>
                <Td>{workspaceCityLabel(w)}</Td>
                <Td className="max-w-[220px] text-sm text-slate-700">{workspaceMicroLocationLabel(w)}</Td>
                <Td className={cn('font-medium', statusClass(w.status))}>{statusLabel(w.status)}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    onClick={() => openCoworkingEditInNewTab(workspaceRowId(w))}
                  >
                    Edit
                  </Button>
                </Td>
                <Td>
                  <Button variant="ghost" onClick={() => onPreview(w)}>
                    Preview
                  </Button>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" className="text-emerald-700" onClick={() => setConfirm({ type: 'enable', ws: w })}>
                      Enable
                    </Button>
                    <Button variant="ghost" className="text-amber-700" onClick={() => setConfirm({ type: 'disable', ws: w })}>
                      Disable
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-rose-700"
                      onClick={() =>
                        setConfirm({ type: 'delete', id: workspaceRowId(w), name: w.name ?? '' })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </PageShell>

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title="Delete workspace?"
        description={confirm?.type === 'delete' ? `Remove “${confirm.name}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.type === 'delete' && delMut.mutate(confirm.id)}
      />

      <ConfirmDialog
        open={confirm?.type === 'enable'}
        title="Enable workspace?"
        description={confirm?.type === 'enable' ? `Set “${confirm.ws.name}” to ENABLED?` : undefined}
        confirmText="Enable"
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'enable' && statusMut.mutate({ ws: confirm.ws, next: 'approve' })
        }
      />

      <ConfirmDialog
        open={confirm?.type === 'disable'}
        title="Disable workspace?"
        description={confirm?.type === 'disable' ? `Set “${confirm.ws.name}” to DISABLED?` : undefined}
        confirmText="Disable"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'disable' && statusMut.mutate({ ws: confirm.ws, next: 'reject' })
        }
      />
    </>
  )
}
