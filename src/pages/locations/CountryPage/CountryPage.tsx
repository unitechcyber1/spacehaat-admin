import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { getCountries, removeCountry, saveCountry } from '../../../services/locations/country.service'
import type { Country } from '../../../services/locations/types'

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

export function CountryPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const params = useMemo(
    () => ({ limit, page, name: q.trim().toLowerCase() }),
    [limit, page, q],
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['countries', params],
    queryFn: () => getCountries(params),
    staleTime: 10_000,
  })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Country> | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)

  const saveMut = useMutation({
    mutationFn: (payload: any) => saveCountry(payload),
    onSuccess: () => {
      toast.success('Country saved')
      setOpen(false)
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['countries'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save country'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => removeCountry(id),
    onSuccess: () => {
      toast.success('Country deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['countries'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete country'),
  })

  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = data?.data ?? []
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <>
      <PageShell
        title="Countries"
        description="Manage countries used across listings and location filters."
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
                  dial_code: '',
                  iso_code: '',
                  for_coWorking: false,
                  for_office: false,
                  for_coLiving: false,
                  for_flatspace: false,
                })
                setOpen(true)
              }}
            >
              Add country
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            {isLoading ? 'Loading…' : `${total} total`}
            {isError ? (
              <span className="ml-2 text-rose-600">
                {(error as any)?.message ?? 'Failed to load'}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <div className="text-sm text-slate-600">
              Page <span className="font-medium text-slate-900">{page}</span>
            </div>
            <Button
              variant="secondary"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Name</Th>
              <Th>Dial</Th>
              <Th>ISO</Th>
              <Th>Coworking</Th>
              <Th>Office</Th>
              <Th>Coliving</Th>
              <Th>Flat</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">{c.name}</Td>
                <Td className="font-mono text-xs">{(c as any).dial_code ?? '-'}</Td>
                <Td className="font-mono text-xs">{(c as any).iso_code ?? '-'}</Td>
                <Td>{boolBadge((c as any).for_coWorking)}</Td>
                <Td>{boolBadge((c as any).for_office)}</Td>
                <Td>{boolBadge((c as any).for_coLiving)}</Td>
                <Td>{boolBadge((c as any).for_flatspace)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing({
                          id: c.id,
                          name: c.name,
                          dial_code: (c as any).dial_code ?? '',
                          iso_code: (c as any).iso_code ?? '',
                          for_coWorking: !!(c as any).for_coWorking,
                          for_office: !!(c as any).for_office,
                          for_coLiving: !!(c as any).for_coLiving,
                          for_flatspace: !!(c as any).for_flatspace,
                          description: (c as any).description ?? '',
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
            {!isLoading && rows.length === 0 ? (
              <Tr>
                <Td className="py-10 text-center text-slate-500" colSpan={8}>
                  No countries found.
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
        title={editing?.id ? 'Edit country' : 'Add country'}
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
                  onChange={(e) => setEditing((s) => ({ ...(s ?? {}), name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Dial code</label>
              <div className="mt-1">
                <Input
                  value={(editing as any).dial_code ?? ''}
                  onChange={(e) => setEditing((s) => ({ ...(s ?? {}), dial_code: e.target.value }))}
                  placeholder="+91"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">ISO code</label>
              <div className="mt-1">
                <Input
                  value={(editing as any).iso_code ?? ''}
                  onChange={(e) => setEditing((s) => ({ ...(s ?? {}), iso_code: e.target.value }))}
                  placeholder="IN"
                />
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
                      checked={!!(editing as any)[key]}
                      onChange={(e) => setEditing((s) => ({ ...(s ?? {}), [key]: e.target.checked }))}
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
              <Button type="submit" variant="primary" disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete country?"
        description={confirm ? `This will delete “${confirm.name}”.` : undefined}
        confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm.id)}
      />
    </>
  )
}

