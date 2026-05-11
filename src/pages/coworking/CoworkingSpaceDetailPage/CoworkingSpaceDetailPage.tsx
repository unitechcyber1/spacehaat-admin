import { useCallback, useEffect, useRef, useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { MicroLocationPicker } from '../../../components/MicroLocationPicker'
import { PageShell } from '../../../components/PageShell'
import { RichTextEditor } from '../../../components/RichTextEditor'
import { Table, Td, Th, Tr } from '../../../components/Table'
import { cn } from '../../../lib/ui'
import { buildCoworkingListingPreviewUrl } from '../../../lib/coworkingPreviewUrl'
import { getActivePlanCategories } from '../../../services/coworking/activePlanCategories.service'
import type { Amenity } from '../../../services/coworking/amenity.service'
import { getAmenities } from '../../../services/coworking/amenity.service'
import { buildWorkspaceSavePayload } from '../../../services/coworking/workspacePayload'
import {
  getWorkspaceById,
  saveWorkspace,
  updateWorkspaceSlug,
} from '../../../services/coworking/workspaces.service'
import { getBrands } from '../../../services/brand/brand.service'
import { getCountries } from '../../../services/locations/country.service'
import { getStatesByCountry } from '../../../services/locations/state.service'
import { getCitiesByCountryOnly, getCitiesByState } from '../../../services/locations/city.service'
import { uploadAdminFile } from '../../../services/upload/upload.service'
import { deleteS3File, saveUploadImageMeta } from '../../../services/workspace/workspace.service'
import { HOUR_OPTIONS } from '../../../lib/hourOptions'
import {
  emptyWorkspace,
  mergeWorkspaceImagesAfterSave,
  normalizeWorkspaceFromApi,
  PLAN_DURATIONS,
  SPACE_TAGS,
  WEEKDAYS,
  WORKSPACE_STATUSES,
} from './workspaceFormModel'

type Ws = Record<string, any>

type SeoImageTarget =
  | { block: 'seo'; field: 'twitter' | 'open_graph' }
  | { block: 'virtualSeo'; field: 'twitter' | 'open_graph' }

function normalizeImageOrders(images: { order?: number; image?: unknown }[]) {
  return images.map((item, idx) => ({ ...item, order: idx + 1 }))
}

function section(title: string, children: React.ReactNode) {
  return (
    <section className="space-y-4 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

export function CoworkingSpaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !workspaceId
  const title = isNew ? 'Add coworking space' : 'Edit coworking space'
  const fileRef = useRef<HTMLInputElement>(null)
  const planImgRef = useRef<HTMLInputElement>(null)
  const seoImgRef = useRef<HTMLInputElement>(null)
  const [planImgIdx, setPlanImgIdx] = useState<number | null>(null)
  const [seoImgTarget, setSeoImgTarget] = useState<SeoImageTarget | null>(null)

  const [ws, setWs] = useState<Ws | null>(null)
  const [indexFlag, setIndexFlag] = useState(true)
  const [indexVirtualFlag, setIndexVirtualFlag] = useState(true)
  const [detailTab, setDetailTab] = useState<'coworking' | 'virtual'>('coworking')
  const [galleryDragFrom, setGalleryDragFrom] = useState<number | null>(null)
  const [galleryDragOver, setGalleryDragOver] = useState<number | null>(null)

  const detailQ = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspaceById(workspaceId!),
    enabled: !isNew && !!workspaceId,
  })

  const mastersQ = useQuery({
    queryKey: ['workspace-form-masters'],
    queryFn: async () => {
      const [amRes, brandRes, countryRes, catRes] = await Promise.all([
        getAmenities({}),
        getBrands({ dropdown: 1, limit: 500 }),
        getCountries({ limit: 100_000 }),
        getActivePlanCategories(),
      ])
      const amenityRows = (amRes.data ?? []).filter((a: Amenity) => a.for_coWorking === true)
      const brandRows = (brandRes.data ?? []).filter((b: { type?: string }) => b.type === 'coworking')
      return {
        amenities: amenityRows,
        brands: brandRows,
        countries: countryRes.data ?? [],
        planCategories: catRes.data ?? [],
      }
    },
    staleTime: 60_000,
  })

  const loc = (ws?.location ?? {}) as Ws
  const countryId = loc.country as string

  const statesQ = useQuery({
    queryKey: ['states', countryId],
    queryFn: () => getStatesByCountry(countryId),
    enabled: !!countryId,
  })

  const stateId = loc.state as string
  const citiesQ = useQuery({
    queryKey: ['cities-workspace', stateId, countryId],
    queryFn: () => (stateId ? getCitiesByState(stateId) : getCitiesByCountryOnly(countryId)),
    enabled: !!countryId,
  })

  const cityId = loc.city as string

  useEffect(() => {
    if (!isNew && detailQ.data?.data) {
      const raw = detailQ.data.data as Ws
      const n = normalizeWorkspaceFromApi(JSON.parse(JSON.stringify(raw)))
      setWs(n)
      setIndexFlag((n.seo as { robots?: string } | undefined)?.robots === 'index, follow')
      setIndexVirtualFlag((n.virtualSeo as { robots?: string } | undefined)?.robots === 'index, follow')
    }
  }, [isNew, detailQ.data])

  useEffect(() => {
    if (!isNew || !mastersQ.isSuccess) return
    setWs((prev) => {
      if (prev) return prev
      return { ...emptyWorkspace() } as Ws
    })
  }, [isNew, mastersQ.isSuccess])

  const setLoc = useCallback((patch: Record<string, unknown>) => {
    setWs((w) => {
      if (!w) return w
      return { ...w, location: { ...w.location, ...patch } }
    })
  }, [])

  const saveMut = useMutation({
    mutationFn: async (payload: Ws) => {
      const body = buildWorkspaceSavePayload(payload)
      if (!body.id) delete body.id
      return saveWorkspace(body)
    },
    onSuccess: (apiRes: any) => {
      const saved = apiRes?.data as Ws | undefined
      const id = saved?.id ?? ws?.id
      toast.success('Workspace saved')
      qc.invalidateQueries({ queryKey: ['coworking-spaces'] })
      if (id && !isNew) {
        qc.invalidateQueries({ queryKey: ['workspace', id] })
      }
      if (isNew && id) {
        navigate(`/layout/coworking/spaces/detail/${id}`, { replace: true })
      }
      if (saved) {
        setWs((prev) =>
          mergeWorkspaceImagesAfterSave(
            prev,
            normalizeWorkspaceFromApi(JSON.parse(JSON.stringify(saved))),
          ) as Ws,
        )
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const slugMut = useMutation({
    mutationFn: () => updateWorkspaceSlug({ id: ws!.id, slug: ws!.slug }),
    onSuccess: () => toast.success('Slug updated'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Slug update failed'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ws) return
    if (!ws.name?.trim() || !ws.slug?.trim() || !ws.brand || !ws.spaceTag) {
      toast.error('Name, slug, brand, and space tag are required.')
      return
    }
    const next = { ...ws }
    next.seo = { ...next.seo, robots: indexFlag ? 'index, follow' : 'noindex, nofollow' }
    next.virtualSeo = {
      ...next.virtualSeo,
      robots: indexVirtualFlag ? 'index, follow' : 'noindex, nofollow',
    }
    saveMut.mutate(next)
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length || !ws) return
    try {
      const slots: { order: number; image: any }[] = []
      for (const f of files) {
        const up = await uploadAdminFile(f)
        if (!up?.id) throw new Error('Upload missing id')
        const image = {
          ...up,
          real_name: up.real_name ?? up.name ?? '',
          title: up.title ?? '',
        }
        slots.push({ order: 0, image })
      }
      setWs((w) => {
        if (!w) return w
        // New uploads go at the top of the stack; `normalizeImageOrders` renumbers order 1…n in sequence.
        const existing = [...(w.images ?? [])]
        const newRows = slots.map((s) => ({ image: s.image, order: 0 }))
        const imgs = [...newRows, ...existing]
        return { ...w, images: normalizeImageOrders(imgs) }
      })
      toast.success('Images uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
  }

  async function onPlanImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || planImgIdx === null || !ws) return
    try {
      const up = await uploadAdminFile(f)
      if (!up?.id) throw new Error('Upload missing id')
      setWs((w) => {
        if (!w) return w
        const plans = [...(w.plans ?? [])]
        const p = { ...(plans[planImgIdx] ?? {}) }
        p.image = { id: up.id, s3_link: up.s3_link }
        plans[planImgIdx] = p
        return { ...w, plans }
      })
      toast.success('Plan image set')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
    setPlanImgIdx(null)
  }

  async function onSeoImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !seoImgTarget || !ws) return
    try {
      const up = await uploadAdminFile(f)
      if (!up?.id) throw new Error('Upload missing id')
      const { block, field } = seoImgTarget
      setWs((w) => {
        if (!w) return w
        const blk = { ...(w[block] ?? {}) }
        const branch = { ...(blk[field] ?? {}) }
        branch.image = {
          id: up.id,
          s3_link: up.s3_link,
          real_name: up.real_name,
          name: up.name,
        }
        blk[field] = branch
        return { ...w, [block]: blk }
      })
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
    setSeoImgTarget(null)
  }

  function moveGallery(idx: number, delta: number) {
    setWs((w) => {
      if (!w) return w
      const list = [...(w.images ?? [])]
      const j = idx + delta
      if (j < 0 || j >= list.length) return w
      const tmp = list[idx]
      list[idx] = list[j]
      list[j] = tmp
      return { ...w, images: normalizeImageOrders(list) }
    })
  }

  /** Drag-and-drop reorder (same semantics as Angular CDK `moveItemInArray`). */
  function reorderGallery(fromIndex: number, toIndex: number) {
    setWs((w) => {
      if (!w) return w
      const list = [...(w.images ?? [])]
      if (fromIndex === toIndex) return w
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return w
      const [removed] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, removed)
      return { ...w, images: normalizeImageOrders(list) }
    })
  }

  async function removeGallerySlot(idx: number) {
    const slot = (ws?.images ?? [])[idx]
    if (slot?.image && typeof slot.image === 'object') {
      try {
        await deleteS3File(slot.image)
      } catch {
        toast.error('Could not delete file from storage')
      }
    }
    setWs((w) => {
      if (!w) return w
      const list = (w.images ?? []).filter((_: unknown, i: number) => i !== idx)
      return { ...w, images: normalizeImageOrders(list) }
    })
  }

  function patchGalleryImage(idx: number, patch: Record<string, unknown>) {
    setWs((w) => {
      if (!w) return w
      const imgs = [...(w.images ?? [])]
      const slot = imgs[idx]
      if (!slot?.image) return w
      imgs[idx] = { ...slot, image: { ...slot.image, ...patch } }
      return { ...w, images: imgs }
    })
  }

  async function saveGalleryImageMeta(idx: number) {
    const img = ws?.images?.[idx]?.image
    if (!img?.id) {
      toast.error('Nothing to save for this row.')
      return
    }
    try {
      await saveUploadImageMeta(img)
      toast.success('Image name and alt saved')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed')
    }
  }

  function hourOrDefault(value: unknown, fallback: string) {
    if (typeof value !== 'string') return fallback
    const v = value.trim()
    if (!v) return fallback
    return HOUR_OPTIONS.some((o) => o.value === v) ? v : fallback
  }

  function patchHour(day: (typeof WEEKDAYS)[number], patch: Record<string, unknown>) {
    setWs((w) => {
      if (!w) return w
      const hop = { ...(w.hours_of_operation as Record<string, unknown>) }
      const cur = (hop[day] as Record<string, unknown>) ?? {}
      hop[day] = { ...cur, ...patch }
      return { ...w, hours_of_operation: hop }
    })
  }

  function toggleAmenity(a: Amenity) {
    setWs((w) => {
      if (!w) return w
      const list = [...(w.amenties ?? [])]
      const i = list.findIndex((x: any) => x.id === a.id)
      if (i >= 0) list.splice(i, 1)
      else list.push({ id: a.id, name: a.name })
      return { ...w, amenties: list }
    })
  }

  function isAmenityOn(id: string) {
    return (ws?.amenties ?? []).some((x: any) => x.id === id)
  }

  function addContact() {
    setWs((w) =>
      w
        ? {
            ...w,
            contact_details: [...(w.contact_details ?? []), { designation: '', name: '', phone_number: '' }],
          }
        : w,
    )
  }

  function removeContact(i: number) {
    setWs((w) => {
      if (!w) return w
      const cd = [...(w.contact_details ?? [])]
      cd.splice(i, 1)
      return { ...w, contact_details: cd }
    })
  }

  function addPlan() {
    setWs((w) =>
      w
        ? {
            ...w,
            plans: [
              ...(w.plans ?? []),
              {
                category: '',
                price: 0,
                seats: 1,
                duration: 'month',
                time_period: 1,
                number_of_items: 1,
                should_show: true,
              },
            ],
          }
        : w,
    )
  }

  function removePlan(i: number) {
    setWs((w) => {
      if (!w) return w
      const plans = [...(w.plans ?? [])]
      plans.splice(i, 1)
      return { ...w, plans }
    })
  }

  function onPreview() {
    if (!ws?.id) {
      toast.error('Save the workspace before preview.')
      return
    }
    if (ws.status !== 'approve') {
      toast.error('Enable the space before preview.')
      return
    }
    const url = buildCoworkingListingPreviewUrl({
      slug: ws.slug,
      country_dbname: ws.country_dbname,
    })
    if (!url) {
      if (!(ws.slug ?? '').trim()) toast.error('Add a slug before preview.')
      else
        toast.error(
          'Set VITE_WEBSITE_URL (e.g. https://spacehaat.com). For non-India spaces, set VITE_WEBSITE_URL_COUNTRY if needed.',
        )
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const states = statesQ.data?.data ?? []
  const cities = citiesQ.data?.data ?? []
  const microId =
    typeof loc.micro_location === 'string'
      ? loc.micro_location
      : loc.micro_location && typeof loc.micro_location === 'object' && 'id' in loc.micro_location
        ? String((loc.micro_location as { id: unknown }).id ?? '')
        : ''

  if (!isNew && detailQ.isLoading) {
    return (
      <PageShell title={title} description="Loading…">
        <p className="text-sm text-slate-600">Loading workspace…</p>
      </PageShell>
    )
  }

  if (!isNew && detailQ.isError) {
    return (
      <PageShell title={title} description="Error">
        <p className="text-rose-600">Could not load workspace.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/layout/coworking/spaces')}>
          Back to list
        </Button>
      </PageShell>
    )
  }

  if (!ws || !mastersQ.data) {
    return (
      <PageShell title={title} description="Preparing form…">
        <p className="text-sm text-slate-600">Loading reference data…</p>
      </PageShell>
    )
  }

  const sc = (ws.space_contact_details ?? {}) as Ws

  return (
    <PageShell
      title={title}
      description="Edit workspace details, location, plans, gallery, amenities, and SEO."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/layout/coworking/spaces')}>
            Back to list
          </Button>
          {ws.id ? (
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
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white/80 p-2 ring-1 ring-slate-200/70">
          <button
            type="button"
            onClick={() => setDetailTab('coworking')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              detailTab === 'coworking'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Coworking
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('virtual')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              detailTab === 'virtual'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Virtual office
          </button>
        </div>

        {detailTab === 'coworking' ? (
          <>
        {section('Coworking details', (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <label className="text-xs font-semibold text-slate-700">Name *</label>
              <Input className="mt-1" value={ws.name ?? ''} onChange={(e) => setWs({ ...ws, name: e.target.value })} required />
            </div>
            <div className="lg:col-span-1">
              <label className="text-xs font-semibold text-slate-700">Slug *</label>
              <Input className="mt-1" value={ws.slug ?? ''} onChange={(e) => setWs({ ...ws, slug: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Space tag *</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={(ws.spaceTag as string) ?? ''}
                onChange={(e) => setWs({ ...ws, spaceTag: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {SPACE_TAGS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Brand *</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={(ws.brand as string) ?? ''}
                onChange={(e) => setWs({ ...ws, brand: e.target.value })}
                required
              >
                <option value="">Select brand…</option>
                {mastersQ.data.brands.map((b) =>
                  b.id ? (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ) : null,
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Status</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                value={(ws.status as string) ?? 'pending'}
                onChange={(e) => setWs({ ...ws, status: e.target.value })}
              >
                {WORKSPACE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Rating</label>
              <Input value={(ws.ratings as string) ?? ''} onChange={(e) => setWs({ ...ws, ratings: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Currency</label>
              <Input value={(ws.currency_code as string) ?? ''} onChange={(e) => setWs({ ...ws, currency_code: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Starting price</label>
              <Input
                type="number"
                value={String(ws.starting_price ?? 0)}
                onChange={(e) => setWs({ ...ws, starting_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">No. of seats</label>
              <Input
                type="number"
                value={String(ws.no_of_seats ?? 0)}
                onChange={(e) => setWs({ ...ws, no_of_seats: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={!!ws.is_active}
                  onChange={(e) => setWs({ ...ws, is_active: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={!!ws.small_team_availability}
                  onChange={(e) => setWs({ ...ws, small_team_availability: e.target.checked })}
                />
                Small team
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={!!ws.enterprise_availability}
                  onChange={(e) => setWs({ ...ws, enterprise_availability: e.target.checked })}
                />
                Enterprise
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <RichTextEditor
                className="mt-1"
                minHeightClass="min-h-[180px]"
                value={(ws.description as string) ?? ''}
                onChange={(html) => setWs({ ...ws, description: html })}
                placeholder="Describe the space…"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <Input value={(ws.email as string) ?? ''} onChange={(e) => setWs({ ...ws, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Website URL</label>
              <Input value={(ws.website_Url as string) ?? ''} onChange={(e) => setWs({ ...ws, website_Url: e.target.value })} />
            </div>
          </div>
        ))}

        {section('Location', (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Country</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                value={countryId ?? ''}
                onChange={(e) =>
                  setLoc({
                    country: e.target.value,
                    state: '',
                    city: '',
                    micro_location: '',
                  })
                }
              >
                <option value="">Select…</option>
                {mastersQ.data.countries.map((c: { id: string; name?: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">State</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                value={stateId ?? ''}
                onChange={(e) => setLoc({ state: e.target.value, city: '', micro_location: '' })}
                disabled={!countryId}
              >
                <option value="">Select…</option>
                {states.map((s: { id: string; name?: string }) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">City</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                value={cityId ?? ''}
                onChange={(e) => setLoc({ city: e.target.value, micro_location: '' })}
                disabled={!countryId}
              >
                <option value="">Select…</option>
                {cities.map((c: { id: string; name?: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Micro-location</label>
              <div className="mt-1">
                <MicroLocationPicker
                  cityId={cityId}
                  value={microId}
                  onChange={(id) => setLoc({ micro_location: id })}
                  disabled={!cityId}
                  placeholder="Select micro-location…"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Location name</label>
              <Input value={(loc.name as string) ?? ''} onChange={(e) => setLoc({ name: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Address</label>
              <Input value={(loc.address as string) ?? ''} onChange={(e) => setLoc({ address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Address line 2</label>
              <Input value={(loc.address1 as string) ?? ''} onChange={(e) => setLoc({ address1: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Postal code</label>
              <Input value={(loc.postal_code as string) ?? ''} onChange={(e) => setLoc({ postal_code: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Floor</label>
              <Input value={(loc.floor as string) ?? ''} onChange={(e) => setLoc({ floor: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Building / area name</label>
              <Input value={(loc.name1 as string) ?? ''} onChange={(e) => setLoc({ name1: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Latitude</label>
              <Input
                type="number"
                step="any"
                value={String(loc.latitude ?? '')}
                onChange={(e) => setLoc({ latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Longitude</label>
              <Input
                type="number"
                step="any"
                value={String(loc.longitude ?? '')}
                onChange={(e) => setLoc({ longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
              {(
                [
                  ['is_near_metro', 'Near metro'],
                  ['is_ferry_stop', 'Ferry stop'],
                  ['is_bus_stop', 'Bus stop'],
                  ['is_taxi_stand', 'Taxi stand'],
                  ['is_tram', 'Tram'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600"
                    checked={!!loc[k]}
                    onChange={(e) => setLoc({ [k]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            {loc.is_near_metro ? (
              <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2 rounded-xl bg-violet-50/50 p-4 ring-1 ring-violet-100">
                <p className="sm:col-span-2 text-xs font-semibold text-violet-900">Near metro</p>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Station / landmark name</label>
                  <Input
                    className="mt-1"
                    value={(loc.landmark as string) ?? ''}
                    onChange={(e) => setLoc({ landmark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Distance</label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. 200 m"
                    value={(loc.landmark_distance as string) ?? ''}
                    onChange={(e) => setLoc({ landmark_distance: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
            {loc.is_ferry_stop ? (
              <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="sm:col-span-2 text-xs font-semibold text-slate-800">Ferry stop</p>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Landmark name</label>
                  <Input
                    className="mt-1"
                    value={(loc.ferry_stop_landmark as string) ?? ''}
                    onChange={(e) => setLoc({ ferry_stop_landmark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Distance</label>
                  <Input
                    className="mt-1"
                    value={(loc.ferry_stop_distance as string) ?? ''}
                    onChange={(e) => setLoc({ ferry_stop_distance: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
            {loc.is_bus_stop ? (
              <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="sm:col-span-2 text-xs font-semibold text-slate-800">Bus stop</p>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Landmark name</label>
                  <Input
                    className="mt-1"
                    value={(loc.bus_stop_landmark as string) ?? ''}
                    onChange={(e) => setLoc({ bus_stop_landmark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Distance</label>
                  <Input
                    className="mt-1"
                    value={(loc.bus_stop_distance as string) ?? ''}
                    onChange={(e) => setLoc({ bus_stop_distance: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
            {loc.is_taxi_stand ? (
              <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="sm:col-span-2 text-xs font-semibold text-slate-800">Taxi stand</p>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Landmark name</label>
                  <Input
                    className="mt-1"
                    value={(loc.taxi_stand_landmark as string) ?? ''}
                    onChange={(e) => setLoc({ taxi_stand_landmark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Distance</label>
                  <Input
                    className="mt-1"
                    value={(loc.taxi_stand_distance as string) ?? ''}
                    onChange={(e) => setLoc({ taxi_stand_distance: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
            {loc.is_tram ? (
              <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="sm:col-span-2 text-xs font-semibold text-slate-800">Tram</p>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Landmark name</label>
                  <Input
                    className="mt-1"
                    value={(loc.tram_landmark as string) ?? ''}
                    onChange={(e) => setLoc({ tram_landmark: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Distance</label>
                  <Input
                    className="mt-1"
                    value={(loc.tram_distance as string) ?? ''}
                    onChange={(e) => setLoc({ tram_distance: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {section('Space contact', (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Name"
              value={sc.name ?? ''}
              onChange={(e) =>
                setWs({ ...ws, space_contact_details: { ...sc, name: e.target.value } })
              }
            />
            <Input
              placeholder="Email"
              value={sc.email ?? ''}
              onChange={(e) =>
                setWs({ ...ws, space_contact_details: { ...sc, email: e.target.value } })
              }
            />
            <Input
              placeholder="Phone"
              value={sc.phone ?? ''}
              onChange={(e) =>
                setWs({ ...ws, space_contact_details: { ...sc, phone: e.target.value } })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-violet-600"
                checked={!!sc.show_on_website}
                onChange={(e) =>
                  setWs({
                    ...ws,
                    space_contact_details: { ...sc, show_on_website: e.target.checked },
                  })
                }
              />
              Show on website
            </label>
          </div>
        ))}

        {section('Additional contacts', (
          <div className="space-y-3">
            <Button type="button" variant="secondary" onClick={addContact}>
              Add contact
            </Button>
            {(ws.contact_details ?? []).map((c: any, idx: number) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-4">
                <Input
                  placeholder="Designation"
                  value={c.designation ?? ''}
                  onChange={(e) => {
                    const cd = [...(ws.contact_details ?? [])]
                    cd[idx] = { ...cd[idx], designation: e.target.value }
                    setWs({ ...ws, contact_details: cd })
                  }}
                />
                <Input
                  placeholder="Name"
                  value={c.name ?? ''}
                  onChange={(e) => {
                    const cd = [...(ws.contact_details ?? [])]
                    cd[idx] = { ...cd[idx], name: e.target.value }
                    setWs({ ...ws, contact_details: cd })
                  }}
                />
                <Input
                  placeholder="Phone"
                  value={c.phone_number ?? ''}
                  onChange={(e) => {
                    const cd = [...(ws.contact_details ?? [])]
                    cd[idx] = { ...cd[idx], phone_number: e.target.value }
                    setWs({ ...ws, contact_details: cd })
                  }}
                />
                <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeContact(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ))}

        {section('Facilities', (
          <div className="grid gap-4 sm:grid-cols-3">
            {(['desks', 'lounge', 'table'] as const).map((k) => (
              <div key={k}>
                <label className="text-xs font-semibold capitalize text-slate-700">{k}</label>
                <Input
                  className="mt-1"
                  value={((ws.facilities ?? {}) as any)[k] ?? ''}
                  onChange={(e) =>
                    setWs({
                      ...ws,
                      facilities: { ...(ws.facilities as object), [k]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </div>
        ))}

        {section('Social media', (
          <div className="grid gap-4 sm:grid-cols-3">
            {(['facebook', 'twitter', 'instagram'] as const).map((k) => (
              <div key={k}>
                <label className="text-xs font-semibold capitalize text-slate-700">{k}</label>
                <Input
                  className="mt-1"
                  value={((ws.social_media ?? {}) as any)[k] ?? ''}
                  onChange={(e) =>
                    setWs({
                      ...ws,
                      social_media: { ...(ws.social_media as object), [k]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </div>
        ))}

        {section('Hours of operation', (
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200/80">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/90">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Day</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Show</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">24h</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">From</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">To</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((day) => {
                  const h = ((ws.hours_of_operation ?? {}) as Record<string, Ws>)[day] ?? {}
                  const open24 = !!h.is_open_24
                  const show = !!h.should_show
                  return (
                    <tr key={day} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium capitalize text-slate-800">{day}</td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-violet-600"
                          checked={show}
                          onChange={(e) => patchHour(day, { should_show: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-violet-600"
                          checked={open24}
                          onChange={(e) =>
                            patchHour(day, {
                              is_open_24: e.target.checked,
                              ...(e.target.checked ? { from: '12:00 AM', to: '12:00 PM' } : {}),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full max-w-[140px] rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200"
                          disabled={!show || open24}
                          value={hourOrDefault(h.from, '09:00 AM')}
                          onChange={(e) => patchHour(day, { from: e.target.value })}
                        >
                          {HOUR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full max-w-[140px] rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200"
                          disabled={!show || open24}
                          value={hourOrDefault(h.to, '08:00 PM')}
                          onChange={(e) => patchHour(day, { to: e.target.value })}
                        >
                          {HOUR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        {section('Plans', (
          <div className="space-y-4">
            <Button type="button" variant="secondary" onClick={addPlan}>
              Add plan
            </Button>
            <input
              ref={planImgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPlanImagePick}
            />
            {(ws.plans ?? []).map((p: any, idx: number) => (
              <div
                key={idx}
                className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-6"
              >
                <select
                  className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                  value={typeof p.category === 'object' ? p.category?.id ?? '' : p.category ?? ''}
                  onChange={(e) => {
                    const plans = [...(ws.plans ?? [])]
                    plans[idx] = { ...plans[idx], category: e.target.value }
                    setWs({ ...ws, plans })
                  }}
                >
                  <option value="">Category…</option>
                  {mastersQ.data.planCategories.map((c: { id?: string; _id?: string; name?: string }) => {
                    const cid = c._id ?? c.id ?? ''
                    return cid ? (
                      <option key={cid} value={cid}>
                        {c.name}
                      </option>
                    ) : null
                  })}
                </select>
                <Input
                  type="number"
                  placeholder="Price"
                  value={String(p.price ?? 0)}
                  onChange={(e) => {
                    const plans = [...(ws.plans ?? [])]
                    plans[idx] = { ...plans[idx], price: Number(e.target.value) }
                    setWs({ ...ws, plans })
                  }}
                />
                <Input
                  type="number"
                  placeholder="Seats"
                  value={String(p.seats ?? 0)}
                  onChange={(e) => {
                    const plans = [...(ws.plans ?? [])]
                    plans[idx] = { ...plans[idx], seats: Number(e.target.value) }
                    setWs({ ...ws, plans })
                  }}
                />
                <select
                  className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                  value={p.duration ?? 'month'}
                  onChange={(e) => {
                    const plans = [...(ws.plans ?? [])]
                    plans[idx] = { ...plans[idx], duration: e.target.value }
                    setWs({ ...ws, plans })
                  }}
                >
                  {PLAN_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600"
                    checked={!!p.should_show}
                    onChange={(e) => {
                      const plans = [...(ws.plans ?? [])]
                      plans[idx] = { ...plans[idx], should_show: e.target.checked }
                      setWs({ ...ws, plans })
                    }}
                  />
                  Show
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPlanImgIdx(idx)
                      planImgRef.current?.click()
                    }}
                  >
                    Plan image
                  </Button>
                  {p.image?.s3_link ? (
                    <img src={p.image.s3_link} alt="" className="h-10 rounded ring-1 ring-slate-200" />
                  ) : null}
                  <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removePlan(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {section('Gallery', (
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryPick} />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                Upload images
              </Button>
              {(ws.images ?? []).length > 0 ? (
                <p className="text-xs text-slate-500">Drag the grip handle to set image priority (first = main).</p>
              ) : null}
            </div>
            {(ws.images ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No images yet.</p>
            ) : (
              <Table className="shadow-none ring-0">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <Th className="w-12">
                      <span className="sr-only">Reorder</span>
                    </Th>
                    <Th>Priority</Th>
                    <Th>Preview</Th>
                    <Th>Name</Th>
                    <Th>Alt</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {(ws.images ?? []).map((slot: any, i: number) => (
                    <Tr
                      key={slot?.image?.id ? String(slot.image.id) : `gallery-${i}`}
                      className={cn(
                        galleryDragOver === i && galleryDragFrom !== null && galleryDragFrom !== i && 'bg-violet-50/90 ring-1 ring-inset ring-violet-300',
                        galleryDragFrom === i && 'opacity-70',
                      )}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (galleryDragFrom !== null) setGalleryDragOver(i)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const from = Number(e.dataTransfer.getData('text/plain'))
                        if (Number.isNaN(from)) return
                        reorderGallery(from, i)
                        setGalleryDragFrom(null)
                        setGalleryDragOver(null)
                      }}
                    >
                      <Td className="w-12 align-middle">
                        <button
                          type="button"
                          draggable
                          aria-label={`Drag to reorder image ${i + 1}`}
                          title="Drag to reorder"
                          className="cursor-grab rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(i))
                            e.dataTransfer.effectAllowed = 'move'
                            setGalleryDragFrom(i)
                          }}
                          onDragEnd={() => {
                            setGalleryDragFrom(null)
                            setGalleryDragOver(null)
                          }}
                        >
                          <Bars3Icon className="h-5 w-5 shrink-0" aria-hidden />
                        </button>
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-slate-800">{slot.order ?? i + 1}</Td>
                      <Td>
                        {slot.image?.s3_link ? (
                          <img
                            src={slot.image.s3_link}
                            alt={slot.image.title || slot.image.real_name || ''}
                            className="h-16 w-28 rounded-lg object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td className="min-w-[140px]">
                        <Input
                          className="text-xs"
                          placeholder="Name"
                          value={slot.image?.real_name ?? ''}
                          onChange={(e) => patchGalleryImage(i, { real_name: e.target.value })}
                          disabled={!slot.image}
                        />
                      </Td>
                      <Td className="min-w-[140px]">
                        <Input
                          className="text-xs"
                          placeholder="Alt text"
                          value={slot.image?.title ?? ''}
                          onChange={(e) => patchGalleryImage(i, { title: e.target.value })}
                          disabled={!slot.image}
                        />
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={i === 0}
                            onClick={() => moveGallery(i, -1)}
                          >
                            Up
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={i === (ws.images ?? []).length - 1}
                            onClick={() => moveGallery(i, 1)}
                          >
                            Down
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={!slot.image?.id}
                            onClick={() => saveGalleryImageMeta(i)}
                          >
                            Save name & alt
                          </Button>
                          <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeGallerySlot(i)}>
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

        {section('Amenities', (
          <div className="flex max-h-64 flex-wrap gap-3 overflow-y-auto rounded-xl bg-slate-50/80 p-4">
            {mastersQ.data.amenities.map((a: Amenity) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={isAmenityOn(a.id)}
                  onChange={() => toggleAmenity(a)}
                />
                {a.name}
              </label>
            ))}
          </div>
        ))}

        {section('SEO', (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 sm:col-span-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={indexFlag}
                  onChange={(e) => setIndexFlag(e.target.checked)}
                />
                Allow indexing
              </label>
              <Input
                placeholder="Meta title"
                value={ws.seo?.title ?? ''}
                onChange={(e) => setWs({ ...ws, seo: { ...ws.seo, title: e.target.value } })}
              />
              <Input
                placeholder="Keywords"
                value={ws.seo?.keywords ?? ''}
                onChange={(e) => setWs({ ...ws, seo: { ...ws.seo, keywords: e.target.value } })}
              />
              <div className="sm:col-span-2">
                <textarea
                  className="min-h-[80px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                  placeholder="Meta description"
                  value={ws.seo?.description ?? ''}
                  onChange={(e) => setWs({ ...ws, seo: { ...ws.seo, description: e.target.value } })}
                />
              </div>
              <Input
                placeholder="Footer title"
                value={ws.seo?.footer_title ?? ''}
                onChange={(e) => setWs({ ...ws, seo: { ...ws.seo, footer_title: e.target.value } })}
              />
              <Input
                placeholder="Footer description"
                value={ws.seo?.footer_description ?? ''}
                onChange={(e) => setWs({ ...ws, seo: { ...ws.seo, footer_description: e.target.value } })}
              />
            </div>
            <div className="space-y-3 rounded-xl bg-sky-50/50 p-4 ring-1 ring-sky-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Twitter</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Twitter title"
                  value={ws.seo?.twitter?.title ?? ''}
                  onChange={(e) =>
                    setWs({
                      ...ws,
                      seo: { ...ws.seo, twitter: { ...ws.seo.twitter, title: e.target.value } },
                    })
                  }
                />
                <div className="sm:col-span-2">
                  <textarea
                    className="min-h-[72px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                    placeholder="Twitter description"
                    value={ws.seo?.twitter?.description ?? ''}
                    onChange={(e) =>
                      setWs({
                        ...ws,
                        seo: { ...ws.seo, twitter: { ...ws.seo.twitter, description: e.target.value } },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSeoImgTarget({ block: 'seo', field: 'twitter' })
                    seoImgRef.current?.click()
                  }}
                >
                  Twitter image
                </Button>
                {ws.seo?.twitter?.image?.s3_link ? (
                  <img
                    src={ws.seo.twitter.image.s3_link}
                    alt=""
                    className="h-12 rounded-md ring-1 ring-slate-200"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-600"
                  onClick={() =>
                    setWs({
                      ...ws,
                      seo: { ...ws.seo, twitter: { ...ws.seo.twitter, image: null } },
                    })
                  }
                >
                  Clear image
                </Button>
              </div>
            </div>
            <div className="space-y-3 rounded-xl bg-indigo-50/50 p-4 ring-1 ring-indigo-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Open Graph</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="OG title"
                  value={ws.seo?.open_graph?.title ?? ''}
                  onChange={(e) =>
                    setWs({
                      ...ws,
                      seo: { ...ws.seo, open_graph: { ...ws.seo.open_graph, title: e.target.value } },
                    })
                  }
                />
                <div className="sm:col-span-2">
                  <textarea
                    className="min-h-[72px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                    placeholder="OG description"
                    value={ws.seo?.open_graph?.description ?? ''}
                    onChange={(e) =>
                      setWs({
                        ...ws,
                        seo: {
                          ...ws.seo,
                          open_graph: { ...ws.seo.open_graph, description: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSeoImgTarget({ block: 'seo', field: 'open_graph' })
                    seoImgRef.current?.click()
                  }}
                >
                  Open Graph image
                </Button>
                {ws.seo?.open_graph?.image?.s3_link ? (
                  <img
                    src={ws.seo.open_graph.image.s3_link}
                    alt=""
                    className="h-12 rounded-md ring-1 ring-slate-200"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-600"
                  onClick={() =>
                    setWs({
                      ...ws,
                      seo: { ...ws.seo, open_graph: { ...ws.seo.open_graph, image: null } },
                    })
                  }
                >
                  Clear image
                </Button>
              </div>
            </div>
          </div>
        ))}

          </>
        ) : (
          <>
        {section('Virtual office SEO', (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 sm:col-span-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  checked={indexVirtualFlag}
                  onChange={(e) => setIndexVirtualFlag(e.target.checked)}
                />
                Allow indexing (virtual)
              </label>
              <Input
                placeholder="Meta title"
                value={ws.virtualSeo?.title ?? ''}
                onChange={(e) =>
                  setWs({ ...ws, virtualSeo: { ...ws.virtualSeo, title: e.target.value } })
                }
              />
              <Input
                placeholder="Keywords"
                value={ws.virtualSeo?.keywords ?? ''}
                onChange={(e) =>
                  setWs({ ...ws, virtualSeo: { ...ws.virtualSeo, keywords: e.target.value } })
                }
              />
              <div className="sm:col-span-2">
                <textarea
                  className="min-h-[80px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                  placeholder="Meta description"
                  value={ws.virtualSeo?.description ?? ''}
                  onChange={(e) =>
                    setWs({ ...ws, virtualSeo: { ...ws.virtualSeo, description: e.target.value } })
                  }
                />
              </div>
              <Input
                placeholder="Footer title"
                value={ws.virtualSeo?.footer_title ?? ''}
                onChange={(e) =>
                  setWs({
                    ...ws,
                    virtualSeo: { ...ws.virtualSeo, footer_title: e.target.value },
                  })
                }
              />
              <Input
                placeholder="Footer description"
                value={ws.virtualSeo?.footer_description ?? ''}
                onChange={(e) =>
                  setWs({
                    ...ws,
                    virtualSeo: { ...ws.virtualSeo, footer_description: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-3 rounded-xl bg-sky-50/50 p-4 ring-1 ring-sky-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Twitter</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Twitter title"
                  value={ws.virtualSeo?.twitter?.title ?? ''}
                  onChange={(e) =>
                    setWs({
                      ...ws,
                      virtualSeo: {
                        ...ws.virtualSeo,
                        twitter: { ...ws.virtualSeo.twitter, title: e.target.value },
                      },
                    })
                  }
                />
                <div className="sm:col-span-2">
                  <textarea
                    className="min-h-[72px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                    placeholder="Twitter description"
                    value={ws.virtualSeo?.twitter?.description ?? ''}
                    onChange={(e) =>
                      setWs({
                        ...ws,
                        virtualSeo: {
                          ...ws.virtualSeo,
                          twitter: { ...ws.virtualSeo.twitter, description: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSeoImgTarget({ block: 'virtualSeo', field: 'twitter' })
                    seoImgRef.current?.click()
                  }}
                >
                  Twitter image
                </Button>
                {ws.virtualSeo?.twitter?.image?.s3_link ? (
                  <img
                    src={ws.virtualSeo.twitter.image.s3_link}
                    alt=""
                    className="h-12 rounded-md ring-1 ring-slate-200"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-600"
                  onClick={() =>
                    setWs({
                      ...ws,
                      virtualSeo: {
                        ...ws.virtualSeo,
                        twitter: { ...ws.virtualSeo.twitter, image: null },
                      },
                    })
                  }
                >
                  Clear image
                </Button>
              </div>
            </div>
            <div className="space-y-3 rounded-xl bg-indigo-50/50 p-4 ring-1 ring-indigo-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Open Graph</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="OG title"
                  value={ws.virtualSeo?.open_graph?.title ?? ''}
                  onChange={(e) =>
                    setWs({
                      ...ws,
                      virtualSeo: {
                        ...ws.virtualSeo,
                        open_graph: { ...ws.virtualSeo.open_graph, title: e.target.value },
                      },
                    })
                  }
                />
                <div className="sm:col-span-2">
                  <textarea
                    className="min-h-[72px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                    placeholder="OG description"
                    value={ws.virtualSeo?.open_graph?.description ?? ''}
                    onChange={(e) =>
                      setWs({
                        ...ws,
                        virtualSeo: {
                          ...ws.virtualSeo,
                          open_graph: { ...ws.virtualSeo.open_graph, description: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSeoImgTarget({ block: 'virtualSeo', field: 'open_graph' })
                    seoImgRef.current?.click()
                  }}
                >
                  Open Graph image
                </Button>
                {ws.virtualSeo?.open_graph?.image?.s3_link ? (
                  <img
                    src={ws.virtualSeo.open_graph.image.s3_link}
                    alt=""
                    className="h-12 rounded-md ring-1 ring-slate-200"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-600"
                  onClick={() =>
                    setWs({
                      ...ws,
                      virtualSeo: {
                        ...ws.virtualSeo,
                        open_graph: { ...ws.virtualSeo.open_graph, image: null },
                      },
                    })
                  }
                >
                  Clear image
                </Button>
              </div>
            </div>
          </div>
        ))}

          </>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/coworking/spaces')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save workspace'}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
