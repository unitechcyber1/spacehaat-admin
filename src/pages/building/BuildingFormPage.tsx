import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { FormSection } from '../../components/FormSection'
import { Input, Textarea } from '../../components/Input'
import { MicroLocationPicker } from '../../components/MicroLocationPicker'
import { PageShell } from '../../components/PageShell'
import { SearchableCitySelect } from '../../components/SearchableCitySelect'
import { filterLabelClass } from '../../lib/listPageUi'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import {
  getBuilding,
  refId,
  saveBuilding,
  searchBuildingCentres,
  setCentreBuilding,
  MIN_CENTRES_FOR_BUILDING_PAGE,
  type BuildingCentre,
  type BuildingDetail,
} from '../../services/building/building.service'
import { getCities } from '../../services/locations/city.service'
import { apiErrorMessage, buildingWebsiteUrl, cityOptions } from './buildingUi'
import { WebsitePageBadge } from './WebsitePageBadge'

type Form = {
  name: string
  slug: string
  city: string
  micro_location: string
  address: string
  latitude: string
  longitude: string
  image: string
  description: string
  is_active: boolean
}

const EMPTY: Form = {
  name: '',
  slug: '',
  city: '',
  micro_location: '',
  address: '',
  latitude: '',
  longitude: '',
  image: '',
  description: '',
  is_active: true,
}

function toForm(b: BuildingDetail): Form {
  return {
    name: b.name ?? '',
    slug: b.slug ?? '',
    city: refId(b.city),
    micro_location: refId(b.micro_location),
    address: b.address ?? '',
    latitude: b.latitude == null ? '' : String(b.latitude),
    longitude: b.longitude == null ? '' : String(b.longitude),
    image: b.image ?? '',
    description: b.description ?? '',
    is_active: b.is_active !== false,
  }
}

const TYPE_LABEL = { coworking: 'Coworking', managed_office: 'Managed office' } as const

function centreEditPath(c: BuildingCentre) {
  return c.type === 'coworking' ? `/layout/coworking/spaces/detail/${c.id}` : `/layout/managed-office/detail/${c.id}`
}

function CentreLine({ c, action }: { c: BuildingCentre; action: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <a href={centreEditPath(c)} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-brand">
          {c.name}
        </a>
        <div className="text-xs text-muted">
          {TYPE_LABEL[c.type]}
          {[c.area, c.city].filter(Boolean).length ? ` · ${[c.area, c.city].filter(Boolean).join(', ')}` : ''}
          {c.live ? '' : ` · not live (${c.status || 'unknown'})`}
        </div>
        {c.address ? <div className="text-xs text-slate-400">{c.address}</div> : null}
      </div>
      {action}
    </li>
  )
}

export function BuildingFormPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const detailQ = useQuery({ queryKey: ['building', buildingId], queryFn: () => getBuilding(buildingId!), enabled: Boolean(buildingId) })
  if (buildingId && detailQ.isLoading) return <PageShell title="Edit building"><p className="text-sm text-slate-600">Loading…</p></PageShell>
  if (buildingId && !detailQ.data) return <PageShell title="Edit building"><p className="text-sm text-rose-600">Could not load this building.</p></PageShell>
  // Fresh form state per building (and for "Add").
  return <BuildingEditor key={buildingId ?? 'new'} buildingId={buildingId} b={detailQ.data} />
}

