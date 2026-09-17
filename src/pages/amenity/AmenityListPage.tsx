import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { IconAction } from '../../components/IconAction'
import { Input } from '../../components/Input'
import { ListFilterCard } from '../../components/ListFilterCard'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { BoolBadge } from '../../components/StatusBadge'
import { Table, Td, Th, Tr } from '../../components/Table'
import { filterLabelClass, resolveListTotal, sortIndicator } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { deleteAmenity, getAmenities } from '../../services/amenity/amenity.service'
import type { AmenityRecord } from '../../services/amenity/types'

function amenityRowId(a: AmenityRecord): string {
  return String(a.id ?? a._id ?? '')
}

export function AmenityListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [nameInput, setNameInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 500)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('')
  const [orderBy, setOrderBy] = useState<'1' | '-1' | ''>('')

  const params = useMemo(
    () => ({
      limit: pageSize,
      page,
      ...(debouncedName.trim() ? { name: debouncedName.trim().toLowerCase() } : {}),
      ...(sortBy ? { sortBy, orderBy: orderBy || '1' } : {}),
    }),
    [pageSize, page, debouncedName, sortBy, orderBy],
  )

  const listQ = useQuery({
    queryKey: ['amenities', params],
    queryFn: () => getAmenities(params),
    staleTime: 10_000,
  })

  const [confirm, setConfirm] = useState<AmenityRecord | null>(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAmenity(id),
    onSuccess: () => {
      toast.success('Amenity deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['amenities'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const rows = (listQ.data?.data ?? []) as AmenityRecord[]
  const total = resolveListTotal(listQ.data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function toggleSort(col: string) {
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

  return (
    <>
      <PageShell
        title="Amenities"
        description="Manage amenities for coworking, office, coliving, and flatspace listings."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/amenty/add')}>
            Add amenity
          </Button>
        }
      >
        <ListFilterCard
          description="Search by amenity name."
          onReset={() => { setNameInput(''); setPage(1); setSortBy(''); setOrderBy(''); setPageSize(10) }}
        >
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="amenity-search">Search name</label>
            <Input
              id="amenity-search"
              value={nameInput}
              onChange={(e) => { setPage(1); setNameInput(e.target.value) }}
              placeholder="Search by name…"
            />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={listQ.isLoading}
          total={total}
          noun="amenity"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[22%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('name')}>
                  Name {sortIndicator(sortBy === 'name', orderBy)}
                </button>
              </Th>
              <Th className="w-[16%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('category')}>
                  Category {sortIndicator(sortBy === 'category', orderBy)}
                </button>
              </Th>
              <Th className="w-[10%] text-center">Coworking</Th>
              <Th className="w-[10%] text-center">Office</Th>
              <Th className="w-[10%] text-center">Coliving</Th>
              <Th className="w-[10%] text-center">Flat</Th>
              <Th className="w-[12%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr><Td colSpan={7} className="list-empty">Loading…</Td></Tr>
            ) : rows.length === 0 ? (
              <Tr><Td colSpan={7} className="list-empty"><strong>No amenities</strong>Add one with “Add amenity”.</Td></Tr>
            ) : (
              rows.map((row) => {
                const id = amenityRowId(row)
                return (
                  <Tr key={id || row.name}>
                    <Td className="align-middle font-medium text-ink">{row.name ?? '—'}</Td>
                    <Td className="align-middle text-sm capitalize text-muted">{row.category || '—'}</Td>
                    <Td className="align-middle text-center"><BoolBadge value={row.for_coWorking} trueLabel="Yes" falseLabel="No" /></Td>
                    <Td className="align-middle text-center"><BoolBadge value={row.for_office} trueLabel="Yes" falseLabel="No" /></Td>
                    <Td className="align-middle text-center"><BoolBadge value={row.for_coLiving} trueLabel="Yes" falseLabel="No" /></Td>
                    <Td className="align-middle text-center"><BoolBadge value={row.for_flatspace} trueLabel="Yes" falseLabel="No" /></Td>
                    <Td className="align-middle">
                      <div className="table-actions">
                        <IconAction label="Edit" disabled={!id} onClick={() => navigate(`/layout/amenty/detail/${id}`)}>
                          <PencilSquareIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                        <IconAction label="Delete" tone="rose" onClick={() => setConfirm(row)}>
                          <TrashIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
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
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          loading={listQ.isLoading}
          className="border-0 bg-transparent px-0 shadow-none ring-0"
        />
      </PageShell>

      <ConfirmDialog
        open={!!confirm}
        title="Delete amenity?"
        description={confirm ? `Remove “${confirm.name ?? 'this item'}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => { const id = confirm ? amenityRowId(confirm) : ''; if (id) delMut.mutate(id) }}
      />
    </>
  )
}
