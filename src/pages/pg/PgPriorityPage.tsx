import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { PageShell } from '../../components/PageShell'
import { SearchableCitySelect } from '../../components/SearchableCitySelect'
import { SearchableLocalitySelect } from '../../components/SearchableLocalitySelect'
import { Table, Td, Th, Tr } from '../../components/Table'
import { cn } from '../../lib/ui'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { getCities } from '../../services/locations/city.service'
import { getPgs } from '../../services/pg/pg.service'
import {
  changePgPriorityOrder,
  dragPgPriority,
  getPriorityPgs,
  savePgPriority,
  type PgPriorityType,
} from '../../services/pg/pgPriority.service'
import { pgRowId } from './pgFormModel'
import {
  buildDragPayload,
  filterApprovedPgs,
  filterMicroLocationPriority,
  isPgApproved,
  nextPriorityOrder,
  pgCityLabel,
  pgLocalityLabel,
  pgMatchesLocality,
  pgStatusLabel,
  pgThumbnail,
  sortByPriorityOrder,
  type PgRow,
} from './pgPriorityUtils'

const TABS: { value: PgPriorityType; label: string }[] = [
  { value: 'overall', label: 'Featured' },
  { value: 'location', label: 'City' },
  { value: 'micro_location', label: 'Locality' },
]

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

