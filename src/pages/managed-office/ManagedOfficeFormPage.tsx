import { useCallback, useEffect, useRef, useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { MicroLocationPicker } from '../../components/MicroLocationPicker'
import { PageShell } from '../../components/PageShell'
import { RichTextEditor } from '../../components/RichTextEditor'
import { Table, Td, Th, Tr } from '../../components/Table'
import { env } from '../../lib/env'
import { HOUR_OPTIONS } from '../../lib/hourOptions'
import { cn } from '../../lib/ui'
import { getBrands } from '../../services/brand/brand.service'
import { getActivePlanCategories } from '../../services/coworking/activePlanCategories.service'
import { getAmenities, type Amenity } from '../../services/coworking/amenity.service'
import { getCountries } from '../../services/locations/country.service'
import { getStatesByCountry } from '../../services/locations/state.service'
import { getCitiesByCountryOnly, getCitiesByState } from '../../services/locations/city.service'
import {
  getManagedOfficeById,
  saveManagedOffice,
  updateManagedOfficeSlug,
} from '../../services/managed-office/managedOffice.service'
import { uploadAdminFile } from '../../services/upload/upload.service'
import { deleteS3File, saveUploadImageMeta } from '../../services/workspace/workspace.service'
import { WEEKDAYS } from '../coworking/CoworkingSpaceDetailPage/workspaceFormModel'
import {
  buildManagedOfficeSavePayload,
  CENTRE_TYPES,
  emptyManagedOffice,
  emptyPlan,
  MANAGED_OFFICE_STATUSES,
  normalizeManagedOfficeFromApi,
  PLAN_DURATIONS,
  SEAT_TYPES,
} from './managedOfficeFormModel'

type Mo = Record<string, any>
type SeoBlock = 'seo' | 'new_seo'
type SeoImageTarget = { block: SeoBlock; field: 'twitter' | 'open_graph' }

const LIST_PATH = '/layout/managed-office'
const selectClass =
  'mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500'
const labelClass = 'text-xs font-semibold text-slate-700'
const textareaClass = 'min-h-[72px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200'
const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-violet-600'

function section(title: string, children: React.ReactNode, hint?: string) {
  return (
    <section className="space-y-4 rounded-2xl bg-surface p-6 ring-1 ring-slate-200/70">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

function field(label: string, children: React.ReactNode, className?: string) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function numberValue(v: unknown) {
  return v === undefined || v === null ? '' : String(v)
}

export function ManagedOfficeFormPage() {
  const { managedOfficeId } = useParams<{ managedOfficeId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !managedOfficeId
  const title = isNew ? 'Add managed office' : 'Edit managed office'
  const galleryRef = useRef<HTMLInputElement>(null)
  const seoImgRef = useRef<HTMLInputElement>(null)
  const [seoImgTarget, setSeoImgTarget] = useState<SeoImageTarget | null>(null)
  const [mo, setMo] = useState<Mo | null>(null)
  const [indexFlags, setIndexFlags] = useState<Record<SeoBlock, boolean>>({ seo: true, new_seo: true })
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  const detailQ = useQuery({
    queryKey: ['managed-office', managedOfficeId],
    queryFn: () => getManagedOfficeById(managedOfficeId!),
    enabled: !isNew,
  })

  const mastersQ = useQuery({
    queryKey: ['managed-office-form-masters'],
    queryFn: async () => {
      const [amRes, brandRes, catRes] = await Promise.all([
        getAmenities({}),
        getBrands({ dropdown: 1, limit: 1000 }),
        getActivePlanCategories(),
      ])
      const amenities = (amRes.data ?? []).filter(
        (a: Amenity & { for_office?: boolean }) => a.for_office === true || a.for_coWorking === true,
      )
      const brands = [...(brandRes.data ?? [])].sort((a: any, b: any) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }),
      )
      return { amenities, brands, planCategories: catRes.data ?? [] }
    },
    staleTime: 60_000,
  })

  const countriesQ = useQuery({
    queryKey: ['managed-office-form-countries'],
    queryFn: async () => (await getCountries({ limit: 100_000 })).data ?? [],
    staleTime: 5 * 60_000,
  })

  const loc = (mo?.location ?? {}) as Mo
  const countryId = loc.country as string
  const stateId = loc.state as string
  const cityId = loc.city as string

  const statesQ = useQuery({
    queryKey: ['states', countryId],
    queryFn: () => getStatesByCountry(countryId),
    enabled: !!countryId,
  })

  const citiesQ = useQuery({
    queryKey: ['cities-managed-office', stateId, countryId],
    queryFn: () => (stateId ? getCitiesByState(stateId) : getCitiesByCountryOnly(countryId)),
    enabled: !!countryId,
  })

  useEffect(() => {
    if (!isNew && detailQ.data?.data) {
      const n = normalizeManagedOfficeFromApi(JSON.parse(JSON.stringify(detailQ.data.data)))
      setMo(n)
      setIndexFlags({
        seo: (n.seo?.robots ?? 'index, follow') === 'index, follow',
        new_seo: (n.new_seo?.robots ?? 'index, follow') === 'index, follow',
      })
    }
  }, [isNew, detailQ.data])

  useEffect(() => {
    if (isNew) setMo((prev) => prev ?? emptyManagedOffice())
  }, [isNew])

  const patch = useCallback((p: Mo) => setMo((m) => (m ? { ...m, ...p } : m)), [])
  const patchIn = useCallback(
    (key: string, p: Mo) => setMo((m) => (m ? { ...m, [key]: { ...(m[key] ?? {}), ...p } } : m)),
    [],
  )
  const setLoc = useCallback((p: Mo) => patchIn('location', p), [patchIn])

  const saveMut = useMutation({
    mutationFn: (form: Mo) => saveManagedOffice(buildManagedOfficeSavePayload(form)),
    onSuccess: (res) => {
      const saved = res?.data as Mo | undefined
      const id = String(saved?.id ?? saved?._id ?? mo?.id ?? '')
      toast.success('Managed office saved')
      qc.invalidateQueries({ queryKey: ['managed-offices'] })
      if (saved) setMo(normalizeManagedOfficeFromApi(JSON.parse(JSON.stringify(saved))))
      if (isNew && id) navigate(`${LIST_PATH}/detail/${id}`, { replace: true })
      else if (id) qc.invalidateQueries({ queryKey: ['managed-office', id] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const slugMut = useMutation({
    mutationFn: () => updateManagedOfficeSlug({ id: mo!.id, slug: mo!.slug }),
    onSuccess: (res) => {
      if (res?.data?.slug) patch({ slug: res.data.slug })
      toast.success('Slug updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Slug update failed'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mo) return
    if (!mo.name?.trim()) {
      toast.error('Name is required.')
      return
    }
    if (!mo.location?.city) {
      toast.error('City is required in the location section.')
      return
    }
    const next = { ...mo }
    for (const block of ['seo', 'new_seo'] as const) {
      next[block] = { ...next[block], robots: indexFlags[block] ? 'index, follow' : 'noindex, nofollow' }
    }
    saveMut.mutate(next)
  }

  function onPreview() {
    if (mo?.status !== 'approve') {
      toast.error('Enable the managed office before preview.')
      return
    }
    const base = env.websitePath.replace(/\/$/, '')
    if (!base || !mo.slug) {
      toast.error(mo.slug ? 'Set VITE_WEBSITE_URL to your public site for preview.' : 'Add a slug before preview.')
      return
    }
    window.open(`${base}/managed-office/${mo.slug}`, '_blank', 'noopener,noreferrer')
  }

  // ---- gallery
  const renumber = (list: Mo[]) => list.map((row, i) => ({ ...row, order: i + 1 }))

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      const rows: Mo[] = []
      for (const f of files) {
        const up = await uploadAdminFile(f)
        if (!up?.id) throw new Error('Upload missing id')
        rows.push({ order: 0, image: { ...up, real_name: up.real_name ?? up.name ?? '', title: up.title ?? '' } })
      }
      setMo((m) => (m ? { ...m, images: renumber([...rows, ...(m.images ?? [])]) } : m))
      toast.success(`${rows.length} image${rows.length > 1 ? 's' : ''} uploaded`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function moveImage(from: number, to: number) {
    setMo((m) => {
      if (!m) return m
      const list = [...(m.images ?? [])]
      if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return m
      const [row] = list.splice(from, 1)
      list.splice(to, 0, row)
      return { ...m, images: renumber(list) }
    })
  }

  async function removeImage(idx: number) {
    const slot = (mo?.images ?? [])[idx]
    if (slot?.image && typeof slot.image === 'object') {
      try {
        await deleteS3File(slot.image)
      } catch {
        toast.error('Could not delete file from storage')
      }
    }
    setMo((m) => (m ? { ...m, images: renumber((m.images ?? []).filter((_: unknown, i: number) => i !== idx)) } : m))
  }

  function patchImage(idx: number, p: Mo) {
    setMo((m) => {
      if (!m) return m
      const images = [...(m.images ?? [])]
      if (!images[idx]?.image) return m
      images[idx] = { ...images[idx], image: { ...images[idx].image, ...p } }
      return { ...m, images }
    })
  }

  async function saveImageMeta(idx: number) {
    const img = mo?.images?.[idx]?.image
    if (!img?.id) return
    try {
      await saveUploadImageMeta(img)
      toast.success('Image name and alt saved')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed')
    }
  }

  async function onSeoImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !seoImgTarget) return
    try {
      const up = await uploadAdminFile(f)
      if (!up?.id) throw new Error('Upload missing id')
      const { block, field: key } = seoImgTarget
      setMo((m) =>
        m
          ? { ...m, [block]: { ...m[block], [key]: { ...(m[block]?.[key] ?? {}), image: { id: up.id, s3_link: up.s3_link } } } }
          : m,
      )
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
    setSeoImgTarget(null)
  }

  // ---- list helpers
  function patchListItem(key: 'plans', idx: number, p: Mo) {
    setMo((m) => {
      if (!m) return m
      const list = [...(m[key] ?? [])]
      list[idx] = { ...list[idx], ...p }
      return { ...m, [key]: list }
    })
  }

  function patchFloor(idx: number, p: Mo) {
    setMo((m) => {
      if (!m) return m
      const floors = [...(m.building?.floors ?? [])]
      floors[idx] = { ...floors[idx], ...p }
      return { ...m, building: { ...m.building, floors } }
    })
  }

  function patchHour(day: string, p: Mo) {
    setMo((m) => (m ? { ...m, hours_of_operation: { ...m.hours_of_operation, [day]: { ...(m.hours_of_operation?.[day] ?? {}), ...p } } } : m))
  }

  function toggleAmenity(a: Amenity) {
    setMo((m) => {
      if (!m) return m
      const list = [...(m.amenties ?? [])]
      const i = list.findIndex((x: Mo) => x.id === a.id)
      if (i >= 0) list.splice(i, 1)
      else list.push({ id: a.id, name: a.name })
      return { ...m, amenties: list }
    })
  }

  // ---- render states
  if (!isNew && detailQ.isLoading) {
    return (
      <PageShell title={title} description="Loading…">
        <p className="text-sm text-slate-600">Loading managed office…</p>
      </PageShell>
    )
  }
  if ((!isNew && detailQ.isError) || mastersQ.isError) {
    return (
      <PageShell title={title} description="Error">
        <p className="text-rose-600">
          {mastersQ.isError ? 'Could not load brands, amenities or plan categories.' : 'Could not load this managed office.'}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate(LIST_PATH)}>
          Back to list
        </Button>
      </PageShell>
    )
  }
  if (!mo || mastersQ.isLoading) {
    return (
      <PageShell title={title} description="Preparing form…">
        <p className="text-sm text-slate-600">Loading reference data…</p>
      </PageShell>
    )
  }

  const masters = mastersQ.data!
  const states = statesQ.data?.data ?? []
  const cities = citiesQ.data?.data ?? []
  const building = mo.building ?? {}
  const lease = mo.lease_terms ?? {}
  const rating = mo.rating ?? {}
  const sourceAmenities = (mo.source?.amenities ?? []) as Mo[]

  function renderSeo(block: SeoBlock) {
    const s = mo![block] ?? {}
    const setBlock = (p: Mo) => patchIn(block, p)
    const social = (key: 'twitter' | 'open_graph', label: string, tone: string) => (
      <div className={cn('space-y-3 rounded-xl p-4 ring-1', tone)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{label}</p>
        <Input placeholder={`${label} title`} value={s[key]?.title ?? ''} onChange={(e) => setBlock({ [key]: { ...s[key], title: e.target.value } })} />
        <textarea
          className={textareaClass}
          placeholder={`${label} description`}
          value={s[key]?.description ?? ''}
          onChange={(e) => setBlock({ [key]: { ...s[key], description: e.target.value } })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSeoImgTarget({ block, field: key })
              seoImgRef.current?.click()
            }}
          >
            {label} image
          </Button>
          {s[key]?.image?.s3_link ? <img src={s[key].image.s3_link} alt="" className="h-12 rounded-md ring-1 ring-slate-200" /> : null}
          <Button type="button" variant="ghost" className="text-slate-600" onClick={() => setBlock({ [key]: { ...s[key], image: null } })}>
            Clear image
          </Button>
        </div>
      </div>
    )
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={indexFlags[block]}
              onChange={(e) => setIndexFlags((f) => ({ ...f, [block]: e.target.checked }))}
            />
            Allow indexing
          </label>
          <Input placeholder="Meta title" value={s.title ?? ''} onChange={(e) => setBlock({ title: e.target.value })} />
          <Input placeholder="Keywords" value={s.keywords ?? ''} onChange={(e) => setBlock({ keywords: e.target.value })} />
          <textarea
            className={cn(textareaClass, 'min-h-[80px] sm:col-span-2')}
            placeholder="Meta description"
            value={s.description ?? ''}
            onChange={(e) => setBlock({ description: e.target.value })}
          />
        </div>
        {social('twitter', 'Twitter', 'bg-sky-50/50 ring-sky-100')}
        {social('open_graph', 'Open Graph', 'bg-indigo-50/50 ring-indigo-100')}
      </div>
    )
  }

  return (
    <PageShell
      title={title}
      description="Edit managed office details, location, seat plans, building, gallery, amenities and SEO."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
            Back to list
          </Button>
          {mo.id ? (
            <>
              <Button variant="secondary" type="button" onClick={onPreview}>
                Preview
              </Button>
              <Button variant="secondary" type="button" disabled={slugMut.isPending} onClick={() => slugMut.mutate()}>
                Update slug
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <input ref={seoImgRef} type="file" accept="image/*" className="hidden" onChange={onSeoImagePick} />

        {section('Managed office details', (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {field('Name *', <Input value={mo.name ?? ''} onChange={(e) => patch({ name: e.target.value })} required />)}
            {field(
              'Slug',
              <Input
                value={mo.slug ?? ''}
                placeholder={isNew ? 'Generated from the name if empty' : ''}
                onChange={(e) => patch({ slug: e.target.value })}
              />,
            )}
            {field(
              'Brand',
              <select className={selectClass} value={mo.brand ?? ''} onChange={(e) => patch({ brand: e.target.value })}>
                <option value="">Select brand…</option>
                {masters.brands.map((b: any) =>
                  b.id ? (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ) : null,
                )}
              </select>,
            )}
            {field(
              'Status',
              <select className={selectClass} value={mo.status ?? 'pending'} onChange={(e) => patch({ status: e.target.value })}>
                {MANAGED_OFFICE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'Centre type',
              <select className={selectClass} value={mo.centre_type ?? 'managed_office'} onChange={(e) => patch({ centre_type: e.target.value })}>
                {CENTRE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>,
            )}
            {field('No. of seats', <Input type="number" value={numberValue(mo.no_of_seats)} onChange={(e) => patch({ no_of_seats: e.target.value })} />)}
            <div className="flex items-end gap-6 pb-1 sm:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className={checkboxClass} checked={!!mo.is_active} onChange={(e) => patch({ is_active: e.target.checked })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className={checkboxClass} checked={!!mo.is_new_launch} onChange={(e) => patch({ is_new_launch: e.target.checked })} />
                New launch
              </label>
            </div>
            {field(
              'Description',
              <RichTextEditor contentHeightClass="h-[180px]" value={mo.description ?? ''} onChange={(html) => patch({ description: html })} placeholder="Describe the office…" />,
              'sm:col-span-2 lg:col-span-3',
            )}
            {field(
              'New description',
              <RichTextEditor contentHeightClass="h-[180px]" value={mo.new_description ?? ''} onChange={(html) => patch({ new_description: html })} placeholder="Rewritten description (shown first on the website)…" />,
              'sm:col-span-2 lg:col-span-3',
            )}
          </div>
        ))}

        {section('Location', (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {field(
              'Country',
              <select className={selectClass} value={countryId ?? ''} onChange={(e) => setLoc({ country: e.target.value, state: '', city: '', micro_location: '' })}>
                <option value="">Select…</option>
                {(countriesQ.data ?? []).map((c: { id: string; name?: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'State',
              <select className={selectClass} value={stateId ?? ''} disabled={!countryId} onChange={(e) => setLoc({ state: e.target.value, city: '', micro_location: '' })}>
                <option value="">Select…</option>
                {states.map((s: { id: string; name?: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'City *',
              <select className={selectClass} value={cityId ?? ''} disabled={!countryId} onChange={(e) => setLoc({ city: e.target.value, micro_location: '' })}>
                <option value="">Select…</option>
                {cities.map((c: { id: string; name?: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'Micro-location',
              <MicroLocationPicker
                cityId={cityId}
                value={(loc.micro_location as string) ?? ''}
                onChange={(id) => setLoc({ micro_location: id })}
                disabled={!cityId}
                placeholder="Select micro-location…"
              />,
            )}
            {field(
              'Locality text',
              <Input value={loc.micro_location_string ?? ''} onChange={(e) => setLoc({ micro_location_string: e.target.value })} placeholder="Shown when no micro-location is linked" />,
            )}
            {field('Building name', <Input value={loc.building_name ?? ''} onChange={(e) => setLoc({ building_name: e.target.value })} />)}
            {field('Address', <Input value={loc.address1 ?? ''} onChange={(e) => setLoc({ address1: e.target.value })} />, 'sm:col-span-2')}
            {field('Floor', <Input value={loc.floor ?? ''} onChange={(e) => setLoc({ floor: e.target.value })} />)}
            {field('Postal code', <Input value={loc.postal_code ?? ''} onChange={(e) => setLoc({ postal_code: e.target.value })} />)}
            {field('Landmark', <Input value={loc.landmark ?? ''} onChange={(e) => setLoc({ landmark: e.target.value })} />)}
            {field('Landmark distance', <Input value={loc.landmark_distance ?? ''} onChange={(e) => setLoc({ landmark_distance: e.target.value })} />)}
            {field(
              'Latitude',
              <Input type="number" step="any" value={numberValue(loc.latitude)} onChange={(e) => setLoc({ latitude: e.target.value.trim() ? parseFloat(e.target.value) : undefined })} />,
            )}
            {field(
              'Longitude',
              <Input type="number" step="any" value={numberValue(loc.longitude)} onChange={(e) => setLoc({ longitude: e.target.value.trim() ? parseFloat(e.target.value) : undefined })} />,
            )}
            <label className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm sm:col-span-2 lg:col-span-3">
              <input type="checkbox" className={checkboxClass} checked={!!loc.is_near_metro} onChange={(e) => setLoc({ is_near_metro: e.target.checked })} />
              Near metro
            </label>
            {loc.is_near_metro ? (
              <div className="grid gap-4 rounded-xl bg-violet-50/50 p-4 ring-1 ring-violet-100 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
                {field('Metro station', <Input value={loc.metro_stop_landmark ?? ''} onChange={(e) => setLoc({ metro_stop_landmark: e.target.value })} placeholder="e.g. Cyber City, Rapid Metro" />)}
                {field('Distance', <Input value={loc.metro_stop_distance ?? ''} onChange={(e) => setLoc({ metro_stop_distance: e.target.value })} placeholder="e.g. 800 m" />)}
              </div>
            ) : null}
          </div>
        ))}

        {section(
          'Seat plans',
          <div className="space-y-4">
            <Button type="button" variant="secondary" onClick={() => patch({ plans: [...(mo.plans ?? []), emptyPlan()] })}>
              Add plan
            </Button>
            {(mo.plans ?? []).length === 0 ? <p className="text-sm text-slate-500">No plans yet.</p> : null}
            {(mo.plans ?? []).map((p: Mo, idx: number) => (
              <div key={p._id ?? idx} className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-6">
                {field(
                  'Seat type',
                  <select className={selectClass} value={p.seat_type ?? ''} onChange={(e) => patchListItem('plans', idx, { seat_type: e.target.value })}>
                    {SEAT_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>,
                )}
                {field(
                  'Category',
                  <select className={selectClass} value={p.category ?? ''} onChange={(e) => patchListItem('plans', idx, { category: e.target.value })}>
                    <option value="">Category…</option>
                    {masters.planCategories.map((c: any) => {
                      const cid = c._id ?? c.id
                      return cid ? (
                        <option key={cid} value={cid}>
                          {c.name}
                        </option>
                      ) : null
                    })}
                  </select>,
                )}
                {field('Price per seat (₹)', <Input type="number" value={numberValue(p.price)} onChange={(e) => patchListItem('plans', idx, { price: e.target.value })} />)}
                {field(
                  'Duration',
                  <select className={selectClass} value={p.duration ?? 'month'} onChange={(e) => patchListItem('plans', idx, { duration: e.target.value })}>
                    {PLAN_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>,
                )}
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" className={checkboxClass} checked={p.should_show !== false} onChange={(e) => patchListItem('plans', idx, { should_show: e.target.checked })} />
                  Show on website
                </label>
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-700"
                    onClick={() => patch({ plans: (mo.plans ?? []).filter((_: unknown, i: number) => i !== idx) })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>,
          'A price of 0 shows as "Price on request" on the website.',
        )}

        {section('Building & lease terms', (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {field('Total floors', <Input type="number" value={numberValue(building.total_floors)} onChange={(e) => patchIn('building', { total_floors: e.target.value })} />)}
              {field('Super area (sq ft)', <Input type="number" value={numberValue(building.super_area)} onChange={(e) => patchIn('building', { super_area: e.target.value })} />)}
              {field('Total seats', <Input type="number" value={numberValue(building.total_seats)} onChange={(e) => patchIn('building', { total_seats: e.target.value })} />)}
              {field('Minimum seats', <Input type="number" value={numberValue(lease.min_seats)} onChange={(e) => patchIn('lease_terms', { min_seats: e.target.value })} />)}
              {field('Minimum lock-in (months)', <Input type="number" value={numberValue(lease.min_duration_months)} onChange={(e) => patchIn('lease_terms', { min_duration_months: e.target.value })} />)}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Floors on offer</p>
                <Button type="button" variant="secondary" onClick={() => patchIn('building', { floors: [...(building.floors ?? []), { floor_number: '', area: '', seats: '' }] })}>
                  Add floor
                </Button>
              </div>
              {(building.floors ?? []).map((f: Mo, idx: number) => (
                <div key={f._id ?? idx} className="grid items-end gap-3 sm:grid-cols-4">
                  {field('Floor no.', <Input type="number" value={numberValue(f.floor_number)} onChange={(e) => patchFloor(idx, { floor_number: e.target.value })} />)}
                  {field('Area (sq ft)', <Input type="number" value={numberValue(f.area)} onChange={(e) => patchFloor(idx, { area: e.target.value })} />)}
                  {field('Seats', <Input type="number" value={numberValue(f.seats)} onChange={(e) => patchFloor(idx, { seats: e.target.value })} />)}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-700"
                    onClick={() => patchIn('building', { floors: (building.floors ?? []).filter((_: unknown, i: number) => i !== idx) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {section('Rating', (
          <div className="grid gap-4 sm:grid-cols-3">
            {field('Source', <Input value={rating.source ?? ''} placeholder="e.g. GOOGLE" onChange={(e) => patchIn('rating', { source: e.target.value })} />)}
            {field('Average rating', <Input type="number" step="0.1" value={numberValue(rating.average)} onChange={(e) => patchIn('rating', { average: e.target.value })} />)}
            {field('Number of ratings', <Input type="number" value={numberValue(rating.total)} onChange={(e) => patchIn('rating', { total: e.target.value })} />)}
          </div>
        ))}

        {section('Hours of operation', (
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200/80">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/90">
                <tr>
                  {['Day', 'Open', '24h', 'From', 'To'].map((h) => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((day) => {
                  const h = mo.hours_of_operation?.[day] ?? {}
                  const open = !!h.should_show && !h.is_closed
                  const open24 = !!h.is_open_24
                  const hourSelect = (key: 'from' | 'to', fallback: string) => (
                    <select
                      className="w-full max-w-[140px] rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200"
                      disabled={!open || open24}
                      value={HOUR_OPTIONS.some((o) => o.value === h[key]) ? h[key] : fallback}
                      onChange={(e) => patchHour(day, { [key]: e.target.value })}
                    >
                      {HOUR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )
                  return (
                    <tr key={day} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium capitalize text-slate-800">{day}</td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className={checkboxClass}
                          checked={open}
                          onChange={(e) => patchHour(day, { should_show: e.target.checked, is_closed: !e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input type="checkbox" className={checkboxClass} checked={open24} disabled={!open} onChange={(e) => patchHour(day, { is_open_24: e.target.checked })} />
                      </td>
                      <td className="px-3 py-2">{hourSelect('from', '09:00 AM')}</td>
                      <td className="px-3 py-2">{hourSelect('to', '08:00 PM')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        {section('Gallery', (
          <div className="space-y-4">
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryPick} />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <Button type="button" variant="secondary" disabled={uploading} onClick={() => galleryRef.current?.click()}>
                {uploading ? 'Uploading…' : 'Upload images'}
              </Button>
              <p className="text-xs text-slate-500">
                {(mo.images ?? []).length} image{(mo.images ?? []).length === 1 ? '' : 's'}. Drag the handle to reorder (first = main image).
              </p>
            </div>
            {(mo.images ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No images yet.</p>
            ) : (
              <Table className="shadow-none ring-0">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <Th className="w-12">
                      <span className="sr-only">Reorder</span>
                    </Th>
                    <Th>Order</Th>
                    <Th>Preview</Th>
                    <Th>Name</Th>
                    <Th>Alt</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {(mo.images ?? []).map((slot: Mo, i: number) => (
                    <Tr
                      key={slot?.image?.id ? String(slot.image.id) : `img-${i}`}
                      className={cn(
                        dragOver === i && dragFrom !== null && dragFrom !== i && 'bg-violet-50/90 ring-1 ring-inset ring-violet-300',
                        dragFrom === i && 'opacity-70',
                      )}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragFrom !== null) setDragOver(i)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const from = Number(e.dataTransfer.getData('text/plain'))
                        if (!Number.isNaN(from)) moveImage(from, i)
                        setDragFrom(null)
                        setDragOver(null)
                      }}
                    >
                      <Td className="w-12 align-middle">
                        <button
                          type="button"
                          draggable
                          aria-label={`Drag to reorder image ${i + 1}`}
                          className="cursor-grab rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(i))
                            e.dataTransfer.effectAllowed = 'move'
                            setDragFrom(i)
                          }}
                          onDragEnd={() => {
                            setDragFrom(null)
                            setDragOver(null)
                          }}
                        >
                          <Bars3Icon className="h-5 w-5" aria-hidden />
                        </button>
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-slate-800">{slot.order ?? i + 1}</Td>
                      <Td>
                        {slot.image?.s3_link ? (
                          <img src={slot.image.s3_link} alt={slot.image.title || ''} className="h-16 w-28 rounded-lg object-cover ring-1 ring-slate-200" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td className="min-w-[140px]">
                        <Input className="text-xs" placeholder="Name" value={slot.image?.real_name ?? ''} disabled={!slot.image} onChange={(e) => patchImage(i, { real_name: e.target.value })} />
                      </Td>
                      <Td className="min-w-[180px]">
                        <Input className="text-xs" placeholder="Alt text" value={slot.image?.title ?? ''} disabled={!slot.image} onChange={(e) => patchImage(i, { title: e.target.value })} />
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" disabled={i === 0} onClick={() => moveImage(i, i - 1)}>
                            Up
                          </Button>
                          <Button type="button" variant="secondary" disabled={i === (mo.images ?? []).length - 1} onClick={() => moveImage(i, i + 1)}>
                            Down
                          </Button>
                          <Button type="button" variant="secondary" disabled={!slot.image?.id} onClick={() => saveImageMeta(i)}>
                            Save name & alt
                          </Button>
                          <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeImage(i)}>
                            Remove
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        ))}

        {section(
          'Amenities',
          <div className="flex max-h-64 flex-wrap gap-3 overflow-y-auto rounded-xl bg-slate-50/80 p-4">
            {masters.amenities.map((a: Amenity) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={(mo.amenties ?? []).some((x: Mo) => x.id === a.id)}
                  onChange={() => toggleAmenity(a)}
                />
                {a.name}
              </label>
            ))}
          </div>,
          sourceAmenities.length
            ? `The imported data lists ${sourceAmenities.length} amenities that are not linked yet (${sourceAmenities.flatMap((a) => a.details ?? []).filter(Boolean).join(', ') || 'no names in the source'}).`
            : undefined,
        )}

        {section('SEO', renderSeo('seo'))}
        {section('New SEO', renderSeo('new_seo'))}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(LIST_PATH)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save managed office'}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
