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
import { Table, Td, Th, Tr } from '../../components/Table'
import { filterLabelClass, resolveListTotal, sortIndicator } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { deleteSeo, getSeos } from '../../services/seo/seo.service'
import type { SeoRecord } from '../../services/seo/types'

function seoRowId(s: SeoRecord): string {
  return String(s.id ?? s._id ?? '')
}

export function SeoListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [pathInput, setPathInput] = useState('')
  const debouncedPath = useDebouncedValue(pathInput, 500)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('')
  const [orderBy, setOrderBy] = useState<'1' | '-1' | ''>('')

  const params = useMemo(
    () => ({
      limit: pageSize,
      page,
      ...(debouncedPath.trim() ? { name: debouncedPath.trim().toLowerCase() } : {}),
      ...(sortBy ? { sortBy, orderBy: orderBy || '1' } : {}),
    }),
    [pageSize, page, debouncedPath, sortBy, orderBy],
  )

  const listQ = useQuery({
    queryKey: ['seo-list', params],
    queryFn: () => getSeos(params),
    staleTime: 10_000,
  })

  const [confirm, setConfirm] = useState<SeoRecord | null>(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteSeo(id),
    onSuccess: () => {
      toast.success('SEO entry deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['seo-list'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const rows = (listQ.data?.data ?? []) as SeoRecord[]
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

  function resetFilters() {
    setPathInput('')
    setPage(1)
    setSortBy('')
    setOrderBy('')
    setPageSize(10)
  }

  return (
    <>
      <PageShell
        title="SEO"
        description="Manage SEO entries — path, meta tags, social previews, and scripts."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/seo/add')}>
            Add SEO
          </Button>
        }
      >
        <ListFilterCard description="Filter by URL path." onReset={resetFilters}>
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="seo-search-path">
              Search path
            </label>
            <Input
              id="seo-search-path"
              value={pathInput}
              onChange={(e) => {
                setPage(1)
                setPathInput(e.target.value)
              }}
              placeholder="Filter by path…"
            />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={listQ.isLoading}
          loadingLabel="Loading SEO entries…"
          total={total}
          noun="entry"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[22%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('path')}>
                  Path {sortIndicator(sortBy === 'path', orderBy)}
                </button>
              </Th>
              <Th className="w-[22%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('title')}>
                  Title {sortIndicator(sortBy === 'title', orderBy)}
                </button>
              </Th>
              <Th className="w-[46%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('description')}>
                  Description {sortIndicator(sortBy === 'description', orderBy)}
                </button>
              </Th>
              <Th className="w-[10%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr><Td colSpan={4} className="list-empty">Loading…</Td></Tr>
            ) : rows.length === 0 ? (
              <Tr><Td colSpan={4} className="list-empty"><strong>No SEO entries</strong>Add one with “Add SEO”.</Td></Tr>
            ) : (
              rows.map((row) => {
                const id = seoRowId(row)
                return (
                  <Tr key={id || row.path}>
                    <Td className="align-middle max-w-[200px] truncate font-medium text-ink" title={row.path}>{row.path || '—'}</Td>
                    <Td className="align-middle max-w-[180px] truncate text-sm" title={row.title}>{row.title ?? '—'}</Td>
                    <Td className="align-middle max-w-md truncate text-sm text-muted" title={row.description}>{row.description || '—'}</Td>
                    <Td className="align-middle">
                      <div className="table-actions">
                        <IconAction label="Edit" disabled={!id} onClick={() => navigate(`/layout/seo/detail/${id}`)}>
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
        title="Delete SEO entry?"
        description={confirm ? `Remove “${confirm.title ?? confirm.path ?? 'this entry'}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => { const id = confirm ? seoRowId(confirm) : ''; if (id) delMut.mutate(id) }}
      />
    </>
  )
}
