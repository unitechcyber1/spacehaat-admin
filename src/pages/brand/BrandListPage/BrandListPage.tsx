import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Input } from '../../../components/Input'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { deleteBrand, getBrands } from '../../../services/brand/brand.service'
import type { Brand } from '../../../services/brand/types'

export function BrandListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10
  const params = useMemo(
    () => ({ limit, page, name: q.trim().toLowerCase() }),
    [limit, page, q],
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['brands', params],
    queryFn: () => getBrands(params),
    staleTime: 10_000,
  })

  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      toast.success('Brand deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['brands'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Delete failed'),
  })

  const total = data?.totalRecords ?? data?.data?.length ?? 0
  const rows = (data?.data ?? []) as Brand[]
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <>
      <PageShell
        title="Brands"
        description="Manage brands shown across the product."
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
            <Button variant="primary" onClick={() => navigate('/layout/brand/add')}>
              Add brand
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
              <Th>Order</Th>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <Tr key={b.id}>
                <Td className="font-mono text-xs">{b.order ?? '—'}</Td>
                <Td className="font-medium text-slate-900">{b.name}</Td>
                <Td>{b.type || 'No type'}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={() => navigate(`/layout/brand/detail/${b.id}`)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-rose-700 hover:bg-rose-50"
                      onClick={() => b.id && setConfirm({ id: b.id, name: b.name ?? '' })}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {!isLoading && rows.length === 0 ? (
              <Tr>
                <Td className="py-10 text-center text-slate-500" colSpan={4}>
                  No brands found.
                </Td>
              </Tr>
            ) : null}
          </tbody>
        </Table>
      </PageShell>

      <ConfirmDialog
        open={!!confirm}
        title="Delete brand?"
        description={confirm ? `This will delete “${confirm.name}”.` : undefined}
        confirmText={delMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm.id)}
      />
    </>
  )
}
