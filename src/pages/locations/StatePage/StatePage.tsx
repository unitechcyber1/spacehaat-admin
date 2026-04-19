import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { getCountries } from '../../../services/locations/country.service'
import { getStates, removeState, saveState } from '../../../services/locations/state.service'
import type { Country, State } from '../../../services/locations/types'

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

export function StatePage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10
  const params = useMemo(() => ({ limit, page, name: q.trim().toLowerCase() }), [limit, page, q])

  const statesQ = useQuery({
    queryKey: ['states', params],
    queryFn: () => getStates(params),
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

  const saveMut = useMutation({
    mutationFn: (payload: any) => saveState(payload),
    onSuccess: () => {
      toast.success('State saved')
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['states'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save state'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => removeState(id),
    onSuccess: () => {
      toast.success('State deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['states'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete state'),
  })

  const total = statesQ.data?.totalRecords ?? statesQ.data?.data?.length ?? 0
  const rows = (statesQ.data?.data ?? []) as State[]
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <>
      <PageShell
        title="States"
        description="States mapped under countries."
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
                  for_coWorking: false,
                  for_office: false,
                  for_coLiving: false,
                  for_flatspace: false,
                })
                setOpen(true)
              }}
            >
              Add state
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            {statesQ.isLoading ? 'Loading…' : `${total} total`}
            {statesQ.isError ? (
              <span className="ml-2 text-rose-600">
                {(statesQ.error as any)?.message ?? 'Failed to load'}
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
              <Th>Coworking</Th>
              <Th>Office</Th>
              <Th>Coliving</Th>
              <Th>Flat</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-slate-900">{s.name}</Td>
                <Td>{s.country?.name ?? '-'}</Td>
                <Td>{boolBadge((s as any).for_coWorking)}</Td>
                <Td>{boolBadge((s as any).for_office)}</Td>
                <Td>{boolBadge((s as any).for_coLiving)}</Td>
                <Td>{boolBadge((s as any).for_flatspace)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing({
                          id: s.id,
                          name: s.name,
                          country: (s as any)?.country?.id ?? '',
                          for_coWorking: !!(s as any).for_coWorking,
                          for_office: !!(s as any).for_office,
                          for_coLiving: !!(s as any).for_coLiving,
                          for_flatspace: !!(s as any).for_flatspace,
                          description: (s as any).description ?? '',
                        })
                        setOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-rose-700 hover:bg-rose-50"
                      onClick={() => setConfirm({ id: s.id, name: s.name })}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {!statesQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td className="py-10 text-center text-slate-500" colSpan={7}>
                  No states found.
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
        title={editing?.id ? 'Edit state' : 'Add state'}
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
                  onChange={(e) => setEditing((s: any) => ({ ...(s ?? {}), country: e.target.value }))}
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
                  <div className="mt-2 text-xs text-rose-600">
                    Failed to load countries list.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  ['for_coWorking', 'Coworking'],
                  ['for_office', 'Office'],
                  ['for_coLiving', 'Coliving'],
                  ['for_flatspace', 'Flat'],
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
              <Button type="submit" variant="primary" disabled={saveMut.isPending || !editing.country}>
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete state?"
        description={confirm ? `This will delete “${confirm.name}”.` : undefined}
        confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm.id)}
      />
    </>
  )
}

