import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { getCountries } from '../../../services/locations/country.service'
import { getCities, removeCity, saveCity } from '../../../services/locations/city.service'
import { getStatesByCountry } from '../../../services/locations/state.service'
import type { City, Country, State } from '../../../services/locations/types'

function boolBadge(v?: boolean) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        v ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {v ? 'Yes' : 'No'}
    </span>
  )
}

export function CityPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10
  const params = useMemo(() => ({ limit, page, name: q.trim().toLowerCase() }), [limit, page, q])

  const citiesQ = useQuery({
    queryKey: ['cities', params],
    queryFn: () => getCities(params),
    staleTime: 10_000,
  })

  const countriesQ = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: () => getCountries({ limit: 100000 }),
    staleTime: 60_000,
  })
  const countries = (countriesQ.data?.data ?? []) as Country[]

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)

  const [states, setStates] = useState<State[]>([])
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!editing?.country) {
        setStates([])
        return
      }
      try {
        const res = await getStatesByCountry(editing.country)
        if (!cancelled) setStates((res.data ?? []) as any)
      } catch {
        if (!cancelled) setStates([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [editing?.country])

  const saveMut = useMutation({
    mutationFn: (payload: any) => saveCity(payload),
    onSuccess: () => {
      toast.success('City saved')
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['cities'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save city'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => removeCity(id),
    onSuccess: () => {
      toast.success('City deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['cities'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete city'),
  })

  const total = citiesQ.data?.totalRecords ?? citiesQ.data?.data?.length ?? 0
  const rows = (citiesQ.data?.data ?? []) as City[]
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <>
      <PageShell
        title="Cities"
        description="Cities under country/state with space-type flags."
        actions={
          <>
            <div className="w-full sm:w-72">
              <Input
                value={q}
                onChange={(e) => {
                  setPage(1)
                  setQ(e.target.value)
                }}
                placeholder="Search by name…"
              />
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditing({
                  name: '',
                  country: '',
                  state: '',
                  for_coWorking: false,
                  for_office: false,
                  for_coLiving: false,
                  for_flatspace: false,
                  for_virtual: false,
                  cityImage: {},
                })
                setStates([])
                setOpen(true)
              }}
            >
              Add city
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            {citiesQ.isLoading ? 'Loading…' : `${total} total`}
            {citiesQ.isError ? (
              <span className="ml-2 text-rose-600">
                {(citiesQ.error as any)?.message ?? 'Failed to load'}
              </span>
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
              <Th>Name</Th>
              <Th>Country</Th>
              <Th>State</Th>
              <Th>Coworking</Th>
              <Th>Office</Th>
              <Th>Coliving</Th>
              <Th>Flat</Th>
              <Th>Virtual</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">{c.name}</Td>
                <Td>{(c as any).country?.name ?? '-'}</Td>
                <Td>{(c as any).state?.name ?? '-'}</Td>
                <Td>{boolBadge((c as any).for_coWorking)}</Td>
                <Td>{boolBadge((c as any).for_office)}</Td>
                <Td>{boolBadge((c as any).for_coLiving)}</Td>
                <Td>{boolBadge((c as any).for_flatspace)}</Td>
                <Td>{boolBadge((c as any).for_virtual)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing({
                          id: c.id,
                          name: c.name,
                          country: (c as any)?.country?.id ?? '',
                          state: (c as any)?.state?.id ?? '',
                          for_coWorking: !!(c as any).for_coWorking,
                          for_office: !!(c as any).for_office,
                          for_coLiving: !!(c as any).for_coLiving,
                          for_flatspace: !!(c as any).for_flatspace,
                          for_virtual: !!(c as any).for_virtual,
                          description: (c as any).description ?? '',
                          image: (c as any).image ?? undefined,
                          icons: (c as any).icons ?? undefined,
                          cityImage: (c as any).cityImage ?? {},
                        })
                        setOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-rose-700 hover:bg-rose-50"
                      onClick={() => setConfirm({ id: c.id, name: c.name })}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {!citiesQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td className="py-10 text-center text-slate-500" colSpan={9}>
                  No cities found.
                </Td>
              </Tr>
            ) : null}
          </tbody>
        </Table>
      </PageShell>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        title={editing?.id ? 'Edit city' : 'Add city'}
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
              <label className="text-xs font-semibold text-slate-700">Country</label>
              <div className="mt-1">
                <select
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={editing.country ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setEditing((s: any) => ({ ...(s ?? {}), country: v, state: '' }))
                  }}
                  required
                >
                  <option value="" disabled>
                    Select country…
                  </option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {countriesQ.isError ? (
                  <div className="mt-2 text-xs text-rose-600">Failed to load countries list.</div>
                ) : null}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">State</label>
              <div className="mt-1">
                <select
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={editing.state ?? ''}
                  onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), state: e.target.value }))}
                  disabled={!editing.country}
                >
                  <option value="">(optional)</option>
                  {states.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!editing.country ? (
                  <div className="mt-2 text-xs text-slate-500">Pick a country first.</div>
                ) : null}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="grid gap-2 sm:grid-cols-5">
                {[
                  ['for_coWorking', 'Coworking'],
                  ['for_office', 'Office'],
                  ['for_coLiving', 'Coliving'],
                  ['for_flatspace', 'Flat'],
                  ['for_virtual', 'Virtual'],
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
              <Button type="submit" variant="primary" disabled={saveMut.isPending || !editing.country || !editing.name}>
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete city?"
        description={confirm ? `This will delete “${confirm.name}”.` : undefined}
        confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm.id)}
      />
    </>
  )
}

