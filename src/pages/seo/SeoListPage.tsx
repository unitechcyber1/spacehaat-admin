import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { Table, Td, Th, Tr } from '../../components/Table'
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

  const total = listQ.data?.totalRecords ?? listQ.data?.data?.length ?? 0
  const rows = (listQ.data?.data ?? []) as SeoRecord[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

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

  function sortMark(col: string) {
    if (sortBy !== col) return '↕'
    return orderBy === '-1' ? '↓' : '↑'
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
        description="Manage SEO entries (path, meta, social, scripts). Matches legacy SEO data table."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/seo/add')}>
            Add SEO
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/50">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-search-path">
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
              className="rounded-xl"
            />
          </div>
          <Button type="button" variant="secondary" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {listQ.isLoading ? 'Loading…' : `${total} records`}
            {listQ.isError ? (
              <span className="ml-2 text-rose-600">{(listQ.error as Error)?.message ?? 'Failed to load'}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500" htmlFor="seo-page-size">
              Per page
            </label>
            <select
              id="seo-page-size"
              className="rounded-xl border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={pageSize}
              onChange={(e) => {
                setPage(1)
                setPageSize(Number(e.target.value))
              }}
            >
              {[5, 10, 25, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button variant="secondary" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <span className="text-sm text-slate-600">
              Page <span className="font-medium text-slate-900">{page}</span> / {totalPages}
            </span>
            <Button variant="secondary" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>

        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('path')}
                >
                  Path {sortMark('path')}
                </button>
              </Th>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('title')}
                >
                  Title {sortMark('title')}
                </button>
              </Th>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('description')}
                >
                  Description {sortMark('description')}
                </button>
              </Th>
              <Th>Edit</Th>
              <Th>Delete</Th>
            </tr>
          </thead>
          <tbody>
            {!listQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                  No SEO rows. Add one with “Add SEO”.
                </Td>
              </Tr>
            ) : null}
            {rows.map((row) => {
              const id = seoRowId(row)
              return (
                <Tr key={id || row.path}>
                  <Td className="max-w-[200px] truncate font-medium text-slate-900" title={row.path}>
                    {row.path || 'No path'}
                  </Td>
                  <Td className="max-w-[180px] truncate" title={row.title}>
                    {row.title ?? '—'}
                  </Td>
                  <Td className="max-w-md truncate text-sm text-slate-700" title={row.description}>
                    {row.description || 'No description'}
                  </Td>
                  <Td>
                    <Button variant="ghost" disabled={!id} onClick={() => navigate(`/layout/seo/detail/${id}`)}>
                      Edit
                    </Button>
                  </Td>
                  <Td>
                    <Button variant="ghost" className="text-rose-700" onClick={() => setConfirm(row)}>
                      Delete
                    </Button>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </PageShell>

      <ConfirmDialog
        open={!!confirm}
        title="Delete SEO entry?"
        description={confirm ? `Remove “${confirm.title ?? confirm.path ?? 'this entry'}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const id = confirm ? seoRowId(confirm) : ''
          if (id) delMut.mutate(id)
        }}
      />
    </>
  )
}
