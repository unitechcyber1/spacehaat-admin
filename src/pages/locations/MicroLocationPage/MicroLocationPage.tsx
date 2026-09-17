import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { IconAction } from '../../../components/IconAction'
import { Input } from '../../../components/Input'
import { ListFilterCard } from '../../../components/ListFilterCard'
import { ListPageMeta } from '../../../components/ListPageMeta'
import { ListPagination } from '../../../components/ListPagination'
import { Modal } from '../../../components/Modal'
import { PageShell } from '../../../components/PageShell'
import { BoolBadge } from '../../../components/StatusBadge'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { filterLabelClass, resolveListTotal } from '../../../lib/listPageUi'
import { getCities } from '../../../services/locations/city.service'
import { getMicroLocations, removeMicroLocation, saveMicroLocation } from '../../../services/locations/microLocation.service'
import type { City, MicroLocation } from '../../../services/locations/types'

export function MicroLocationPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [cityId, setCityId] = useState('')
  const [pageSize, setPageSize] = useState(10)

  const params = useMemo(
    () => ({ limit: pageSize, page, name: q.trim().toLowerCase(), city: cityId }),
    [pageSize, page, q, cityId],
  )

  const microQ = useQuery({
    queryKey: ['microLocations', params],
    queryFn: () => getMicroLocations(params),
    staleTime: 10_000,
  })

  const citiesQ = useQuery({
    queryKey: ['cities', 'all'],
    queryFn: () => getCities({ limit: 200000 }),
    staleTime: 60_000,
  })
  const cities = (citiesQ.data?.data ?? []) as City[]

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)

  const saveMut = useMutation({
    mutationFn: (payload: any) => saveMicroLocation(payload),
    onSuccess: () => {
      toast.success('Micro-location saved')
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['microLocations'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save micro-location'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => removeMicroLocation(id),
    onSuccess: () => {
      toast.success('Micro-location deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['microLocations'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete micro-location'),
  })

  const rows = (microQ.data?.data ?? []) as MicroLocation[]
  const total = resolveListTotal(microQ.data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageShell
        title="Micro-locations"
        description="Neighborhood-level locations under cities."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing({
                name: '',
                city: '',
                latitude: '',
                longitude: '',
                for_coWorking: false,
                for_office: false,
                for_coLiving: false,
                for_flatspace: false,
                for_buildings: false,
                locationImage: {},
              })
              setOpen(true)
            }}
          >
            Add micro-location
          </Button>
        }
      >
        <ListFilterCard
          description="Search micro-locations by name or filter by city."
          onReset={() => { setQ(''); setCityId(''); setPage(1); setPageSize(10) }}
        >
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="micro-location-search">Name</label>
            <Input
              id="micro-location-search"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value) }}
              placeholder="Search by name…"
            />
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="micro-location-city">City</label>
            <select
              id="micro-location-city"
              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={cityId}
              onChange={(e) => { setPage(1); setCityId(e.target.value) }}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={microQ.isLoading}
          total={total}
          noun="micro-location"
          error={microQ.isError ? (microQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th>Name</Th>
              <Th>City</Th>
              <Th>Coworking</Th>
              <Th>Office</Th>
              <Th>Coliving</Th>
              <Th>Flat</Th>
              <Th>Buildings</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <Tr key={m.id}>
                <Td className="font-medium text-slate-900">{m.name}</Td>
                <Td>{(m as any)?.city?.name ?? '-'}</Td>
                <Td className="text-center"><BoolBadge value={(m as any).for_coWorking} /></Td>
                <Td className="text-center"><BoolBadge value={(m as any).for_office} /></Td>
                <Td className="text-center"><BoolBadge value={(m as any).for_coLiving} /></Td>
                <Td className="text-center"><BoolBadge value={(m as any).for_flatspace} /></Td>
                <Td className="text-center"><BoolBadge value={(m as any).for_buildings} /></Td>
                <Td>
                  <div className="table-actions">
                    <IconAction
                      label="Edit"
                      onClick={() => {
                        setEditing({
                          id: m.id,
                          name: m.name,
                          city: (m as any)?.city?._id ?? (m as any)?.city?.id ?? '',
                          latitude: (m as any)?.latitude ?? '',
                          longitude: (m as any)?.longitude ?? '',
                          for_coWorking: !!(m as any).for_coWorking,
                          for_office: !!(m as any).for_office,
                          for_coLiving: !!(m as any).for_coLiving,
                          for_flatspace: !!(m as any).for_flatspace,
                          for_buildings: !!(m as any).for_buildings,
                          description: (m as any).description ?? '',
                          locationImage: (m as any).locationImage ?? {},
                        })
                        setOpen(true)
                      }}
                    >
                      <PencilSquareIcon className="h-5 w-5" aria-hidden />
                    </IconAction>
                    <IconAction label="Delete" tone="rose" onClick={() => setConfirm({ id: m.id, name: m.name })}>
                      <TrashIcon className="h-5 w-5" aria-hidden />
                    </IconAction>
                  </div>
                </Td>
              </Tr>
            ))}
            {!microQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td className="list-empty" colSpan={8}>
                  <strong>No micro-locations found</strong>
                  Try another search or add a micro-location.
                </Td>
              </Tr>
            ) : null}
          </tbody>
        </Table>

        <ListPagination
          currentPage={Math.min(page, totalPages)}
          pageCount={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          loading={microQ.isLoading}
          className="border-0 bg-transparent px-0 shadow-none ring-0"
        />
      </PageShell>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        title={editing?.id ? 'Edit micro-location' : 'Add micro-location'}
      >
        {editing ? (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              saveMut.mutate(editing)
            }}
          >
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Name</label>
              <div className="mt-1">
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">City</label>
              <div className="mt-1">
                <select
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={editing.city ?? ''}
                  onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), city: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    Select city…
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {citiesQ.isError ? (
                  <div className="mt-2 text-xs text-rose-600">Failed to load cities list.</div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Latitude</label>
              <div className="mt-1">
                <Input
                  value={editing.latitude ?? ''}
                  onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), latitude: e.target.value }))}
                  placeholder="28.6139"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Longitude</label>
              <div className="mt-1">
                <Input
                  value={editing.longitude ?? ''}
                  onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), longitude: e.target.value }))}
                  placeholder="77.2090"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="grid gap-2 sm:grid-cols-5">
                {[
                  ['for_coWorking', 'Coworking'],
                  ['for_office', 'Office'],
                  ['for_coLiving', 'Coliving'],
                  ['for_flatspace', 'Flat'],
                  ['for_buildings', 'Buildings'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      checked={!!editing[key]}
                      onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), [key]: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null) }}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saveMut.isPending || !editing.city || !editing.name}>
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete micro-location?"
        description={confirm ? `This will delete “${confirm.name}”.` : undefined}
        confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm.id)}
      />
    </>
  )
}
