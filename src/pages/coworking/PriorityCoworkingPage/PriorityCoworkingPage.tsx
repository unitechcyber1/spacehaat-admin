import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import {
  getPriorityWorkspaces,
  getWorkspaces,
  reorderPriorityWorkspaces,
  savePriorityWorkspace,
} from '../../../services/coworking/workspaces.service'
import { ArrowDownIcon, ArrowUpIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '../../../lib/ui'
import { SearchableLocalitySelect } from '../../../components/SearchableLocalitySelect'
import { SearchableCitySelect } from '../../../components/SearchableCitySelect'
import type { WorkspaceListItem } from '../../../services/coworking/types'
import { workspaceRowId } from '../../../lib/workspaceDisplay'
import { getCities } from '../../../services/locations/city.service'
import { getMicroLocationsByCity } from '../../../services/locations/microLocation.service'

type PriorityType = 'overall' | 'location' | 'micro_location'

function cityName(w: WorkspaceListItem): string {
  const c = w.location?.city
  if (c == null) return '—'
  if (typeof c === 'string') return c
  return c.name ?? '—'
}

function priorityEntry(
  w: WorkspaceListItem,
  type: PriorityType,
): { order?: number; name?: string; is_active?: boolean } | undefined {
  return (w.priority as Record<string, { order?: number; name?: string; is_active?: boolean }> | undefined)?.[type]
}

export function PriorityCoworkingPage() {
  const qc = useQueryClient()
  const [priorityType, setPriorityType] = useState<PriorityType>('overall')
  const [cityId, setCityId] = useState('')
  const [microName, setMicroName] = useState('')
  const [name, setName] = useState('')
  /** Optional locality filter for the table (overall / city scope). */
  const [tableLocality, setTableLocality] = useState('')
  /** Priority list drag and drop. */
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  const citiesQ = useQuery({
    queryKey: ['cities', 'priority-coworking'],
    queryFn: () => getCities({ dropdown: 1 }),
    staleTime: 60_000,
  })
  const cities = citiesQ.data?.data ?? []

  const microQ = useQuery({
    queryKey: ['micro-locations', 'by-city', cityId],
    queryFn: () => getMicroLocationsByCity(cityId),
    enabled: !!cityId,
    staleTime: 30_000,
  })
  const microList = useMemo(() => microQ.data?.data ?? [], [microQ.data])

  // Locality that filters the table: the scope's micro-location, or the optional table filter.
  const tableLocalityName = priorityType === 'micro_location' ? microName : tableLocality
  const tableLocalityId = useMemo(() => {
    if (!tableLocalityName) return ''
    const m = microList.find((x: { name?: string }) => x.name === tableLocalityName) as
      | { id?: string; _id?: string }
      | undefined
    return m?.id ?? m?._id ?? ''
  }, [microList, tableLocalityName])

  const listParams = useMemo(
    () => ({
      limit,
      page,
      status: 'approve',
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(cityId ? { city: cityId } : {}),
      ...(tableLocalityId ? { micro_location: tableLocalityId } : {}),
    }),
    [limit, page, name, cityId, tableLocalityId],
  )

  const listQ = useQuery({
    queryKey: ['priority-coworking-list', listParams],
    queryFn: () => getWorkspaces(listParams),
    staleTime: 10_000,
  })

  const priorityParams = useMemo(() => {
    const p: { type: string; city?: string } = { type: priorityType }
    if (priorityType === 'location' || priorityType === 'micro_location') {
      if (cityId) p.city = cityId
    }
    return p
  }, [priorityType, cityId])

  const priorityQ = useQuery({
    queryKey: ['priority-coworking-marked', priorityParams, microName],
    queryFn: () => getPriorityWorkspaces(priorityParams),
    enabled:
      priorityType === 'overall' ||
      (priorityType === 'location' && !!cityId) ||
      (priorityType === 'micro_location' && !!cityId && !!microName),
    staleTime: 10_000,
  })

  // Only approved spaces (the only ones the website shows). The API filters by city only, so in
  // micro-location scope keep just the chosen micro-location's list.
  const prioritySpaces = useMemo(() => {
    const all = ((priorityQ.data?.data?.prioritySpaces ?? []) as WorkspaceListItem[]).filter(
      (w) => w.status === 'approve',
    )
    const list =
      priorityType === 'micro_location'
        ? all.filter((w) => priorityEntry(w, priorityType)?.name === microName)
        : all
    return [...list].sort(
      (a, b) => (priorityEntry(a, priorityType)?.order ?? 1000) - (priorityEntry(b, priorityType)?.order ?? 1000),
    )
  }, [priorityQ.data, priorityType, microName])
  const priorityById = useMemo(() => {
    const m = new Map<string, WorkspaceListItem>()
    prioritySpaces.forEach((p) => {
      const id = workspaceRowId(p)
      if (id) m.set(id, p)
    })
    return m
  }, [prioritySpaces])

  const toggleMut = useMutation({
    mutationFn: (payload: {
      id: string
      type: string
      data: { is_active: boolean; order: number; city?: string; name?: string }
    }) => savePriorityWorkspace(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['priority-coworking-marked'] })
      qc.invalidateQueries({ queryKey: ['priority-coworking-list'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  function togglePriority(row: WorkspaceListItem) {
    const rowId = workspaceRowId(row)
    if (!rowId) {
      toast.error('Missing workspace id.')
      return
    }
    const active = priorityById.has(rowId)
    const data: { is_active: boolean; order: number; city?: string; name?: string } = active
      ? { is_active: false, order: 1000 }
      : {
          is_active: true,
          // After the current last one (orders can have gaps, so not just length + 1).
          order:
            prioritySpaces.reduce((max, p) => Math.max(max, priorityEntry(p, priorityType)?.order ?? 0), 0) + 1,
        }

    if (priorityType === 'location' || priorityType === 'micro_location') {
      data.city = cityId
    }
    if (priorityType === 'micro_location') {
      data.name = microName
    }

    toggleMut.mutate({ id: rowId, type: priorityType, data })
  }

  const reorderMut = useMutation({
    mutationFn: (items: { id: string; order: number }[]) => reorderPriorityWorkspaces(priorityType, items),
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) =>
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Could not save the order'),
    // Keep the new order on screen until the refetch lands (or snap back if saving failed).
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['priority-coworking-marked'] })
      setPendingOrder(null)
    },
  })

  /** List as shown: the order just dragged/moved (while saving), else the saved order. */
  const shownSpaces = useMemo(() => {
    if (!pendingOrder) return prioritySpaces
    const byId = new Map(prioritySpaces.map((w) => [workspaceRowId(w), w]))
    const out = pendingOrder.map((id) => byId.get(id)).filter(Boolean) as WorkspaceListItem[]
    return out.length === prioritySpaces.length ? out : prioritySpaces
  }, [pendingOrder, prioritySpaces])

  /** Swap with the neighbour (arrow buttons). */
  function move(index: number, dir: -1 | 1) {
    const to = index + dir
    if (to < 0 || to >= shownSpaces.length) return
    const next = [...shownSpaces]
    ;[next[index], next[to]] = [next[to], next[index]]
    saveOrder(next)
  }

  /** Drag and drop: take the dragged row out and put it where it was dropped. */
  function dropAt(target: number) {
    const from = dragIndex
    setDragIndex(null)
    setOverIndex(null)
    if (from == null || from === target) return
    const next = [...shownSpaces]
    const [item] = next.splice(from, 1)
    next.splice(target, 0, item)
    saveOrder(next)
  }

  /** Save positions 1..n for the whole list (also closes old gaps and ties); only changed rows are sent. */
  function saveOrder(next: WorkspaceListItem[]) {
    setPendingOrder(next.map((w) => workspaceRowId(w)))
    const changed = next
      .map((w, i) => ({ id: workspaceRowId(w), order: i + 1, was: priorityEntry(w, priorityType)?.order }))
      .filter((r) => r.id && r.order !== r.was)
      .map(({ id, order }) => ({ id, order }))
    if (changed.length) reorderMut.mutate(changed)
    else setPendingOrder(null)
  }

  const scopeReady =
    priorityType === 'overall' ||
    (priorityType === 'location' && !!cityId) ||
    (priorityType === 'micro_location' && !!cityId && !!microName)
  const scopeLabel =
    priorityType === 'overall'
      ? 'All cities'
      : priorityType === 'location'
        ? cities.find((c: { id: string; name?: string }) => c.id === cityId)?.name ?? 'City'
        : microName
  const busy = toggleMut.isPending || reorderMut.isPending

  const data = listQ.data
  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as WorkspaceListItem[]
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <PageShell
      title="Priority coworking spaces"
      description="Ordering for search and listings."
    >
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200/70">
        <div className="min-w-[200px]">
          <label className="text-xs font-semibold text-slate-700">Priority scope</label>
          <select
            className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={priorityType}
            onChange={(e) => {
              setPriorityType(e.target.value as PriorityType)
              setPage(1)
              setMicroName('')
              setTableLocality('')
            }}
          >
            <option value="overall">All (overall)</option>
            <option value="location">By city</option>
            <option value="micro_location">By micro-location</option>
          </select>
        </div>
        <div className="min-w-[220px]">
          <label id="priority-cw-city-label" className="text-xs font-semibold text-slate-700">
            City{priorityType === 'overall' ? ' (filters the table)' : ''}
          </label>
          <div className="mt-1">
            <SearchableCitySelect
              id="priority-cw-city"
              aria-labelledby="priority-cw-city-label"
              cities={cities as { id: string; name?: string }[]}
              value={cityId}
              loading={citiesQ.isLoading}
              emptyLabel={priorityType === 'overall' ? 'All cities' : 'Select city'}
              onChange={(id) => {
                setCityId(id)
                setMicroName('')
                setTableLocality('')
                setPage(1)
              }}
            />
          </div>
        </div>
        {priorityType === 'micro_location' && cityId ? (
          <div className="min-w-[240px]">
            <label className="text-xs font-semibold text-slate-700">Micro-location</label>
            <div className="mt-1">
              <SearchableLocalitySelect
                cityId={cityId}
                value={microName}
                onChange={(v) => {
                  setMicroName(v)
                  setPage(1)
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {scopeReady ? (
        <section className="mb-6 overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Priority list · {scopeLabel}{' '}
                <span className="font-normal text-slate-500">({prioritySpaces.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Shown first on the website, in this order. Drag a row to reorder, or use the arrows.
              </p>
            </div>
            {busy ? <span className="text-xs text-slate-500">Saving…</span> : null}
          </div>
          {priorityQ.isLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
          ) : prioritySpaces.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No priority spaces yet. Tick “Active” in the table below to add one.
            </p>
          ) : (
            <ol className="max-h-[420px] divide-y divide-slate-200/70 overflow-y-auto">
              {shownSpaces.map((w, i) => {
                const id = workspaceRowId(w)
                const dropMark =
                  dragIndex != null && overIndex === i && dragIndex !== i
                    ? dragIndex < i
                      ? 'shadow-[inset_0_-2px_0_0_rgb(var(--c-brand))]'
                      : 'shadow-[inset_0_2px_0_0_rgb(var(--c-brand))]'
                    : ''
                return (
                  <li
                    key={id || i}
                    draggable={!busy}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(i))
                      setDragIndex(i)
                    }}
                    onDragOver={(e) => {
                      if (dragIndex == null) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (overIndex !== i) setOverIndex(i)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      dropAt(i)
                    }}
                    onDragEnd={() => {
                      setDragIndex(null)
                      setOverIndex(null)
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 transition-colors',
                      !busy && 'cursor-grab active:cursor-grabbing',
                      dragIndex === i && 'bg-violet-50/70 opacity-60',
                      dropMark,
                    )}
                  >
                    <Bars3Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{w.name ?? '—'}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[w.location?.name, cityName(w)].filter((s) => s && s !== '—').join(', ') || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${w.name ?? 'space'} up`}
                        title="Move up"
                        disabled={busy || i === 0}
                        onClick={() => move(i, -1)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${w.name ?? 'space'} down`}
                        title="Move down"
                        disabled={busy || i === shownSpaces.length - 1}
                        onClick={() => move(i, 1)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${w.name ?? 'space'} from priority`}
                        title="Remove from priority"
                        disabled={busy || !id}
                        onClick={() => togglePriority(w)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-30"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      ) : null}

      <div className="mb-1 text-sm font-semibold text-slate-900">
        Approved spaces{cityId ? ` in ${cities.find((c: { id: string; name?: string }) => c.id === cityId)?.name ?? 'city'}` : ''}
        {tableLocalityName ? ` · ${tableLocalityName}` : ''}
        <span className="font-normal text-slate-500"> — tick “Active” to add to the priority list</span>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            value={name}
            onChange={(e) => {
              setPage(1)
              setName(e.target.value)
            }}
            placeholder={
              cityId
                ? `Search by name in ${cities.find((c: { id: string; name?: string }) => c.id === cityId)?.name ?? 'this city'}…`
                : 'Search by name…'
            }
          />
        </div>
        {cityId && priorityType !== 'micro_location' ? (
          <div className="flex w-full items-center gap-2 sm:w-[280px]">
            <SearchableLocalitySelect
              cityId={cityId}
              value={tableLocality}
              placeholder="All localities"
              onChange={(v) => {
                setTableLocality(v)
                setPage(1)
              }}
            />
            {tableLocality ? (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setTableLocality('')
                  setPage(1)
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">
          {listQ.isLoading
            ? 'Loading…'
            : `${total} approved workspaces · ${prioritySpaces.length} in priority list`}
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

      <Table className="mt-4">
        <thead className="bg-slate-50">
          <tr>
            <Th>Priority</Th>
            <Th>Name</Th>
            <Th>City</Th>
            <Th>Location</Th>
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
                    checked={priorityById.has(workspaceRowId(w))}
                    disabled={
                      toggleMut.isPending ||
                      !workspaceRowId(w) ||
                      (priorityType === 'location' && !cityId) ||
                      (priorityType === 'micro_location' && (!cityId || !microName))
                    }
                    onChange={() => togglePriority(w)}
                  />
                  Active
                </label>
              </Td>
              <Td className="font-medium text-slate-900">{w.name ?? '—'}</Td>
              <Td>{cityName(w)}</Td>
              <Td className="max-w-[220px] truncate">{w.location?.name ?? '—'}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </PageShell>
  )
}