function BuildingEditor({ buildingId, b }: { buildingId?: string; b?: BuildingDetail }) {
  const isEdit = Boolean(buildingId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(() => (b ? toForm(b) : EMPTY))
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const citiesQ = useQuery({ queryKey: ['cities', 'all'], queryFn: () => getCities({ limit: 200_000 }), staleTime: 300_000 })

  const saveMut = useMutation({
    mutationFn: () =>
      saveBuilding(
        {
          name: form.name.trim(),
          ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
          city: form.city || undefined,
          micro_location: form.micro_location || undefined,
          address: form.address,
          latitude: form.latitude === '' ? null : Number(form.latitude),
          longitude: form.longitude === '' ? null : Number(form.longitude),
          image: form.image,
          description: form.description,
          is_active: form.is_active,
        },
        buildingId,
      ),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['buildings'] })
      qc.setQueryData(['building', saved.id], saved)
      toast.success(isEdit ? 'Building saved' : 'Building added. Now add its centres below.')
      if (!isEdit) navigate(`/layout/building/detail/${saved.id}`, { replace: true })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Save failed')),
  })

  // Centres
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 350)
  const [onlyThisCity, setOnlyThisCity] = useState(true)
  const searchCity = onlyThisCity ? refId(b?.city) : ''
  const searchQ = useQuery({
    queryKey: ['building-centre-search', debouncedQ, searchCity],
    queryFn: () => searchBuildingCentres(debouncedQ, searchCity),
    enabled: isEdit && debouncedQ.trim().length >= 2,
  })

  const linkMut = useMutation({
    mutationFn: ({ c, add }: { c: BuildingCentre; add: boolean }) => setCentreBuilding(c.type, c.id, add ? buildingId! : null),
    onSuccess: (_d, { c, add }) => {
      toast.success(add ? `${c.name} added` : `${c.name} removed`)
      qc.invalidateQueries({ queryKey: ['building', buildingId] })
      qc.invalidateQueries({ queryKey: ['building-centre-search'] })
      qc.invalidateQueries({ queryKey: ['buildings'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not update the centre')),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return void toast.error('Name is required.')
    if (!form.city) return void toast.error('Pick the city.')
    saveMut.mutate()
  }

  const centres = b?.centres ?? []
  const linkedIds = new Set(centres.map((c) => `${c.type}:${c.id}`))
  const results = (searchQ.data ?? []).filter((c) => !linkedIds.has(`${c.type}:${c.id}`))
  const url = b?.has_page ? buildingWebsiteUrl(b.slug) : ''
  const cities = cityOptions(citiesQ.data?.data)

  return (
    <PageShell
      title={isEdit ? `Edit building: ${b?.name ?? ''}` : 'Add building'}
      description="An office building (e.g. JMD Megapolis) that holds coworking spaces and managed offices."
      actions={
        <div className="flex gap-2">
          {url ? (
            <Button variant="secondary" onClick={() => window.open(url, '_blank', 'noopener')}>View on website</Button>
          ) : null}
          <Button variant="secondary" onClick={() => navigate('/layout/building')}>Back to list</Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="form-page">
        <FormSection title="Building details" description="Shown on the building page. City and area also decide where the building is listed.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={filterLabelClass} htmlFor="b-name">Name <span className="text-expired">*</span></label>
              <Input id="b-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. JMD Megapolis" required />
            </div>
            <div>
              <label className={filterLabelClass} htmlFor="b-slug">Website address (slug)</label>
              <Input id="b-slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="Made from name + city if left empty" />
              <p className="mt-1 text-[11px] text-slate-500">
                spacewallah.com/building/{form.slug || '…'}
                {isEdit ? ' · Changing it breaks links to the old address, so avoid it once the page is live.' : ''}
              </p>
            </div>
            <div>
              <label className={filterLabelClass}>City <span className="text-expired">*</span></label>
              <SearchableCitySelect
                cities={cities}
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v, micro_location: v === f.city ? f.micro_location : '' }))}
                loading={citiesQ.isLoading}
                emptyLabel="Select city"
              />
            </div>
            <div>
              <label className={filterLabelClass}>Area (micro-location)</label>
              <MicroLocationPicker cityId={form.city || null} value={form.micro_location} onChange={(v) => set('micro_location', v)} disabled={!form.city} />
            </div>
            <div className="sm:col-span-2">
              <label className={filterLabelClass} htmlFor="b-address">Address</label>
              <Input id="b-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street address of the building" />
            </div>
            <div>
              <label className={filterLabelClass} htmlFor="b-lat">Latitude</label>
              <Input id="b-lat" type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="e.g. 28.4227" />
            </div>
            <div>
              <label className={filterLabelClass} htmlFor="b-lng">Longitude</label>
              <Input id="b-lng" type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="e.g. 77.0447" />
              <p className="mt-1 text-[11px] text-slate-500">Used for the map link and “nearby buildings”. Copy from Google Maps (right-click the building).</p>
            </div>
            <div className="sm:col-span-2">
              <label className={filterLabelClass} htmlFor="b-image">Photo URL (optional)</label>
              <Input id="b-image" value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="Without one, the website uses a centre's photo" />
            </div>
            <div className="sm:col-span-2">
              <label className={filterLabelClass} htmlFor="b-desc">Description (optional)</label>
              <Textarea id="b-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Show on website (untick to hide the building page)
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="primary" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : isEdit ? 'Save building' : 'Add building'}
            </Button>
          </div>
        </FormSection>
      </form>

      {isEdit && b ? (
        <div className="form-page mt-6">
        <FormSection
          title={`Centres in this building (${centres.length})`}
          description={`Coworking spaces and managed offices inside ${b.name}. Changes save at once. The website shows the building page with ${MIN_CENTRES_FOR_BUILDING_PAGE} or more live centres; it can take up to an hour to update.`}
        >
          <div className="mb-3"><WebsitePageBadge row={b} /></div>
          {centres.length ? (
            <ul className="divide-y divide-slate-100">
              {centres.map((c) => (
                <CentreLine
                  key={`${c.type}:${c.id}`}
                  c={c}
                  action={
                    <Button size="sm" variant="danger" disabled={linkMut.isPending} onClick={() => linkMut.mutate({ c, add: false })}>
                      Remove
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No centres yet. Search below to add them.</p>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <label className={filterLabelClass} htmlFor="centre-search">Add a coworking space or managed office</label>
            <Input id="centre-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a centre name, e.g. Awfis JMD" />
            {refId(b.city) ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={onlyThisCity} onChange={(e) => setOnlyThisCity(e.target.checked)} />
                Only centres in this building's city
              </label>
            ) : null}
            {debouncedQ.trim().length >= 2 ? (
              searchQ.isLoading ? (
                <p className="mt-3 text-sm text-slate-500">Searching…</p>
              ) : results.length ? (
                <ul className="mt-2 divide-y divide-slate-100">
                  {results.map((c) => (
                    <CentreLine
                      key={`${c.type}:${c.id}`}
                      c={c}
                      action={
                        <div className="flex items-center gap-3">
                          {c.building_name ? <span className="text-xs text-amber-700">Now in {c.building_name}</span> : null}
                          <Button size="sm" variant="primary" disabled={linkMut.isPending} onClick={() => linkMut.mutate({ c, add: true })}>
                            {c.building_id ? 'Move here' : 'Add'}
                          </Button>
                        </div>
                      }
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No matching centres.</p>
              )
            ) : null}
          </div>
        </FormSection>
        </div>
      ) : null}
    </PageShell>
  )
}
