import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { PageShell } from '../../../components/PageShell'
import { SearchableCitySelect } from '../../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { cn } from '../../../lib/ui'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import { workspaceCityLabel, workspaceRowId } from '../../../lib/workspaceDisplay'
import {
  changePopularSpacesOrder,
  getPopularWorkspaces,
  getWorkspaces,
  savePopularWorkspace,
} from '../../../services/coworking/workspaces.service'
import type { WorkspaceListItem } from '../../../services/coworking/types'
import { getCities } from '../../../services/locations/city.service'

function moveItemInArray<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function PopularDraggableList({
  items,
  disabled,
  onReorder,
  onRemove,
}: {
  items: WorkspaceListItem[]
  disabled?: boolean
  onReorder: (previousIndex: number, currentIndex: number) => void
  onRemove: (row: WorkspaceListItem) => void
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-500">
        No popular spaces yet. Use the checkboxes in the table to add some.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="hidden rounded-lg bg-slate-50/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-12 sm:gap-2">
        <span className="sm:col-span-1" />
        <span className="sm:col-span-7">Name</span>
        <span className="sm:col-span-4">City</span>
      </div>
      {items.map((row, index) => (
        <div
          key={workspaceRowId(row)}
          draggable={!disabled}
          onDragStart={() => setDragIdx(index)}
          onDragEnd={() => setDragIdx(null)}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragIdx === null || dragIdx === index) return
            onReorder(dragIdx, index)
            setDragIdx(null)
          }}
          className={cn(
            'grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm transition sm:grid-cols-12 sm:items-center sm:gap-2',
            dragIdx === index && 'opacity-60 ring-2 ring-violet-300',
            !disabled && 'cursor-grab active:cursor-grabbing',
          )}
        >
          <div className="flex items-center gap-2 sm:col-span-1">
            <Bars3Icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            <button
              type="button"
              className="rounded-lg px-1.5 text-lg leading-none text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Remove from popular"
              onClick={() => onRemove(row)}
            >
              ×
            </button>
          </div>
          <div className="min-w-0 text-sm font-medium text-slate-900 sm:col-span-7">{row.name ?? '—'}</div>
          <div className="text-sm text-slate-700 sm:col-span-4">{workspaceCityLabel(row)}</div>
        </div>
      ))}
    </div>
  )
}

