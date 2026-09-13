import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon, Bars3Icon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { ListPagination } from '../../../components/ListPagination'
import { PageShell } from '../../../components/PageShell'
import { SearchableCitySelect } from '../../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { cn } from '../../../lib/ui'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import { getCitiesBySpaceType } from '../../../services/locations/city.service'
import {
  dragMicrolocationPriority,
  getMicroLocationsByCityAndSpaceType,
  getPriorityMicrolocations,
  saveMicrolocationPriority,
  type MicroLocationPriorityRow,
  type MicroLocationSpaceType,
} from '../../../services/locations/microLocation.service'
import {
  applySelectedFlags,
  buildMicrolocationDragPayload,
  microLocationCityName,
  microLocationRowId,
  resolveListTotal,
  sortBySpaceTypeOrder,
  PRIORITY_SCOPE_OPTIONS,
  SPACE_TYPE_OPTIONS,
  spaceTypeQueryParams,
  type MicroLocationPriorityScope,
} from './microLocationPriorityUtils'

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

function apiErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'object' && e !== null) {
    const apiMessage = (e as { response?: { data?: { message?: unknown } } }).response?.data
      ?.message
    if (typeof apiMessage === 'string' && apiMessage) return apiMessage
    const message = (e as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function MicroLocationPriorityPage() {
  const qc = useQueryClient()

  const [spaceType, setSpaceType] = useState<MicroLocationSpaceType | ''>('')
  const [priorityType, setPriorityType] = useState<MicroLocationPriorityScope | ''>('')
  const [cityId, setCityId] = useState('')
  const [nameIn, setNameIn] = useState('')
  const debouncedName = useDebouncedValue(nameIn, 800)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [orderedList, setOrderedList] = useState<MicroLocationPriorityRow[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const cityFilterParams = useMemo(
    () => (spaceType && priorityType ? spaceTypeQueryParams(spaceType) : null),
    [spaceType, priorityType],
  )

  const citiesQ = useQuery({
    queryKey: ['cities', 'micro-location-priority', cityFilterParams],
    queryFn: () => getCitiesBySpaceType(cityFilterParams!),
    enabled: Boolean(cityFilterParams),
    staleTime: 60_000,
  })
  const cities = (citiesQ.data?.data ?? []) as { id: string; name?: string }[]

  const listParams = useMemo(() => {
    if (!spaceType || !cityId) return null
    return {
      limit: pageSize,
      page,
      sortBy: '',
      orderBy: '',
      name: debouncedName.trim().toLowerCase(),
      cityId,
      is_admin: true,
      ...spaceTypeQueryParams(spaceType),
    }
  }, [spaceType, cityId, pageSize, page, debouncedName])

  const listQ = useQuery({
    queryKey: ['micro-location-priority-list', listParams],
    queryFn: () => getMicroLocationsByCityAndSpaceType(listParams!),
    enabled: Boolean(listParams),
    staleTime: 10_000,
  })

  const priorityQ = useQuery({
    queryKey: ['micro-location-priority-marked', spaceType, cityId],
    queryFn: () =>
      getPriorityMicrolocations({
        type: spaceType as string,
        city: cityId,
      }),
    enabled: Boolean(spaceType && cityId),
    staleTime: 10_000,
  })

  const sortedFromApi = useMemo(() => {
    const rows = (priorityQ.data?.data?.prioritySpaces ?? []) as MicroLocationPriorityRow[]
    if (!spaceType) return rows
    return sortBySpaceTypeOrder(rows, spaceType)
  }, [priorityQ.data?.data?.prioritySpaces, spaceType])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['micro-location-priority-list'] })
    qc.invalidateQueries({ queryKey: ['micro-location-priority-marked'] })
  }

  const saveMut = useMutation({
    mutationFn: saveMicrolocationPriority,
    onSuccess: () => {
      toast.success('Priority updated')
      invalidate()
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Save failed')),
  })

  const dragMut = useMutation({
    mutationFn: dragMicrolocationPriority,
    onSuccess: () => {
      toast.success('Order saved')
      invalidate()
    },
    onError: (e) => {
      toast.error(apiErrorMessage(e, 'Reorder failed'))
      setOrderedList(sortedFromApi)
    },
  })

  useEffect(() => {
    if (dragMut.isPending || priorityQ.isFetching) return
    setOrderedList(sortedFromApi)
  }, [sortedFromApi, dragMut.isPending, priorityQ.isFetching])

  const priorityById = useMemo(() => {
    const m = new Map<string, MicroLocationPriorityRow>()
    orderedList.forEach((row) => {
      const id = microLocationRowId(row)
      if (id) m.set(id, row)
    })
    return m
  }, [orderedList])

  const tableRows = useMemo(() => {
    const rows = (listQ.data?.data ?? []) as MicroLocationPriorityRow[]
    return applySelectedFlags(rows, orderedList)
  }, [listQ.data?.data, orderedList])

  const total = resolveListTotal(listQ.data, tableRows.length)
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)
  const listEnabled = Boolean(spaceType && priorityType && cityId)

  function resetFilters() {
    setSpaceType('')
    setPriorityType('')
    setCityId('')
    setNameIn('')
    setPage(1)
    setOrderedList([])
  }

  function toggleRow(row: MicroLocationPriorityRow) {
    if (!spaceType || !cityId) return
    const id = microLocationRowId(row)
    if (!id) {
      toast.error('Missing micro-location id')
      return
    }
    const active = priorityById.has(id)
    saveMut.mutate({
      id,
      type: spaceType,
      data: active
        ? { is_active: false, order: 1000, city: cityId }
        : { is_active: true, order: orderedList.length + 1, city: cityId },
    })
  }

  function persistDragOrder(next: MicroLocationPriorityRow[]) {
    if (!spaceType) return
    const payload = buildMicrolocationDragPayload(spaceType, next, cityId || undefined)
    setOrderedList(payload.updatedLocations)
    dragMut.mutate(payload)
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

  return (
    <PageShell
      title="Priority micro-locations"
      description="Pick micro-locations per city and space type, then drag to set homepage order."
    >
      <div className="card mb-4 flex flex-wrap items-end gap-4 p-4">
        <label className="leads-filter-field !max-w-[220px]">
          <span>Space type</span>
          <select
            className="inp"
            value={spaceType}
            onChange={(e) => {
              const next = e.target.value as MicroLocationSpaceType | ''
              setSpaceType(next)
              setPriorityType('')
              setCityId('')
              setPage(1)
              setNameIn('')
            }}
          >
            <option value="">Select space type…</option>
            {SPACE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {spaceType ? (
          <label className="leads-filter-field !max-w-[220px]">
            <span>Priority scope</span>
            <select
              className="inp"
              value={priorityType}
              onChange={(e) => {
                const next = e.target.value as MicroLocationPriorityScope | ''
                setPriorityType(next)
                setCityId('')
                setPage(1)
                setNameIn('')
              }}
            >
              <option value="">Select priority scope…</option>
              {PRIORITY_SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {priorityType ? (
          <div className="leads-filter-field !max-w-[260px]">
            <span>City</span>
            <SearchableCitySelect
              cities={cities}
              value={cityId}
              onChange={(id) => {
                setCityId(id)
                setPage(1)
              }}
              loading={citiesQ.isLoading}
              buttonClassName={filterSelectClass}
            />
          </div>
        ) : null}

        <div className="leads-filter-actions">
          <Button size="sm" onClick={resetFilters}>
            <ArrowPathIcon />
            Reset filters
          </Button>
        </div>
      </div>

      {!listEnabled ? (
        <div className="card leads-empty">
          <div className="leads-empty-inner">
            <strong>Select filters to begin</strong>
            <p>
              Choose a space type, select priority scope (City), then pick a city to load
              micro-locations and manage priority.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="card overflow-hidden lg:col-span-7">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Micro-location table</h2>
              <p className="mt-1 text-xs text-muted">Check rows to add or remove from priority.</p>
            </div>

            <div className="border-b border-line px-4 py-3">
              <Input
                value={nameIn}
                onChange={(e) => {
                  setNameIn(e.target.value)
                  setPage(1)
                }}
                placeholder="Search name…"
              />
            </div>

            <div className="tbl-wrap">
              <Table>
                <thead>
                  <Tr>
                    <Th className="w-12">Select</Th>
                    <Th>Name</Th>
                    <Th>City</Th>
                  </Tr>
                </thead>
                <tbody>
                  {listQ.isLoading ? (
                    <Tr>
                      <Td colSpan={3} className="leads-loading">
                        Loading micro-locations…
                      </Td>
                    </Tr>
                  ) : listQ.isError ? (
                    <Tr>
                      <Td colSpan={3} className="text-center text-expired">
                        Failed to load micro-locations.
                      </Td>
                    </Tr>
                  ) : !tableRows.length ? (
                    <Tr>
                      <Td colSpan={3} className="leads-empty">
                        No micro-locations match these filters.
                      </Td>
                    </Tr>
                  ) : (
                    tableRows.map((row) => {
                      const id = microLocationRowId(row)
                      return (
                        <Tr key={id}>
                          <Td>
                            <input
                              type="checkbox"
                              checked={Boolean(row.isSelected)}
                              disabled={saveMut.isPending}
                              onChange={() => toggleRow(row)}
                              aria-label={`Toggle priority for ${row.name}`}
                            />
                          </Td>
                          <Td className="font-medium text-ink">{row.name ?? '—'}</Td>
                          <Td className="text-muted">{microLocationCityName(row)}</Td>
                        </Tr>
                      )
                    })
                  )}
                </tbody>
              </Table>
            </div>

            <ListPagination
              currentPage={Math.min(page, pageCount)}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 25, 100]}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
              loading={listQ.isLoading}
            />
          </div>

          <div className="card overflow-hidden lg:col-span-5">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Priority order</h2>
              <p className="mt-1 text-xs text-muted">Drag to reorder featured micro-locations.</p>
            </div>

            {priorityQ.isLoading ? (
              <p className="leads-loading">Loading priority list…</p>
            ) : priorityQ.isError ? (
              <p className="leads-loading text-expired">Could not load priority list.</p>
            ) : !orderedList.length ? (
              <div className="leads-empty">
                <div className="leads-empty-inner">
                  <strong>No priority micro-locations</strong>
                  <p>Select rows in the table to add locations to this list.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-line">
                <div className="grid grid-cols-[28px_1fr_1fr] gap-2 bg-surface-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-faint">
                  <span />
                  <span>Name</span>
                  <span>City</span>
                </div>
                {orderedList.map((row, index) => {
                  const id = microLocationRowId(row)
                  return (
                    <div
                      key={id || index}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(index)}
                      className={cn(
                        'grid cursor-grab grid-cols-[28px_1fr_1fr] gap-2 px-4 py-3 active:cursor-grabbing',
                        dragIndex === index && 'bg-brand/5',
                      )}
                    >
                      <Bars3Icon className="h-5 w-5 text-faint" aria-hidden />
                      <span className="text-sm font-medium text-ink">{row.name ?? '—'}</span>
                      <span className="text-sm text-muted">{microLocationCityName(row)}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {orderedList.length ? (
              <p className="border-t border-line px-4 py-3 text-xs text-muted">
                Order 1 appears first on the site. Changes save when you drop a row.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  )
}
