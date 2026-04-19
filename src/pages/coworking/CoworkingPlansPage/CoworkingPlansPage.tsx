import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import {
  changeCoworkingCategoryStatus,
  deleteCoworkingCategoryPlan,
  getCoworkingCategoryPlans,
  saveCoworkingCategoryPlan,
} from '../../../services/coworking/planCategory.service'
import type { CoworkingCategoryPlan } from '../../../services/coworking/types'
import { getCountries } from '../../../services/locations/country.service'
import type { Country } from '../../../services/locations/types'

function countryLabel(c: CoworkingCategoryPlan['country']): string {
  if (c == null) return '—'
  if (typeof c === 'string') return c
  return c.name ?? c.id ?? '—'
}

export function CoworkingPlansPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10
  const params = useMemo(() => ({ limit, page, name: q.trim().toLowerCase() }), [limit, page, q])

  const listQ = useQuery({
    queryKey: ['coworking-plans', params],
    queryFn: () => getCoworkingCategoryPlans(params),
    staleTime: 10_000,
  })

  const countriesQ = useQuery({
    queryKey: ['countries', 'coworking-plans'],
    queryFn: () => getCountries({ limit: 100_000 }),
    staleTime: 60_000,
  })

  const coworkingCountries = useMemo(() => {
    const rows = countriesQ.data?.data ?? []
    return rows.filter((c: Country) => c.for_coWorking === true)
  }, [countriesQ.data])

  const [modal, setModal] = useState<CoworkingCategoryPlan | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)

  const saveMut = useMutation({
    mutationFn: (p: CoworkingCategoryPlan) => saveCoworkingCategoryPlan(p),
    onSuccess: () => {
      toast.success('Plan saved')
      setModal(null)
      qc.invalidateQueries({ queryKey: ['coworking-plans'] })
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCoworkingCategoryPlan(id),
    onSuccess: () => {
      toast.success('Deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['coworking-plans'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const statusMut = useMutation({
    mutationFn: (id: string) => changeCoworkingCategoryStatus(id),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['coworking-plans'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  const data = listQ.data
  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as CoworkingCategoryPlan[]
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <>
      <PageShell
        title="Coworking plans"
        description="Workspace category plans for coworking listings."
        actions={
          <>
            <div className="w-full sm:w-72">
              <Input
                value={q}
                onChange={(e) => {
                  setPage(1)
                  setQ(e.target.value)
                }}
                placeholder="Filter by name…"
              />
            </div>
            <Button
              variant="primary"
              onClick={() =>
                setModal({
                  name: '',
                  description: '',
                  country: coworkingCountries[0]?.id,
                })
              }
            >
              Add plan
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            {listQ.isLoading ? 'Loading…' : `${total} total`}
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

        <Table className="mt-4">
          <thead className="bg-slate-50">
            <tr>
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Country</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id ?? row.name}>
                <Td className="font-medium text-slate-900">{row.name ?? '—'}</Td>
                <Td className="max-w-md truncate text-slate-600">{row.description ?? '—'}</Td>
                <Td>{countryLabel(row.country)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setModal({ ...row })}>
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => row.id && statusMut.mutate(row.id)}>
                      Toggle status
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-rose-700 hover:bg-rose-50"
                      onClick={() => row.id && setConfirm({ id: row.id, name: row.name ?? '' })}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </PageShell>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit coworking plan' : 'Add coworking plan'}
      >
        {modal ? (
          <form
            className="space-y-4 px-5 pb-5"
            onSubmit={(e) => {
              e.preventDefault()
              saveMut.mutate(modal)
            }}
          >
            <div>
              <label className="text-xs font-semibold text-slate-700">Name *</label>
              <Input
                className="mt-1"
                value={modal.name ?? ''}
                onChange={(e) => setModal((m) => (m ? { ...m, name: e.target.value } : m))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={modal.description ?? ''}
                onChange={(e) => setModal((m) => (m ? { ...m, description: e.target.value } : m))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Country (coworking-enabled)</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={typeof modal.country === 'string' ? modal.country : modal.country?.id ?? ''}
                onChange={(e) =>
                  setModal((m) => (m ? { ...m, country: e.target.value || undefined } : m))
                }
              >
                <option value="">Select country</option>
                {coworkingCountries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>
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
        title="Delete plan?"
        description={confirm ? `Remove “${confirm.name}”? This cannot be undone.` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm.id)}
      />
    </>
  )
}