export function TopCoworkingCitiesPage() {
  const qc = useQueryClient()
  const [nameInput, setNameInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 1000)
  const debouncedLocation = useDebouncedValue(locationInput, 500)
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const [optimisticPopular, setOptimisticPopular] = useState<WorkspaceListItem[] | null>(null)

  const popularQ = useQuery({
    queryKey: ['popular-workspaces'],
    queryFn: getPopularWorkspaces,
    staleTime: 15_000,
  })

  const params = useMemo(
    () => ({
      limit,
      page,
      ...(debouncedName.trim() ? { name: debouncedName.trim().toLowerCase() } : {}),
      ...(city ? { city } : {}),
      ...(debouncedLocation.trim() ? { location: debouncedLocation.trim().toLowerCase() } : {}),
    }),
    [limit, page, debouncedName, city, debouncedLocation],
  )

  const listQ = useQuery({
    queryKey: ['coworking-top-cities', params],
    queryFn: () => getWorkspaces(params),
    staleTime: 10_000,
  })

  const popularSpaces = useMemo(
    () => (popularQ.data?.data?.popularSpaces ?? []) as WorkspaceListItem[],
    [popularQ.data?.data?.popularSpaces],
  )

  const serverSortedPopular = useMemo(
    () =>
      [...popularSpaces].sort(
        (a, b) => (a.is_popular?.order ?? 999) - (b.is_popular?.order ?? 999),
      ),
    [popularSpaces],
  )

  useEffect(() => {
    setOptimisticPopular(null)
  }, [popularSpaces])

  const displayPopular = optimisticPopular ?? serverSortedPopular

  const popularById = useMemo(() => {
    const m = new Map<string, WorkspaceListItem>()
    popularSpaces.forEach((p) => {
      const id = workspaceRowId(p)
      if (id) m.set(id, p)
    })
    return m
  }, [popularSpaces])

  const citiesQ = useQuery({
    queryKey: ['cities', 'top-coworking-cities'],
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
      out.push({ id: sid, name: String(c.name ?? c.city_name ?? '') })
    }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return out
  }, [citiesQ.data?.data])

  const toggleMut = useMutation({
    mutationFn: (payload: { id: string; is_popular: { value: boolean; order: number } }) =>
      savePopularWorkspace(payload),
    onSuccess: () => {
      toast.success('Updated')
      qc.invalidateQueries({ queryKey: ['popular-workspaces'] })
      qc.invalidateQueries({ queryKey: ['coworking-top-cities'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const orderMut = useMutation({
    mutationFn: changePopularSpacesOrder,
    onSuccess: () => {
      toast.success('Order saved')
      qc.invalidateQueries({ queryKey: ['popular-workspaces'] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Reorder failed')
      setOptimisticPopular(null)
    },
  })

  function togglePopular(row: WorkspaceListItem) {
    const rowId = workspaceRowId(row)
    if (!rowId) {
      toast.error('Missing workspace id; cannot update popular flag.')
      return
    }
    const inList = popularById.has(rowId)
    let is_popular: { value: boolean; order: number }
    if (inList) {
      is_popular = { value: false, order: 0 }
    } else {
      is_popular = { value: true, order: popularSpaces.length + 1 }
    }
    toggleMut.mutate({ id: rowId, is_popular })
  }

  function handlePopularReorder(previousIndex: number, currentIndex: number) {
    const base = optimisticPopular ?? serverSortedPopular
    const reordered = moveItemInArray(base, previousIndex, currentIndex).map((item, i) => ({
      ...item,
      is_popular: { value: true as const, order: i + 1 },
    }))
    setOptimisticPopular(reordered)
    const shiftedRow = reordered[currentIndex]
    const shiftedId = workspaceRowId(shiftedRow)
    if (!shiftedId) {
      toast.error('Missing workspace id; cannot reorder.')
      setOptimisticPopular(null)
      return
    }
    orderMut.mutate({
      initialPosition: previousIndex + 1,
      finalPosition: currentIndex + 1,
      shiftedId,
    })
  }

  function removeFromPopular(row: WorkspaceListItem) {
    const rowId = workspaceRowId(row)
    if (!rowId) {
      toast.error('Missing workspace id.')
      return
    }
    toggleMut.mutate({ id: rowId, is_popular: { value: false, order: 0 } })
  }

  const data = listQ.data
  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as WorkspaceListItem[]
  const canPrev = page > 1
  const canNext = page * limit < total

  const filterLabel = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <PageShell
      title="Top coworking cities"
      description="Pick popular workspaces for city pages. Drag the list on the right to set display order."
    >
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7 xl:col-span-8">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/50 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 sm:col-span-2">
                <label className={filterLabel} htmlFor="top-cc-name">
                  Name
                </label>
                <Input
                  id="top-cc-name"
                  value={nameInput}
                  onChange={(e) => {
                    setPage(1)
                    setNameInput(e.target.value)
                  }}
                  placeholder="Search name…"
                  className="rounded-xl"
                />
                <p className="mt-1 text-xs text-slate-500">Waits 1s after you stop typing.</p>
              </div>
              <div className="min-w-0">
                <label className={filterLabel} id="top-cc-city-label" htmlFor="top-cc-city">
                  City
                </label>
                <SearchableCitySelect
                  id="top-cc-city"
                  aria-labelledby="top-cc-city-label"
                  cities={cityOptions}
                  value={city}
                  loading={citiesQ.isLoading}
                  onChange={(id) => {
                    setPage(1)
                    setCity(id)
                  }}
                />
              </div>
              <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                <label className={filterLabel} htmlFor="top-cc-loc">
                  Micro-location
                </label>
                <Input
                  id="top-cc-loc"
                  value={locationInput}
                  onChange={(e) => {
                    setPage(1)
                    setLocationInput(e.target.value)
                  }}
                  placeholder="Filter micro-location…"
                  className="rounded-xl"
                />
                <p className="mt-1 text-xs text-slate-500">Debounced 500ms.</p>
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setNameInput('')
                    setLocationInput('')
                    setCity('')
                    setPage(1)
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              {listQ.isLoading ? 'Loading…' : `${total} workspaces`}
              {listQ.isError ? (
                <span className="ml-2 text-rose-600">{(listQ.error as Error)?.message ?? 'Failed to load'}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <div className="text-sm text-slate-600">
                Page <span className="font-medium text-slate-900">{page}</span>
              </div>
              <Button variant="secondary" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>

          <Table>
            <thead className="bg-slate-50">
              <tr>
                <Th>Popular</Th>
                <Th>Name</Th>
                <Th>City</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <Tr key={workspaceRowId(w) || w.name}>
                  <Td>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        checked={popularById.has(workspaceRowId(w))}
                        disabled={toggleMut.isPending || !workspaceRowId(w)}
                        onChange={() => togglePopular(w)}
                      />
                      Top
                    </label>
                  </Td>
                  <Td className="font-medium text-slate-900">{w.name ?? '—'}</Td>
                  <Td>{workspaceCityLabel(w)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>

        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-4 space-y-3 rounded-2xl border border-violet-200/60 bg-gradient-to-b from-violet-50/50 to-white/90 p-4 shadow-md ring-1 ring-violet-100/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Popular coworking</h2>
              <p className="mt-1 text-xs text-slate-600">
                Drag rows to reorder. Order is saved to the server ({displayPopular.length} in list).
              </p>
            </div>
            <PopularDraggableList
              items={displayPopular}
              disabled={orderMut.isPending || popularQ.isLoading}
              onReorder={handlePopularReorder}
              onRemove={removeFromPopular}
            />
          </div>
        </aside>
      </div>
    </PageShell>
  )
}
