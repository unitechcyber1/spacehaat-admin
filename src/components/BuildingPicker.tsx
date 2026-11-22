import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from './Button'
import { SearchableCitySelect } from './SearchableCitySelect'
import { apiErrorMessage } from '../pages/building/buildingUi'
import {
  getBuildings,
  getCentreBuilding,
  refName,
  setCentreBuilding,
  type CentreType,
} from '../services/building/building.service'

/**
 * "Which office building is this centre in?" for the coworking and managed office forms.
 * Saves immediately (separate from the form's Save button). Buildings with 2+ live centres get a
 * page on the website.
 */
export function BuildingPicker({ type, id }: { type: CentreType; id: string }) {
  const qc = useQueryClient()
  const currentQ = useQuery({ queryKey: ['centre-building', type, id], queryFn: () => getCentreBuilding(type, id) })
  const buildingsQ = useQuery({
    queryKey: ['buildings', 'all'],
    queryFn: () => getBuildings({ all: true }),
    staleTime: 60_000,
  })
  const [choice, setChoice] = useState<string | null>(null)

  const options = useMemo(
    () =>
      (buildingsQ.data?.data ?? []).map((b) => ({
        id: String(b.id ?? b._id),
        name: [b.name, refName(b.city)].filter(Boolean).join(' · '),
      })),
    [buildingsQ.data],
  )

  const current = currentQ.data?.building ?? null
  const selected = choice ?? current?.id ?? ''

  const saveMut = useMutation({
    mutationFn: (buildingId: string | null) => setCentreBuilding(type, id, buildingId),
    onSuccess: (data) => {
      qc.setQueryData(['centre-building', type, id], data)
      qc.invalidateQueries({ queryKey: ['buildings'] })
      setChoice(null)
      toast.success(data.building ? `Saved: in ${data.building.name}` : 'Removed from the building')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save the building')),
  })

  const changed = selected !== (current?.id ?? '')

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-semibold text-slate-700">Office building</p>
      <p className="mt-1 text-sm text-slate-600">
        {currentQ.isLoading ? (
          'Loading…'
        ) : current ? (
          <>
            In <Link to={`/layout/building/detail/${current.id}`} className="font-medium text-brand hover:underline">{current.name}</Link>
          </>
        ) : (
          'Not in a building.'
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="min-w-[16rem] flex-1">
          <SearchableCitySelect
            cities={options}
            value={selected}
            onChange={setChoice}
            loading={buildingsQ.isLoading}
            emptyLabel="No building"
            searchPlaceholder="Search buildings…"
            noMatchText="No buildings match."
          />
        </div>
        <Button size="sm" variant="primary" disabled={!changed || saveMut.isPending} onClick={() => saveMut.mutate(selected || null)}>
          {saveMut.isPending ? 'Saving…' : 'Save building'}
        </Button>
        <Link to="/layout/building/add" target="_blank" className="text-xs text-brand hover:underline">
          + New building
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Saves on its own. Buildings with 2 or more live centres get a page on the website.
      </p>
    </div>
  )
}