export function PgPriorityPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [priorityType, setPriorityType] = useState<PgPriorityType>('overall')
  const [cityId, setCityId] = useState('')
  const [localityName, setLocalityName] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const debouncedAddSearch = useDebouncedValue(addSearch, 400)

  const [orderedList, setOrderedList] = useState<PgRow[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const citiesQ = useQuery({
    queryKey: ['cities', 'pg-priority'],
    queryFn: () => getCities({ dropdown: 1 }),
    staleTime: 60_000,
  })
  const cities = (citiesQ.data?.data ?? []) as { id: string; name?: string }[]

  const listEnabled =
    priorityType === 'overall' ||
    (priorityType === 'location' && !!cityId) ||
    (priorityType === 'micro_location' && !!cityId && !!localityName.trim())

  const priorityParams = useMemo(() => {
    const p: { type: PgPriorityType; city?: string } = { type: priorityType }
    if ((priorityType === 'location' || priorityType === 'micro_location') && cityId) {
      p.city = cityId
    }
    return p
  }, [priorityType, cityId])

  const priorityQ = useQuery({
    queryKey: ['pg-priority-list', priorityParams],
    queryFn: () => getPriorityPgs(priorityParams),
    enabled: listEnabled,
    staleTime: 10_000,
  })

  const sortedFromApi = useMemo(() => {
    let rows = filterApprovedPgs((priorityQ.data?.data ?? []) as PgRow[])
    if (priorityType === 'micro_location' && localityName.trim()) {
      rows = filterMicroLocationPriority(rows, localityName)
    }
    return sortByPriorityOrder(rows, priorityType)
  }, [priorityQ.data?.data, priorityType, localityName])

  useEffect(() => {
    setOrderedList(sortedFromApi)
  }, [sortedFromApi])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pg-priority-list'] })
    qc.invalidateQueries({ queryKey: ['pgs', 'priority-add'] })
  }

  const saveMut = useMutation({
    mutationFn: savePgPriority,
    onSuccess: () => {
      toast.success('Priority updated')
      invalidate()
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Save failed')
    },
  })

  const dragMut = useMutation({
    mutationFn: dragPgPriority,
    onSuccess: () => {
      toast.success('Order saved')
      invalidate()
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Reorder failed')
      setOrderedList(sortedFromApi)
    },
  })

  const orderMut = useMutation({
    mutationFn: changePgPriorityOrder,
    onSuccess: () => {
      toast.success('Order updated')
      invalidate()
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Reorder failed')
      setOrderedList(sortedFromApi)
    },
  })

  function buildSlotData(order: number, active: boolean) {
    const data: { is_active: boolean; order: number; city?: string; name?: string } = {
      is_active: active,
      order,
    }
    if (priorityType === 'location' || priorityType === 'micro_location') {
      data.city = cityId
    }
    if (priorityType === 'micro_location') {
      data.name = localityName.trim()
    }
    return data
  }

  function removeFromPriority(pg: PgRow) {
    const id = pgRowId(pg)
    if (!id) return
    saveMut.mutate({ id, type: priorityType, data: buildSlotData(1000, false) })
  }

  function addToPriority(pg: PgRow) {
    const id = pgRowId(pg)
    if (!id) {
      toast.error('Missing PG id')
      return
    }
    if (!isPgApproved(pg)) {
      toast.error('Only approved (enabled) PGs can be added to priority.')
      return
    }
    const order = nextPriorityOrder(orderedList, priorityType)
    saveMut.mutate(
      { id, type: priorityType, data: buildSlotData(order, true) },
      { onSuccess: () => setAddOpen(false) },
    )
  }

  function persistDragOrder(next: PgRow[]) {
    setOrderedList(next)
    dragMut.mutate(
      buildDragPayload(
        priorityType,
        next,
        cityId || undefined,
        localityName.trim() || undefined,
      ),
    )
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= orderedList.length) return
    const next = [...orderedList]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setOrderedList(next)

    const id = pgRowId(item)
    if (!id) return

    orderMut.mutate({
      type: priorityType,
      shiftedId: id,
      initialPosition: index + 1,
      finalPosition: target + 1,
    })
  }

  function onDrop(targetIndex: number) {
    if (dragIndex == null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...orderedList]
    const [item] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, item)
    setDragIndex(null)
    persistDragOrder(next)
  }

  const priorityIds = useMemo(() => new Set(orderedList.map(pgRowId).filter(Boolean)), [orderedList])

  const selectedCityName =
    cities.find((c) => String(c.id) === String(cityId))?.name?.trim() || 'selected city'

  const addModalSubtitle = useMemo(() => {
    if (priorityType === 'overall') return 'Approved PGs — site-wide featured list'
    if (priorityType === 'location') return `Approved PGs in ${selectedCityName}`
    return `Approved PGs in ${localityName}, ${selectedCityName}`
  }, [priorityType, selectedCityName, localityName])

  const addSearchParams = useMemo(
    () => ({
      limit: 50,
      page: 1,
      status: 'approve',
      ...(debouncedAddSearch.trim() ? { name: debouncedAddSearch.trim().toLowerCase() } : {}),
      ...(cityId ? { city: cityId } : {}),
      ...(priorityType === 'micro_location' && localityName.trim()
        ? { locality: localityName.trim().toLowerCase() }
        : {}),
    }),
    [debouncedAddSearch, cityId, priorityType, localityName],
  )

  const addSearchQ = useQuery({
    queryKey: ['pgs', 'priority-add', addSearchParams],
    queryFn: () => getPgs(addSearchParams),
    enabled: addOpen,
    staleTime: 5_000,
  })

  const addCandidates = filterApprovedPgs((addSearchQ.data?.data ?? []) as PgRow[])
    .filter((pg) => {
      if (priorityType === 'micro_location' && localityName.trim()) {
        return pgMatchesLocality(pg, localityName)
      }
      return true
    })
    .filter((pg) => {
      const id = pgRowId(pg)
      return id && !priorityIds.has(id)
    })

  const emptyHint =
    priorityType === 'overall'
      ? 'No featured PGs in priority yet. Click Add PG to add approved listings.'
      : priorityType === 'location'
        ? cityId
          ? 'No priority PGs for this city. Click Add PG to add approved listings.'
          : 'Select a city to view the priority list.'
        : !cityId
          ? 'Select a city, then choose a locality.'
          : !localityName.trim()
            ? 'Select a locality to view the priority list.'
            : 'No priority PGs for this locality. Click Add PG to add approved listings.'

  return (
    <PageShell
      title="PG priority"
      description="Manage priority order on the main table. Use Add PG to pick approved listings for this scope."
      actions={
        <Button
          variant="primary"
          disabled={!listEnabled || saveMut.isPending}
          onClick={() => {
            setAddSearch('')
            setAddOpen(true)
          }}
        >
          <PlusIcon className="mr-1.5 inline h-4 w-4" aria-hidden />
          Add PG
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl bg-white/60 p-2 ring-1 ring-slate-200/70">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition',
              priorityType === tab.value
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:ring-1 hover:ring-slate-200',
            )}
            onClick={() => {
              setPriorityType(tab.value)
              setLocalityName('')
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-4 rounded-2xl bg-white/60 p-4 ring-1 ring-slate-200/70">
        {(priorityType === 'location' || priorityType === 'micro_location') && (
          <div className="min-w-[220px] flex-1">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              City <span className="text-rose-600">*</span>
            </span>
            <SearchableCitySelect
              cities={cities}
              value={cityId}
              onChange={(id) => {
                setCityId(id)
                setLocalityName('')
              }}
              loading={citiesQ.isLoading}
              buttonClassName={filterSelectClass}
            />
          </div>
        )}
        {priorityType === 'micro_location' && cityId ? (
          <div className="min-w-[220px] flex-1">
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="pg-priority-locality"
            >
              Locality <span className="text-rose-600">*</span>
            </label>
            <SearchableLocalitySelect
              id="pg-priority-locality"
              cityId={cityId}
              value={localityName}
              onChange={setLocalityName}
              buttonClassName={filterSelectClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Search and pick a locality, then use Add PG to choose listings.
            </p>
          </div>
        ) : null}
      </div>

      {listEnabled ? (
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Priority list</h3>
      ) : null}

      {priorityQ.isLoading && listEnabled ? (
        <p className="text-sm text-slate-600">Loading priority PGs…</p>
      ) : priorityQ.isError ? (
        <p className="text-sm text-rose-600">Could not load priority list.</p>
      ) : !listEnabled ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
          {emptyHint}
        </p>
      ) : orderedList.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
          {emptyHint}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200/70">
          <Table className="min-w-[960px]">
            <thead className="bg-slate-50">
              <Tr>
                <Th className="w-10" />
                <Th className="w-16">Image</Th>
                <Th>Name</Th>
                <Th>PG ID</Th>
                <Th>City</Th>
                <Th>Locality</Th>
                <Th>Min rent</Th>
                <Th>Status</Th>
                <Th className="w-16">Order</Th>
                <Th className="w-40">Actions</Th>
              </Tr>
            </thead>
            <tbody>
              {orderedList.map((pg, index) => {
                const id = pgRowId(pg)
                const thumb = pgThumbnail(pg)
                const name = typeof pg.name === 'string' ? pg.name : '—'
                const pgId = typeof pg.pg_id === 'string' ? pg.pg_id : '—'
                const minRent =
                  pg.minMonthlyRent != null && pg.minMonthlyRent !== ''
                    ? String(pg.minMonthlyRent)
                    : '—'
                const status = pgStatusLabel(pg.status)
                return (
                  <Tr
                    key={id || index}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(index)}
                    className={cn(dragIndex === index && 'bg-violet-50/80')}
                  >
                    <Td className="cursor-grab text-slate-400 active:cursor-grabbing">
                      <Bars3Icon className="h-5 w-5" aria-hidden />
                    </Td>
                    <Td>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-10 w-14 rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="max-w-[160px] font-medium text-slate-900">
                      <span className="line-clamp-2" title={name}>
                        {name}
                      </span>
                    </Td>
                    <Td className="text-sm text-slate-600">{pgId}</Td>
                    <Td className="text-sm">{pgCityLabel(pg)}</Td>
                    <Td className="max-w-[120px] truncate text-sm" title={pgLocalityLabel(pg)}>
                      {pgLocalityLabel(pg)}
                    </Td>
                    <Td className="text-sm">{minRent}</Td>
                    <Td className="text-sm">{status}</Td>
                    <Td className="text-sm font-medium text-slate-800">{index + 1}</Td>
                    <Td>
                      <div className="flex flex-nowrap items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          disabled={index === 0 || orderMut.isPending || dragMut.isPending}
                          aria-label="Move up"
                          onClick={() => moveRow(index, -1)}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          disabled={
                            index === orderedList.length - 1 || orderMut.isPending || dragMut.isPending
                          }
                          aria-label="Move down"
                          onClick={() => moveRow(index, 1)}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          disabled={saveMut.isPending}
                          aria-label="Remove from priority"
                          onClick={() => removeFromPriority(pg)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        {id ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => navigate(`/layout/pg/${id}/edit`)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      {listEnabled && orderedList.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          Drag rows to reorder, or use arrows. Lower order number = higher on site (1 = top).
        </p>
      ) : null}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add PG to priority list"
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{addModalSubtitle}</p>
          <Input
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
            placeholder="Search by name…"
            className="rounded-xl"
          />
          {priorityType !== 'overall' && !cityId ? (
            <p className="text-sm text-amber-700">Select a city before adding PGs.</p>
          ) : null}
          {priorityType === 'micro_location' && cityId && !localityName.trim() ? (
            <p className="text-sm text-amber-700">Select a locality before adding PGs.</p>
          ) : null}
          {addSearchQ.isLoading ? (
            <p className="text-sm text-slate-500">Loading approved PGs…</p>
          ) : addSearchQ.isError ? (
            <p className="text-sm text-rose-600">Could not load PGs.</p>
          ) : addCandidates.length === 0 ? (
            <p className="text-sm text-slate-500">
              No approved PGs available to add
              {debouncedAddSearch.trim() ? ' for this search' : ''}. They may already be in the priority list.
            </p>
          ) : (
            <div className="max-h-80 overflow-auto rounded-xl ring-1 ring-slate-200/80">
              <Table className="min-w-[520px]">
                <thead className="bg-slate-50">
                  <Tr>
                    <Th>Name</Th>
                    <Th>PG ID</Th>
                    {priorityType === 'micro_location' ? <Th>Locality</Th> : null}
                    <Th className="w-24" />
                  </Tr>
                </thead>
                <tbody>
                  {addCandidates.map((pg) => {
                    const id = pgRowId(pg)
                    const name = typeof pg.name === 'string' ? pg.name : '—'
                    return (
                      <Tr key={id || name}>
                        <Td className="font-medium text-slate-900">{name}</Td>
                        <Td className="text-sm text-slate-600">
                          {typeof pg.pg_id === 'string' ? pg.pg_id : '—'}
                        </Td>
                        {priorityType === 'micro_location' ? (
                          <Td className="text-sm">{pgLocalityLabel(pg)}</Td>
                        ) : null}
                        <Td>
                          <Button
                            type="button"
                            variant="primary"
                            className="!px-2 !py-1 text-xs"
                            disabled={
                              !id ||
                              saveMut.isPending ||
                              (priorityType !== 'overall' && !cityId) ||
                              (priorityType === 'micro_location' && !localityName.trim())
                            }
                            onClick={() => addToPriority(pg)}
                          >
                            Add
                          </Button>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </Modal>
    </PageShell>
  )
}
