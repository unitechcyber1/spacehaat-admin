import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { IconAction } from '../../components/IconAction'
import { Input } from '../../components/Input'
import { ListFilterCard } from '../../components/ListFilterCard'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { StatusBadge } from '../../components/StatusBadge'
import { Table, Td, Th, Tr } from '../../components/Table'
import { env } from '../../lib/env'
import { filterLabelClass, resolveListTotal, sortIndicator } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { changeBlogStatus, deleteBlog, getBlogs } from '../../services/blog/blog.service'
import { BLOG_TYPES, type BlogRecord } from '../../services/blog/types'

function blogRowId(row: BlogRecord): string {
  return String(row.id ?? row._id ?? '')
}

function blogTypeLabel(value: string | undefined) {
  if (!value) return '—'
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
      toast.success(v.next === 'approve' ? 'Blog enabled' : 'Blog disabled')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['blogs'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  const rows = (listQ.data?.data ?? []) as BlogRecord[]
  const total = resolveListTotal(listQ.data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
        description="Manage blog posts — type, slug, status, and preview."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/blog/add')}>
            Add blog
          </Button>
        }
      >
        <ListFilterCard description="Search by post name or heading." onReset={resetFilters}>
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="blog-search">Search</label>
            <Input
              id="blog-search"
              value={nameInput}
              onChange={(e) => { setPage(1); setNameInput(e.target.value) }}
              placeholder="Filter by name…"
            />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={listQ.isLoading}
          total={total}
          noun="post"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[22%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('blog_type')}>
                  Type {sortIndicator(sortBy === 'blog_type', orderBy)}
                </button>
              </Th>
              <Th className="w-[38%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('slug')}>
                  Slug {sortIndicator(sortBy === 'slug', orderBy)}
                </button>
              </Th>
              <Th className="w-[14%]">
                <button type="button" className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand" onClick={() => toggleSort('status')}>
                  Status {sortIndicator(sortBy === 'status', orderBy)}
                </button>
              </Th>
              <Th className="w-[26%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr><Td colSpan={4} className="list-empty">Loading…</Td></Tr>
            ) : rows.length === 0 ? (
              <Tr><Td colSpan={4} className="list-empty"><strong>No blog posts</strong>Add one with “Add blog”.</Td></Tr>
            ) : (
              rows.map((row) => {
                const id = blogRowId(row)
                const canPreview = row.status === 'approve'
                return (
                  <Tr key={id || row.slug}>
                    <Td className="align-middle text-sm font-medium text-ink">{blogTypeLabel(row.blog_type)}</Td>
                    <Td className="align-middle max-w-[280px] truncate text-sm text-muted" title={row.slug}>{row.slug || '—'}</Td>
                    <Td className="align-middle"><StatusBadge status={row.status} /></Td>
                    <Td className="align-middle">
                      <div className="table-actions">
                        <IconAction label="Edit" disabled={!id} onClick={() => navigate(`/layout/blog/detail/${id}`)}>
                          <PencilSquareIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                        <IconAction label={canPreview ? 'Preview' : 'Preview (enabled only)'} tone={canPreview ? 'slate' : 'amber'} onClick={() => onPreview(row)}>
                          <EyeIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                        <IconAction label="Enable" tone="emerald" onClick={() => setConfirm({ type: 'enable', row })}>
                          <CheckCircleIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                        <IconAction label="Disable" tone="amber" onClick={() => setConfirm({ type: 'disable', row })}>
                          <XCircleIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                        <IconAction label="Delete" tone="rose" onClick={() => setConfirm({ type: 'delete', row })}>
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
        open={confirm?.type === 'delete'}
        title="Delete blog?"
        description={confirm?.type === 'delete' ? `Remove “${confirm.row.heading || confirm.row.slug || 'this blog'}”?` : undefined}
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
        description={confirm?.type === 'enable' ? `Set “${confirm.row.heading || confirm.row.slug}” to enabled?` : undefined}
        confirmText="Enable"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.type === 'enable' && statusMut.mutate({ row: confirm.row, next: 'approve' })}
      />

      <ConfirmDialog
        open={confirm?.type === 'disable'}
        title="Disable blog?"
        description={confirm?.type === 'disable' ? `Set “${confirm.row.heading || confirm.row.slug}” to disabled?` : undefined}
        confirmText="Disable"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.type === 'disable' && statusMut.mutate({ row: confirm.row, next: 'reject' })}
      />
    </>
  )
}
