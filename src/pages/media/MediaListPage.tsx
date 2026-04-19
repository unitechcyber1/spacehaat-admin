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
import { deleteMedia, getMedias } from '../../services/media/media.service'
import type { MediaItem } from '../../services/media/types'

function mediaRowId(m: MediaItem): string {
  return String(m.id ?? m._id ?? '')
}

function mediaUrl(m: MediaItem): string {
  const img = m.image
  if (!img || typeof img === 'string') return typeof img === 'string' ? img : ''
  return img.s3_link ?? ''
}

export function MediaListPage() {
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
    queryKey: ['medias', params],
    queryFn: () => getMedias(params),
    staleTime: 10_000,
  })

  const [confirm, setConfirm] = useState<MediaItem | null>(null)

  const delMut = useMutation({
    mutationFn: async (row: MediaItem) => {
      const id = mediaRowId(row)
      if (!id) throw new Error('Missing id')
      const img = row.image
      const payload =
        img && typeof img === 'object' ? img : img ? { id: String(img) } : {}
      return deleteMedia(id, payload)
    },
    onSuccess: () => {
      toast.success('Media deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['medias'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const total = listQ.data?.totalRecords ?? listQ.data?.data?.length ?? 0
  const rows = (listQ.data?.data ?? []) as MediaItem[]
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

  return (
    <>
      <PageShell
        title="Media"
        description="Manage media assets (name, URL preview). Matches legacy Media table."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/media/add')}>
            Add media
          </Button>
        }
      >
        <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/50">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="media-search">
            Search name
          </label>
          <Input
            id="media-search"
            value={nameInput}
            onChange={(e) => {
              setPage(1)
              setNameInput(e.target.value)
            }}
            placeholder="Filter by name…"
            className="max-w-md rounded-xl"
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {listQ.isLoading ? 'Loading…' : `${total} records`}
            {listQ.isError ? (
              <span className="ml-2 text-rose-600">{(listQ.error as Error)?.message ?? 'Failed to load'}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500" htmlFor="media-page-size">
              Per page
            </label>
            <select
              id="media-page-size"
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
                  onClick={() => toggleSort('name')}
                >
                  Name {sortMark('name')}
                </button>
              </Th>
              <Th>
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-violet-700"
                  onClick={() => toggleSort('url')}
                >
                  Media URL {sortMark('url')}
                </button>
              </Th>
              <Th>Edit</Th>
              <Th>Delete</Th>
            </tr>
          </thead>
          <tbody>
            {!listQ.isLoading && rows.length === 0 ? (
              <Tr>
                <Td colSpan={4} className="py-12 text-center text-sm text-slate-500">
                  No media rows. Add one with “Add media”.
                </Td>
              </Tr>
            ) : null}
            {rows.map((row) => {
              const id = mediaRowId(row)
              const url = mediaUrl(row)
              return (
                <Tr key={id || url || row.name}>
                  <Td className="font-medium text-slate-900">{row.name ?? '—'}</Td>
                  <Td className="max-w-md break-all text-sm text-slate-700">{url || '—'}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      disabled={!id}
                      onClick={() => navigate(`/layout/media/detail/${id}`)}
                    >
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
        title="Delete media?"
        description={confirm ? `Remove “${confirm.name ?? 'this item'}”?` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && delMut.mutate(confirm)}
      />
    </>
  )
}
