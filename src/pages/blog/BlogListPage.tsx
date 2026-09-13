import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { Table, Td, Th, Tr } from '../../components/Table'
import { cn } from '../../lib/ui'
import { env } from '../../lib/env'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { changeBlogStatus, deleteBlog, getBlogs } from '../../services/blog/blog.service'
import { BLOG_TYPES, type BlogRecord } from '../../services/blog/types'

function blogRowId(row: BlogRecord): string {
  return String(row.id ?? row._id ?? '')
}

function statusLabel(status: string | undefined) {
  if (status === 'approve') return 'ENABLED'
  if (status === 'reject') return 'DISABLED'
  if (status === 'pending') return 'PENDING'
  return status ?? '—'
}

function statusClass(status: string | undefined) {
  if (status === 'approve') return 'text-emerald-700'
  if (status === 'reject') return 'text-rose-700'
  if (status === 'pending') return 'text-amber-700'
  return 'text-slate-600'
}

function blogTypeLabel(value: string | undefined) {
  if (!value) return 'No Blog Type'
  return BLOG_TYPES.find((t) => t.value === value)?.label ?? value
}

function blogPreviewUrl(slug: string): string | null {
  const base = (env.websitePath || '').replace(/\/+$/, '')
  if (!base || !slug) return null
  return `${base}/blog/${slug}`
}

type SortCol = 'blog_type' | 'slug' | 'status'

export function BlogListPage() {
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
    queryKey: ['blogs', params],
    queryFn: () => getBlogs(params),
    staleTime: 10_000,
  })

  const [confirm, setConfirm] = useState<
    | null
    | { type: 'delete'; row: BlogRecord }
    | { type: 'enable'; row: BlogRecord }
    | { type: 'disable'; row: BlogRecord }
  >(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteBlog(id),
    onSuccess: () => {
      toast.success('Blog deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['blogs'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const statusMut = useMutation({
    mutationFn: ({ row, next }: { row: BlogRecord; next: string }) =>
      changeBlogStatus({ ...row, status: next }),
    onSuccess: (_, v) => {
      toast.success(`Blog Status Changed To ${v.next === 'approve' ? 'ENABLE' : 'DISABLE'}`)
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['blogs'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  const total = listQ.data?.totalRecords ?? listQ.data?.data?.length ?? 0
  const rows = (listQ.data?.data ?? []) as BlogRecord[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  function toggleSort(col: SortCol) {
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
    setNameInput('')
    setPage(1)
    setSortBy('')
    setOrderBy('')
    setPageSize(10)
  }

  function onPreview(row: BlogRecord) {
    const url = blogPreviewUrl(row.slug ?? '')
    if (!url) {
      toast.error('Set VITE_WEBSITE_URL and ensure the blog has a slug to preview.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <PageShell
        title="Blog"
        description="Manage blog posts — type, slug, status, preview. Matches the legacy blog table."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/blog/add')}>
            Add Blog
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200/70 bg-surface p-4 shadow-sm ring-1 ring-slate-200/50">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="blog-search">
              Search name
            </label>
            <Input
              id="blog-search"
              value={nameInput}
              onChange={(e) => {
                setPage(1)
                setNameInput(e.target.value)
              }}
              placeholder="Filter by name…"
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
            <label className="text-xs text-slate-500" htmlFor="blog-page-size">
              Per page
            </label>
            <select
              id="blog-page-size"
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
                  onClick={() => toggleSort('blog_type')}
                >
                  Blog Type {sortMark('blog_type')}
                </button>
              </Th>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('slug')}
                >
                  Slug {sortMark('slug')}
                </button>
              </Th>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('status')}
                >
                  Status {sortMark('status')}
                </button>
              </Th>
              <Th>Edit</Th>
              <Th>Preview</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {!listQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                  No blog posts. Add one with “Add Blog”.
                </Td>
              </Tr>
            ) : null}
            {rows.map((row) => {
              const id = blogRowId(row)
              return (
                <Tr key={id || row.slug}>
                  <Td className="font-medium text-slate-900">{blogTypeLabel(row.blog_type)}</Td>
                  <Td className="max-w-[240px] truncate" title={row.slug}>
                    {row.slug || '—'}
                  </Td>
                  <Td className={cn('font-medium', statusClass(row.status))}>{statusLabel(row.status)}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      disabled={!id}
                      onClick={() => navigate(`/layout/blog/detail/${id}`)}
                    >
                      Edit
                    </Button>
                  </Td>
                  <Td>
                    <Button variant="ghost" onClick={() => onPreview(row)}>
                      Preview
                    </Button>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        className="text-emerald-700"
                        onClick={() => setConfirm({ type: 'enable', row })}
                      >
                        Enable
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-amber-700"
                        onClick={() => setConfirm({ type: 'disable', row })}
                      >
                        Disable
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-rose-700"
                        onClick={() => setConfirm({ type: 'delete', row })}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </PageShell>

      <ConfirmDialog
        open={confirm?.type === 'delete'}
        title="Delete blog?"
        description={
          confirm?.type === 'delete'
            ? `Are you sure you want to delete “${confirm.row.heading || confirm.row.slug || 'this blog'}”?`
            : undefined
        }
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.type !== 'delete') return
          const id = blogRowId(confirm.row)
          if (id) delMut.mutate(id)
        }}
      />

      <ConfirmDialog
        open={confirm?.type === 'enable'}
        title="Enable blog?"
        description={
          confirm?.type === 'enable'
            ? `Set “${confirm.row.heading || confirm.row.slug || 'this blog'}” to ENABLED?`
            : undefined
        }
        confirmText="Enable"
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'enable' && statusMut.mutate({ row: confirm.row, next: 'approve' })
        }
      />

      <ConfirmDialog
        open={confirm?.type === 'disable'}
        title="Disable blog?"
        description={
          confirm?.type === 'disable'
            ? `Set “${confirm.row.heading || confirm.row.slug || 'this blog'}” to DISABLED?`
            : undefined
        }
        confirmText="Disable"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'disable' && statusMut.mutate({ row: confirm.row, next: 'reject' })
        }
      />
    </>
  )
}
