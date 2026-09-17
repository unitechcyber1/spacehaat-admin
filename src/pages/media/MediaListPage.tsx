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

  const rows = (listQ.data?.data ?? []) as MediaItem[]
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
    setNameInput('')
    setPage(1)
    setSortBy('')
    setOrderBy('')
    setPageSize(10)
  }

  return (
    <>
      <PageShell
        title="Media"
        description="Manage media assets — name, URL preview, and uploads."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/media/add')}>
            Add media
          </Button>
        }
      >
        <ListFilterCard
          description="Search by name. Results update as you type."
          onReset={resetFilters}
        >
          <div className="min-w-0 sm:col-span-2">
            <label className={filterLabelClass} htmlFor="media-search">
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
            />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={listQ.isLoading}
          loadingLabel="Loading media…"
          total={total}
          noun="item"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[28%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand"
                  onClick={() => toggleSort('name')}
                >
                  Name {sortIndicator(sortBy === 'name', orderBy)}
                </button>
              </Th>
              <Th className="w-[52%]">
                <button
                  type="button"
                  className="flex items-center gap-1 font-semibold uppercase tracking-wide text-muted hover:text-brand"
                  onClick={() => toggleSort('url')}
                >
                  Media URL {sortIndicator(sortBy === 'url', orderBy)}
                </button>
              </Th>
              <Th className="w-[20%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr>
                <Td colSpan={3} className="list-empty">
                  Loading media…
                </Td>
              </Tr>
            ) : rows.length === 0 ? (
              <Tr>
                <Td colSpan={3} className="list-empty">
                  <strong>No media found</strong>
                  Add an asset with “Add media” or adjust your search.
                </Td>
              </Tr>
            ) : (
              rows.map((row) => {
                const id = mediaRowId(row)
                const url = mediaUrl(row)
                return (
                  <Tr key={id || url || row.name}>
                    <Td className="align-middle font-medium text-ink">{row.name ?? '—'}</Td>
                    <Td className="align-middle max-w-md break-all text-sm text-muted">{url || '—'}</Td>
                    <Td className="align-middle">
                      <div className="table-actions">
                        <IconAction
                          label="Edit"
                          tone="slate"
                          disabled={!id}
                          onClick={() => navigate(`/layout/media/detail/${id}`)}
                        >
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
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          loading={listQ.isLoading}
          className="border-0 bg-transparent px-0 shadow-none ring-0"
        />
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
