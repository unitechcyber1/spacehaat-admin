import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { RichTextEditor } from '../../components/RichTextEditor/RichTextEditor'
import { Table, Td, Th, Tr } from '../../components/Table'
import { env } from '../../lib/env'
import { cn } from '../../lib/ui'
import { getAmenities } from '../../services/amenity/amenity.service'
import type { AmenityRecord } from '../../services/amenity/types'
import { getBuilders } from '../../services/builder/builder.service'
import { getCountries } from '../../services/locations/country.service'
import { getCitiesByCountryOnly, getCitiesByState } from '../../services/locations/city.service'
import { getMicroLocationsByCity } from '../../services/locations/microLocation.service'
import { getStatesByCountry } from '../../services/locations/state.service'
import {
  getOfficeSpaceById,
  saveOfficeSpace,
  updateOfficeSlug,
} from '../../services/office-space/office-space.service'
import { getSubBuilders } from '../../services/subbuilder/subbuilder.service'
import { uploadAdminFile } from '../../services/upload/upload.service'
import { deleteS3File, saveUploadImageMeta } from '../../services/workspace/workspace.service'
import {
  buildOfficeSpaceSavePayload,
  emptyOfficeSpace,
  isAmenitySelected,
  normalizeOfficeFromApi,
  OFFICE_TYPES,
  toggleAmenity,
} from './officeFormModel'

type AnyRec = Record<string, any>

const inputClass = 'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'

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

