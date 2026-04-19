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
  savePriorityWorkspace,
} from '../../../services/coworking/workspaces.service'
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

export function PriorityCoworkingPage() {
  const qc = useQueryClient()
  const [priorityType, setPriorityType] = useState<PriorityType>('overall')
  const [cityId, setCityId] = useState('')
  const [microName, setMicroName] = useState('')
  const [name, setName] = useState('')
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
    enabled: !!cityId && priorityType === 'micro_location',
    staleTime: 30_000,
  })
  const microList = microQ.data?.data ?? []

  const listParams = useMemo(
    () => ({
      limit,
      page,
      status: 'approve',
      ...(name.trim() ? { name: name.trim().toLowerCase() } : {}),
      ...(cityId ? { city: cityId } : {}),
      ...(priorityType === 'micro_location' && microName
        ? { micro_location: microName }
        : {}),
    }),
    [limit, page, name, cityId, priorityType, microName],
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

  const prioritySpaces = (priorityQ.data?.data?.prioritySpaces ?? []) as WorkspaceListItem[]
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
      : { is_active: true, order: prioritySpaces.length + 1 }

    if (priorityType === 'location' || priorityType === 'micro_location') {
      data.city = cityId
    }
    if (priorityType === 'micro_location') {
      data.name = microName
    }

    toggleMut.mutate({ id: rowId, type: priorityType, data })
  }

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
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl bg-white/60 p-4 ring-1 ring-slate-200/70">
        <div className="min-w-[200px]">
          <label className="text-xs font-semibold text-slate-700">Priority scope</label>
          <select
            className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={priorityType}
            onChange={(e) => {
              setPriorityType(e.target.value as PriorityType)
              setPage(1)
              setMicroName('')
            }}
          >
            <option value="overall">All (overall)</option>
            <option value="location">By city</option>
            <option value="micro_location">By micro-location</option>
          </select>
        </div>
        {(priorityType === 'location' || priorityType === 'micro_location') && (
          <div className="min-w-[200px]">
            <label className="text-xs font-semibold text-slate-700">City</label>
            <select
              className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value)
                setMicroName('')
                setPage(1)
              }}
            >
              <option value="">Select city</option>
              {cities.map((c: { id: string; name?: string }) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {priorityType === 'micro_location' && cityId ? (
          <div className="min-w-[200px]">
            <label className="text-xs font-semibold text-slate-700">Micro-location</label>
            <select
              className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={microName}
              onChange={(e) => {
                setMicroName(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Select…</option>
              {microList.map((m: { name?: string }) => (
                <option key={m.name ?? ''} value={m.name ?? ''}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="mb-4">
        <Input
          value={name}
          onChange={(e) => {
            setPage(1)
            setName(e.target.value)
          }}
          placeholder="Filter list by name…"
        />
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
