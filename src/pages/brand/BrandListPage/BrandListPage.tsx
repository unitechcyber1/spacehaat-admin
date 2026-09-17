import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { IconAction } from '../../../components/IconAction'
import { Input } from '../../../components/Input'
import { ListFilterCard } from '../../../components/ListFilterCard'
import { ListPageMeta } from '../../../components/ListPageMeta'
import { ListPagination } from '../../../components/ListPagination'
import { PageShell } from '../../../components/PageShell'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { filterLabelClass, resolveListTotal } from '../../../lib/listPageUi'
import { deleteBrand, getBrands } from '../../../services/brand/brand.service'
import type { Brand } from '../../../services/brand/types'

export function BrandListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const params = useMemo(
    () => ({ limit: pageSize, page, name: q.trim().toLowerCase() }),
    [pageSize, page, q],
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

  const rows = (data?.data ?? []) as Brand[]
  const total = resolveListTotal(data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageShell
        title="Brands"
        description="Manage brands shown across the product."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/brand/add')}>
            Add brand
          </Button>
        }
      >
        <ListFilterCard
          description="Search by brand name."
          onReset={() => { setQ(''); setPage(1); setPageSize(10) }}
        >
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="brand-search">Name</label>
            <Input
              id="brand-search"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value) }}
              placeholder="Filter by name…"
            />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={isLoading}
          total={total}
          noun="brand"
          error={isError ? (error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[12%]">Order</Th>
              <Th className="w-[38%]">Name</Th>
              <Th className="w-[30%]">Type</Th>
              <Th className="w-[20%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <Tr><Td colSpan={4} className="list-empty">Loading…</Td></Tr>
            ) : rows.length === 0 ? (
              <Tr><Td colSpan={4} className="list-empty"><strong>No brands found</strong>Try another search or add a brand.</Td></Tr>
            ) : (
              rows.map((b) => (
                <Tr key={b.id}>
                  <Td className="align-middle tnum text-xs text-muted">{b.order ?? '—'}</Td>
                  <Td className="align-middle font-medium text-ink">{b.name}</Td>
                  <Td className="align-middle text-sm text-muted">{b.type || '—'}</Td>
                  <Td className="align-middle">
                    <div className="table-actions">
                      <IconAction label="Edit" onClick={() => navigate(`/layout/brand/detail/${b.id}`)}>
                        <PencilSquareIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                      <IconAction label="Delete" tone="rose" onClick={() => b.id && setConfirm({ id: b.id, name: b.name ?? '' })}>
                        <TrashIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                    </div>
                  </Td>
                </Tr>
              ))
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
          loading={isLoading}
          className="border-0 bg-transparent px-0 shadow-none ring-0"
        />
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
