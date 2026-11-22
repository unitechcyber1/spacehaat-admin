import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowTopRightOnSquareIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { IconAction } from '../../components/IconAction'
import { Input } from '../../components/Input'
import { ListFilterCard } from '../../components/ListFilterCard'
import { ListPageMeta } from '../../components/ListPageMeta'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { SearchableCitySelect } from '../../components/SearchableCitySelect'
import { Table, Td, Th, Tr } from '../../components/Table'
import { filterLabelClass, resolveListTotal } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { deleteBuilding, getBuildings, refName, type BuildingRecord } from '../../services/building/building.service'
import { getCities } from '../../services/locations/city.service'
import { apiErrorMessage, buildingWebsiteUrl, cityOptions } from './buildingUi'
import { WebsitePageBadge } from './WebsitePageBadge'

function rowId(b: BuildingRecord) {
  return String(b.id ?? b._id ?? '')
}

export function BuildingListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [nameInput, setNameInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 400)
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const citiesQ = useQuery({ queryKey: ['cities', 'all'], queryFn: () => getCities({ limit: 200_000 }), staleTime: 300_000 })

  const params = useMemo(
    () => ({
      limit: pageSize,
      page,
      ...(debouncedName.trim() ? { name: debouncedName.trim() } : {}),
      ...(city ? { city } : {}),
    }),
    [pageSize, page, debouncedName, city],
  )

  const listQ = useQuery({ queryKey: ['buildings', params], queryFn: () => getBuildings(params), staleTime: 10_000 })
  const [confirm, setConfirm] = useState<BuildingRecord | null>(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteBuilding(id),
    onSuccess: () => {
      toast.success('Building deleted')
      setConfirm(null)
      qc.invalidateQueries({ queryKey: ['buildings'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Delete failed')),
  })

  const rows = (listQ.data?.data ?? []) as BuildingRecord[]
  const total = resolveListTotal(listQ.data, rows.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageShell
        title="Office buildings"
        description="Buildings that hold coworking spaces and managed offices. A building gets its own page on the website (/building/…) once it has 2 or more live centres."
        actions={
          <Button variant="primary" onClick={() => navigate('/layout/building/add')}>
            Add building
          </Button>
        }
      >
        <ListFilterCard
          description="Search by building name or pick a city."
          onReset={() => { setNameInput(''); setCity(''); setPage(1) }}
        >
          <div className="min-w-0">
            <label className={filterLabelClass} htmlFor="building-search">Search name</label>
            <Input
              id="building-search"
              value={nameInput}
              onChange={(e) => { setPage(1); setNameInput(e.target.value) }}
              placeholder="e.g. JMD Megapolis"
            />
          </div>
          <div className="min-w-0">
            <label className={filterLabelClass}>City</label>
            <SearchableCitySelect
              cities={cityOptions(citiesQ.data?.data)}
              value={city}
              onChange={(v) => { setPage(1); setCity(v) }}
              loading={citiesQ.isLoading}
            />
          </div>
        </ListFilterCard>

        <ListPageMeta
          loading={listQ.isLoading}
          total={total}
          noun="building"
          error={listQ.isError ? (listQ.error as Error)?.message ?? 'Failed to load' : null}
        />

        <Table>
          <thead className="bg-surface-2">
            <tr>
              <Th className="w-[26%]">Building</Th>
              <Th className="w-[20%]">City · area</Th>
              <Th className="w-[10%] text-center">Coworking</Th>
              <Th className="w-[10%] text-center">Managed</Th>
              <Th className="w-[18%]">Website</Th>
              <Th className="w-[16%] text-center">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr><Td colSpan={6} className="list-empty">Loading…</Td></Tr>
            ) : rows.length === 0 ? (
              <Tr><Td colSpan={6} className="list-empty"><strong>No buildings</strong>Add one with “Add building”.</Td></Tr>
            ) : (
              rows.map((row) => {
                const id = rowId(row)
                const url = row.has_page ? buildingWebsiteUrl(row.slug) : ''
                return (
                  <Tr key={id}>
                    <Td className="align-middle">
                      <button type="button" className="text-left font-medium text-ink hover:text-brand" onClick={() => navigate(`/layout/building/detail/${id}`)}>
                        {row.name}
                      </button>
                      <div className="text-xs text-muted">{row.slug}</div>
                    </Td>
                    <Td className="align-middle text-sm text-muted">
                      {[refName(row.city), refName(row.micro_location)].filter(Boolean).join(' · ') || '—'}
                    </Td>
                    <Td className="align-middle text-center">{row.coworking_count ?? 0}</Td>
                    <Td className="align-middle text-center">{row.managed_office_count ?? 0}</Td>
                    <Td className="align-middle"><WebsitePageBadge row={row} /></Td>
                    <Td className="align-middle">
                      <div className="table-actions flex-nowrap whitespace-nowrap">
                        <IconAction label="Edit" onClick={() => navigate(`/layout/building/detail/${id}`)}>
                          <PencilSquareIcon className="h-5 w-5" aria-hidden />
                        </IconAction>
                        <IconAction label="Open on website" disabled={!url} onClick={() => url && window.open(url, '_blank', 'noopener')}>
                          <ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden />
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
        title="Delete building?"
        description={confirm ? `Delete “${confirm.name}”? Its centres stay on the website; they just won't be grouped under this building any more, and the building page goes away.` : undefined}
        confirmText="Delete"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => { const id = confirm ? rowId(confirm) : ''; if (id) delMut.mutate(id) }}
      />
    </>
  )
}