export function OfficeSpaceFormPage() {
  const { officeSpaceId } = useParams<{ officeSpaceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !officeSpaceId
  const pageTitle = isNew ? 'Add office space' : 'Edit office space'

  const galleryRef = useRef<HTMLInputElement>(null)
  const seoTwitterRef = useRef<HTMLInputElement>(null)
  const seoOgRef = useRef<HTMLInputElement>(null)

  const [os, setOs] = useState<AnyRec | null>(null)
  const [indexFlag, setIndexFlag] = useState(true)

  const detailQ = useQuery({
    queryKey: ['office-space', officeSpaceId],
    queryFn: () => getOfficeSpaceById(officeSpaceId!),
    enabled: !isNew && !!officeSpaceId,
  })

  const mastersQ = useQuery({
    queryKey: ['office-space-form-masters'],
    queryFn: async () => {
      const [amRes, countryRes, builderRes] = await Promise.all([
        getAmenities({ limit: 20_000 }),
        getCountries({ limit: 100_000 }),
        getBuilders({ status: 'approve', limit: 50_000 } as Record<string, unknown>),
      ])
      const amenities = (amRes.data ?? []).filter((a: AmenityRecord) => Boolean(a.for_office))
      amenities.sort((a, b) => String(a.category ?? '').localeCompare(String(b.category ?? '')))
      return {
        amenities,
        countries: countryRes.data ?? [],
        builders: (builderRes.data ?? []).slice().sort((a: AnyRec, b: AnyRec) =>
          String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }),
        ),
      }
    },
    staleTime: 60_000,
  })

  const loc = (os?.location ?? {}) as AnyRec
  const countryId = loc.country as string | undefined
  const stateId = loc.state as string | undefined
  const cityId = loc.city as string | undefined
  const builderId = os?.builder as string | undefined

  const statesQ = useQuery({
    queryKey: ['states', countryId],
    queryFn: () => getStatesByCountry(countryId!),
    enabled: !!countryId,
  })

  const citiesQ = useQuery({
    queryKey: ['cities-office', stateId, countryId],
    queryFn: () => (stateId ? getCitiesByState(stateId) : getCitiesByCountryOnly(countryId!)),
    enabled: !!countryId,
  })

  const microQ = useQuery({
    queryKey: ['micro', cityId, 'office'],
    queryFn: () => getMicroLocationsByCity(cityId!),
    enabled: !!cityId,
  })

  const buildingsQ = useQuery({
    queryKey: ['subbuilders', builderId],
    queryFn: () => getSubBuilders({ builder: builderId, limit: 1000 }),
    enabled: !!builderId,
  })

  const cityOptions = useMemo(() => {
    const raw = (citiesQ.data?.data ?? []) as AnyRec[]
    return raw
      .map((c) => ({ id: String(c.id ?? c._id ?? ''), name: c.name }))
      .filter((c) => c.id)
  }, [citiesQ.data?.data])

  const groupedAmenities = useMemo(() => {
    const list = mastersQ.data?.amenities ?? []
    const m = new Map<string, AmenityRecord[]>()
    for (const a of list) {
      const key = String(a.category ?? 'others')
      m.set(key, [...(m.get(key) ?? []), a])
    }
    return Array.from(m.entries())
  }, [mastersQ.data?.amenities])

  useEffect(() => {
    if (!isNew && detailQ.data?.data) {
      const n = normalizeOfficeFromApi(detailQ.data.data as AnyRec)
      setOs(n)
      setIndexFlag((n.seo as AnyRec)?.robots === 'index, follow')
    }
  }, [isNew, detailQ.data])

  useEffect(() => {
    if (!isNew || !mastersQ.isSuccess) return
    setOs((prev) => {
      if (prev) return prev
      return { ...emptyOfficeSpace(), status: 'pending' }
    })
  }, [isNew, mastersQ.isSuccess])

  const setField = useCallback((patch: AnyRec) => {
    setOs((o) => (o ? { ...o, ...patch } : o))
  }, [])

  const setLoc = useCallback((patch: AnyRec) => {
    setOs((o) => (o ? { ...o, location: { ...o.location, ...patch } } : o))
  }, [])

  const setOther = useCallback((patch: AnyRec) => {
    setOs((o) => (o ? { ...o, other_detail: { ...o.other_detail, ...patch } } : o))
  }, [])

  const setSeo = useCallback((patch: AnyRec) => {
    setOs((o) => (o ? { ...o, seo: { ...o.seo, ...patch } } : o))
  }, [])

  const saveMut = useMutation({
    mutationFn: async (payload: AnyRec) => {
      const body = buildOfficeSpaceSavePayload(payload)
      body.seo = { ...body.seo, robots: indexFlag ? 'index, follow' : 'noindex, nofollow' }
      return saveOfficeSpace(body)
    },
    onSuccess: (res: any) => {
      toast.success('Office space saved')
      qc.invalidateQueries({ queryKey: ['office-spaces'] })
      const saved = res?.data as AnyRec | undefined
      const id = saved?.id ?? saved?._id ?? os?.id ?? os?._id
      if (isNew && id) {
        navigate(`/layout/office-space/detail/${id}`, { replace: true })
      }
      if (saved) {
        setOs(normalizeOfficeFromApi(saved))
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const slugMut = useMutation({
    mutationFn: () =>
      updateOfficeSlug({ id: String(os?.id ?? os?._id ?? ''), slug: String(os?.slug ?? '') }),
    onSuccess: () => toast.success('Slug updated'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Slug update failed'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!os) return
    if (!os.name?.trim() || !os.slug?.trim()) {
      toast.error('Name and slug are required.')
      return
    }
    if (!os.builder) {
      toast.error('Builder is required.')
      return
    }
    if (!os.other_detail?.office_type) {
      toast.error('Office type is required.')
      return
    }
    const od = os.other_detail
    if (od.area_for_lease_in_sq_ft == null || od.area_for_lease_in_sq_ft === '') {
      toast.error('Area (sq ft) is required.')
      return
    }
    if (!od.floor?.toString().trim()) {
      toast.error('Floor is required.')
      return
    }
    if (!os.other_detail?.security_deposit) {
      toast.error('Security deposit is required.')
      return
    }
    const l = os.location || {}
    if (!l.address?.toString().trim() || !l.country || !l.city || l.latitude == null || l.longitude == null) {
      toast.error('Address, country, city, latitude, and longitude are required.')
      return
    }
    saveMut.mutate({ ...os })
  }

  function onPreview() {
    const slug = (os?.slug ?? '').toLowerCase().trim()
    if (!os?.id && !os?._id) {
      toast.error('Save before preview.')
      return
    }
    if (!slug) {
      toast.error('Missing slug.')
      return
    }
    const base = env.officeUrl?.replace(/\/$/, '')
    if (!base) {
      toast.error('Set VITE_OFFICE_URL in .env for preview.')
      return
    }
    window.open(`${base}/${slug}`, '_blank', 'noopener,noreferrer')
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length || !os) return
    try {
      for (const f of files) {
        const up = await uploadAdminFile(f)
        if (!up?.id) throw new Error('Upload missing id')
        const image = {
          id: up.id,
          s3_link: up.s3_link,
          real_name: up.real_name,
          name: up.name,
          title: '',
        }
        setOs((w) => {
          if (!w) return w
          const list = [...(w.images ?? [])]
          list.push({ order: list.length + 1, image })
          return { ...w, images: normalizeImageOrders(list) }
        })
      }
      toast.success('Image(s) added')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
  }

  function moveGallery(idx: number, delta: number) {
    setOs((w) => {
      if (!w) return w
      const list = [...(w.images ?? [])]
      const j = idx + delta
      if (j < 0 || j >= list.length) return w
      const t = list[idx]
      list[idx] = list[j]
      list[j] = t
      return { ...w, images: normalizeImageOrders(list) }
    })
  }

  async function removeGallerySlot(idx: number) {
    const slot = (os?.images ?? [])[idx]
    if (slot?.image && typeof slot.image === 'object') {
      try {
        await deleteS3File(slot.image)
      } catch {
        toast.error('Could not delete file from storage')
      }
    }
    setOs((w) => {
      if (!w) return w
      const list = (w.images ?? []).filter((_: unknown, i: number) => i !== idx)
      return { ...w, images: normalizeImageOrders(list) }
    })
  }

  function patchGalleryImage(idx: number, patch: AnyRec) {
    setOs((w) => {
      if (!w) return w
      const imgs = [...(w.images ?? [])]
      const slot = imgs[idx]
      if (!slot?.image) return w
      imgs[idx] = { ...slot, image: { ...slot.image, ...patch } }
      return { ...w, images: imgs }
    })
  }

  async function saveGalleryImageMeta(idx: number) {
    const img = os?.images?.[idx]?.image
    if (!img?.id) {
      toast.error('Nothing to save for this row.')
      return
    }
    try {
      await saveUploadImageMeta(img)
      toast.success('Image meta saved')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed')
    }
  }

  async function onSeoImagePick(e: React.ChangeEvent<HTMLInputElement>, target: 'twitter' | 'open_graph') {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !os) return
    try {
      const up = await uploadAdminFile(file)
      if (!up?.id) throw new Error('Upload missing id')
      const image = { id: up.id, s3_link: up.s3_link, real_name: up.real_name, name: up.name }
      setOs((w) => {
        if (!w) return w
        const seo = { ...(w.seo || {}) }
        const branch = { ...(seo[target] || {}) }
        branch.image = image
        seo[target] = branch
        return { ...w, seo }
      })
      toast.success('SEO image uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
  }

  const microIds: string[] = Array.isArray(loc.micro_location)
    ? loc.micro_location.map((x: any) => String(typeof x === 'string' ? x : x?.id ?? '')).filter(Boolean)
    : []

  function setMicroIds(ids: string[]) {
    setLoc({ micro_location: ids })
  }

  if (!mastersQ.isSuccess || os === null) {
    return (
      <PageShell title={pageTitle} description="Loading form…">
        <p className="text-sm text-slate-600">{detailQ.isLoading ? 'Loading office space…' : 'Preparing form…'}</p>
      </PageShell>
    )
  }

  if (!isNew && detailQ.isError) {
    return (
      <PageShell title={pageTitle} description="Error">
        <p className="text-sm text-rose-600">Could not load this office space.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/layout/office-space')}>
          Back to list
        </Button>
      </PageShell>
    )
  }

  const addedOn = os.added_on ? new Date(os.added_on).toLocaleDateString('en-GB') : null

  return (
    <PageShell
      title={pageTitle}
      description="Office space details, location, amenities, gallery, and SEO — aligned with the legacy Angular admin form."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/office-space')}>
            Back to list
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-8">
        {addedOn ? (
          <p className="text-sm text-slate-600">
            Added on: <span className="font-medium text-slate-900">{addedOn}</span>
          </p>
        ) : null}

        {os.user ? (
          section(
            'User contact details',
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>User name</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={os.user.name ?? ''}
                  onChange={(e) =>
                    setOs({
                      ...os,
                      user: { ...os.user, name: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <Input
                  className="mt-1 rounded-xl"
                  type="email"
                  value={os.user.email ?? ''}
                  onChange={(e) =>
                    setOs({
                      ...os,
                      user: { ...os.user, email: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={os.user.phone_number ?? ''}
                  onChange={(e) =>
                    setOs({
                      ...os,
                      user: { ...os.user, phone_number: e.target.value },
                    })
                  }
                />
              </div>
            </div>,
          )
        ) : null}

        {section(
          'Additional contact details',
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-600">Optional rows for on-site contacts.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setOs({
                    ...os,
                    contact_details: [
                      ...(os.contact_details ?? []),
                      { designation: '', name: '', phone_number: '' },
                    ],
                  })
                }
              >
                Add contact
              </Button>
            </div>
            {(os.contact_details ?? []).map((c: AnyRec, index: number) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200/80 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div>
                  <label className={labelClass}>Designation</label>
                  <Input
                    className="mt-1 rounded-xl"
                    value={c.designation ?? ''}
                    onChange={(e) => {
                      const next = [...(os.contact_details ?? [])]
                      next[index] = { ...next[index], designation: e.target.value }
                      setOs({ ...os, contact_details: next })
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <Input
                    className="mt-1 rounded-xl"
                    value={c.name ?? ''}
                    onChange={(e) => {
                      const next = [...(os.contact_details ?? [])]
                      next[index] = { ...next[index], name: e.target.value }
                      setOs({ ...os, contact_details: next })
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <Input
                    className="mt-1 rounded-xl"
                    value={c.phone_number ?? ''}
                    onChange={(e) => {
                      const next = [...(os.contact_details ?? [])]
                      next[index] = { ...next[index], phone_number: e.target.value }
                      setOs({ ...os, contact_details: next })
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-rose-700"
                  onClick={() => {
                    const next = (os.contact_details ?? []).filter((_: unknown, i: number) => i !== index)
                    setOs({ ...os, contact_details: next })
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </>,
        )}

        {section(
          'Space contact details',
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Name</label>
              <Input
                className="mt-1 rounded-xl"
                value={os.space_contact_details?.name ?? ''}
                onChange={(e) =>
                  setOs({
                    ...os,
                    space_contact_details: { ...os.space_contact_details, name: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <Input
                className="mt-1 rounded-xl"
                type="email"
                value={os.space_contact_details?.email ?? ''}
                onChange={(e) =>
                  setOs({
                    ...os,
                    space_contact_details: { ...os.space_contact_details, email: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <Input
                className="mt-1 rounded-xl"
                value={os.space_contact_details?.phone ?? ''}
                onChange={(e) =>
                  setOs({
                    ...os,
                    space_contact_details: { ...os.space_contact_details, phone: e.target.value },
                  })
                }
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={!!os.space_contact_details?.show_on_website}
                onChange={(e) =>
                  setOs({
                    ...os,
                    space_contact_details: { ...os.space_contact_details, show_on_website: e.target.checked },
                  })
                }
              />
              Show on website
            </label>
          </div>,
        )}

        {section(
          'Office space details',
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Name *</label>
              <Input className="mt-1 rounded-xl" value={os.name ?? ''} onChange={(e) => setField({ name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className={labelClass}>Slug *</label>
                <Input className="mt-1 rounded-xl" value={os.slug ?? ''} onChange={(e) => setField({ slug: e.target.value })} required />
              </div>
              <Button type="button" variant="secondary" disabled={!os.id && !os._id} onClick={() => slugMut.mutate()}>
                Update slug
              </Button>
            </div>
            <div>
              <label className={labelClass}>Space tag</label>
              <Input className="mt-1 rounded-xl" value={os.spaceTag ?? ''} onChange={(e) => setField({ spaceTag: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Ratings</label>
              <Input className="mt-1 rounded-xl" value={os.ratings ?? ''} onChange={(e) => setField({ ratings: e.target.value })} />
            </div>
          </div>,
        )}

        {section(
          'Other details',
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Builder *</label>
                <select
                  className={inputClass}
                  value={os.builder ?? ''}
                  required
                  onChange={(e) => {
                    const v = e.target.value
                    setField({ builder: v, building: '' })
                  }}
                >
                  <option value="">Select builder</option>
                  {mastersQ.data?.builders?.map((b: AnyRec) => (
                    <option key={String(b.id ?? b._id)} value={String(b.id ?? b._id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Building</label>
                <select
                  className={inputClass}
                  value={typeof os.building === 'object' && os.building?.id ? os.building.id : (os.building ?? '')}
                  onChange={(e) => setField({ building: e.target.value })}
                >
                  <option value="">Select building</option>
                  {(buildingsQ.data?.data ?? []).map((b: AnyRec) => (
                    <option key={String(b.id ?? b._id)} value={String(b.id ?? b._id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Building name (text)</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={os.other_detail?.building_name ?? ''}
                  onChange={(e) => setOther({ building_name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Office type *</label>
                <select
                  className={inputClass}
                  value={os.other_detail?.office_type ?? ''}
                  required
                  onChange={(e) => setOther({ office_type: e.target.value })}
                >
                  <option value="">Select type</option>
                  {OFFICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Area (sq ft) *</label>
                <Input
                  type="number"
                  className="mt-1 rounded-xl"
                  value={os.other_detail?.area_for_lease_in_sq_ft ?? ''}
                  onChange={(e) => {
                    const area = Number(e.target.value)
                    const r = os.other_detail?.rent_in_sq_ft
                    setOther({
                      area_for_lease_in_sq_ft: area,
                      ...(r != null && r !== '' ? { monthly_rent: area * Number(r) } : {}),
                    })
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Rent / sq ft</label>
                <Input
                  type="number"
                  className="mt-1 rounded-xl"
                  value={os.other_detail?.rent_in_sq_ft ?? ''}
                  onChange={(e) => {
                    const r = Number(e.target.value)
                    const area = Number(os.other_detail?.area_for_lease_in_sq_ft)
                    setOther({
                      rent_in_sq_ft: r,
                      ...(area ? { monthly_rent: area * r } : {}),
                    })
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Monthly rent</label>
                <Input
                  type="number"
                  className="mt-1 rounded-xl"
                  value={os.other_detail?.monthly_rent ?? ''}
                  onChange={(e) => {
                    const m = Number(e.target.value)
                    const area = Number(os.other_detail?.area_for_lease_in_sq_ft)
                    setOther({
                      monthly_rent: m,
                      ...(area ? { rent_in_sq_ft: m / area } : {}),
                    })
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Floor *</label>
                <Input className="mt-1 rounded-xl" value={os.other_detail?.floor ?? ''} onChange={(e) => setOther({ floor: e.target.value })} required />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Monthly maintenance</h4>
              <div className="flex flex-wrap gap-4">
                {(['No', 'Yes'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="mm"
                      checked={(os.other_detail?.monthly_maintenance ?? 'No') === v}
                      onChange={() => setOther({ monthly_maintenance: v })}
                    />
                    {v}
                  </label>
                ))}
              </div>
              {os.other_detail?.monthly_maintenance === 'Yes' ? (
                <Input
                  className="mt-2 max-w-xs rounded-xl"
                  placeholder="Amount / month"
                  value={os.other_detail?.monthly_maintenance_amount ?? ''}
                  onChange={(e) => setOther({ monthly_maintenance_amount: e.target.value })}
                />
              ) : null}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Security deposit *</h4>
              <div className="flex flex-wrap gap-3">
                {['NoMaintainance', '1 Month', '2 Month', '3 Month', '6 Month', '1 Year'].map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sd"
                      checked={os.other_detail?.security_deposit === v}
                      onChange={() => setOther({ security_deposit: v })}
                    />
                    {v === 'NoMaintainance' ? 'No' : v}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800">Facilities</h4>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setOther({
                      facilities: [...(os.other_detail?.facilities ?? []), { name: '', value: '' }],
                    })
                  }
                >
                  Add row
                </Button>
              </div>
              {(os.other_detail?.facilities ?? []).map((row: AnyRec, i: number) => (
                <div key={i} className="mb-2 flex flex-wrap gap-2">
                  <Input
                    placeholder="Name"
                    className="max-w-xs rounded-xl"
                    value={row.name ?? ''}
                    onChange={(e) => {
                      const facilities = [...(os.other_detail?.facilities ?? [])]
                      facilities[i] = { ...facilities[i], name: e.target.value }
                      setOther({ facilities })
                    }}
                  />
                  <Input
                    placeholder="Value"
                    className="max-w-xs rounded-xl"
                    value={row.value ?? ''}
                    onChange={(e) => {
                      const facilities = [...(os.other_detail?.facilities ?? [])]
                      facilities[i] = { ...facilities[i], value: e.target.value }
                      setOther({ facilities })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-700"
                    onClick={() => {
                      const facilities = (os.other_detail?.facilities ?? []).filter((_: unknown, j: number) => j !== i)
                      setOther({ facilities })
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </>,
        )}

        {section(
          'About office space',
          <RichTextEditor
            value={typeof os.description === 'string' ? os.description : ''}
            onChange={(html) => setField({ description: html })}
            minHeightClass="min-h-[200px]"
            placeholder="Description…"
          />,
        )}

        {section(
          'Location',
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Address *</label>
                <textarea
                  className={cn(inputClass, 'min-h-[100px] resize-y')}
                  value={loc.address ?? ''}
                  onChange={(e) => setLoc({ address: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Country *</label>
                  <select
                    className={inputClass}
                    value={loc.country ?? ''}
                    required
                    onChange={(e) =>
                      setLoc({
                        country: e.target.value,
                        state: '',
                        city: '',
                        micro_location: [],
                      })
                    }
                  >
                    <option value="">Select country</option>
                    {(mastersQ.data?.countries ?? []).map((c: AnyRec) => (
                      <option key={String(c.id ?? c._id)} value={String(c.id ?? c._id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select
                    className={inputClass}
                    value={loc.state ?? ''}
                    onChange={(e) =>
                      setLoc({
                        state: e.target.value,
                        city: '',
                        micro_location: [],
                      })
                    }
                  >
                    <option value="">Select state</option>
                    {(statesQ.data?.data ?? []).map((s: AnyRec) => (
                      <option key={String(s.id ?? s._id)} value={String(s.id ?? s._id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="os-form-city">
                  City *
                </label>
                <select
                  id="os-form-city"
                  className={inputClass}
                  value={String(loc.city ?? '')}
                  required
                  disabled={!countryId || citiesQ.isLoading}
                  onChange={(e) => setLoc({ city: e.target.value, micro_location: [] })}
                >
                  <option value="">{citiesQ.isLoading ? 'Loading cities…' : 'Select city'}</option>
                  {cityOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Micro-locations</label>
                <select
                  multiple
                  className={cn(inputClass, 'min-h-[120px]')}
                  value={microIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
                    setMicroIds(selected)
                  }}
                >
                  {(microQ.data?.data ?? []).map((m: AnyRec) => (
                    <option key={String(m.id ?? m._id)} value={String(m.id ?? m._id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">Hold Cmd/Ctrl to select multiple.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Latitude *</label>
                  <Input
                    type="number"
                    step="any"
                    className="mt-1 rounded-xl"
                    value={loc.latitude ?? ''}
                    onChange={(e) => setLoc({ latitude: e.target.value === '' ? undefined : Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Longitude *</label>
                  <Input
                    type="number"
                    step="any"
                    className="mt-1 rounded-xl"
                    value={loc.longitude ?? ''}
                    onChange={(e) => setLoc({ longitude: e.target.value === '' ? undefined : Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              Map pickers from Angular are not embedded here. Set latitude and longitude manually (or paste from maps).
            </div>
          </div>,
        )}

        {section(
          'Metro detail',
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={!!loc.metro_detail?.is_near_metro}
                onChange={(e) =>
                  setLoc({
                    metro_detail: { ...loc.metro_detail, is_near_metro: e.target.checked },
                  })
                }
              />
              Is metro near?
            </label>
            <div>
              <label className={labelClass}>Nearest metro</label>
              <Input
                className="mt-1 rounded-xl"
                value={loc.metro_detail?.name ?? ''}
                onChange={(e) =>
                  setLoc({
                    metro_detail: { ...loc.metro_detail, name: e.target.value },
                  })
                }
              />
            </div>
          </div>,
        )}

        {section(
          'Amenities (office)',
          <div className="space-y-6">
            {groupedAmenities.map(([cat, items]) => (
              <div key={cat}>
                <h4 className="mb-2 text-sm font-semibold capitalize text-slate-800">{cat}</h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        checked={isAmenitySelected(os.amenties, String(a.id))}
                        onChange={() => setOs({ ...os, amenties: toggleAmenity(os.amenties ?? [], a) })}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>,
        )}

        {section(
          'Images',
          <>
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryPick} />
            <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()}>
              Upload images
            </Button>
            <Table className="mt-4">
              <thead>
                <tr className="bg-slate-50">
                  <Th>Order</Th>
                  <Th>Preview</Th>
                  <Th>Name</Th>
                  <Th>Alt</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(os.images ?? []).length === 0 ? (
                  <Tr>
                    <Td colSpan={5} className="text-center text-slate-500">
                      No images yet.
                    </Td>
                  </Tr>
                ) : null}
                {(os.images ?? []).map((slot: AnyRec, idx: number) => (
                  <Tr key={idx}>
                    <Td>
                      {slot.order ?? idx + 1}
                      {idx === 0 ? <span className="ml-1 text-xs text-violet-600">(Main)</span> : null}
                    </Td>
                    <Td>
                      {slot.image?.s3_link ? (
                        <img src={slot.image.s3_link} alt="" className="h-16 w-24 rounded object-cover" />
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <Input
                        className="rounded-lg"
                        value={slot.image?.real_name ?? ''}
                        onChange={(e) => patchGalleryImage(idx, { real_name: e.target.value })}
                      />
                    </Td>
                    <Td>
                      <Input
                        className="rounded-lg"
                        value={slot.image?.title ?? ''}
                        onChange={(e) => patchGalleryImage(idx, { title: e.target.value })}
                      />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" variant="ghost" onClick={() => moveGallery(idx, -1)}>
                          ↑
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => moveGallery(idx, 1)}>
                          ↓
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => saveGalleryImageMeta(idx)}>
                          Save
                        </Button>
                        <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeGallerySlot(idx)}>
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </>,
        )}

        {section(
          'SEO',
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Title</label>
                <Input className="mt-1 rounded-xl" value={os.seo?.title ?? ''} onChange={(e) => setSeo({ title: e.target.value })} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={indexFlag}
                  onChange={(e) => setIndexFlag(e.target.checked)}
                />
                For indexing (robots)
              </label>
            </div>
            <div>
              <label className={labelClass}>Keywords</label>
              <Input className="mt-1 rounded-xl" value={os.seo?.keywords ?? ''} onChange={(e) => setSeo({ keywords: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={cn(inputClass, 'min-h-[80px]')}
                value={os.seo?.description ?? ''}
                onChange={(e) => setSeo({ description: e.target.value })}
              />
            </div>

            <h4 className="text-sm font-semibold text-slate-800">Twitter card</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Twitter title"
                className="rounded-xl"
                value={os.seo?.twitter?.title ?? ''}
                onChange={(e) =>
                  setSeo({ twitter: { ...(os.seo?.twitter || {}), title: e.target.value } })
                }
              />
              <textarea
                placeholder="Twitter description"
                className={cn(inputClass, 'min-h-[72px]')}
                value={os.seo?.twitter?.description ?? ''}
                onChange={(e) =>
                  setSeo({ twitter: { ...(os.seo?.twitter || {}), description: e.target.value } })
                }
              />
            </div>
            <input ref={seoTwitterRef} type="file" accept="image/*" className="hidden" onChange={(e) => onSeoImagePick(e, 'twitter')} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => seoTwitterRef.current?.click()}>
                Upload Twitter image
              </Button>
              {os.seo?.twitter?.image?.s3_link ? (
                <img src={os.seo.twitter.image.s3_link} alt="" className="h-12 w-24 rounded object-cover" />
              ) : null}
            </div>

            <h4 className="mt-4 text-sm font-semibold text-slate-800">Open Graph</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="OG title"
                className="rounded-xl"
                value={os.seo?.open_graph?.title ?? ''}
                onChange={(e) =>
                  setSeo({ open_graph: { ...(os.seo?.open_graph || {}), title: e.target.value } })
                }
              />
              <textarea
                placeholder="OG description"
                className={cn(inputClass, 'min-h-[72px]')}
                value={os.seo?.open_graph?.description ?? ''}
                onChange={(e) =>
                  setSeo({ open_graph: { ...(os.seo?.open_graph || {}), description: e.target.value } })
                }
              />
            </div>
            <input ref={seoOgRef} type="file" accept="image/*" className="hidden" onChange={(e) => onSeoImagePick(e, 'open_graph')} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => seoOgRef.current?.click()}>
                Upload OG image
              </Button>
              {os.seo?.open_graph?.image?.s3_link ? (
                <img src={os.seo.open_graph.image.s3_link} alt="" className="h-12 w-24 rounded object-cover" />
              ) : null}
            </div>

            <div>
              <label className={labelClass}>Script (without &lt;script&gt; tags)</label>
              <textarea
                className={cn(inputClass, 'min-h-[120px] font-mono text-xs')}
                value={os.seo?.script ?? ''}
                onChange={(e) => setSeo({ script: e.target.value })}
              />
            </div>
          </>,
        )}

        <div className="flex flex-wrap justify-center gap-3 pb-8">
          <Button type="submit" variant="primary" disabled={saveMut.isPending}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={onPreview}>
            Preview
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/office-space')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
