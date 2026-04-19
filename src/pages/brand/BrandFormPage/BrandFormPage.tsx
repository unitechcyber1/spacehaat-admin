import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../../components/Button'
import { CityMultiSelect } from '../../../components/CityMultiSelect'
import { Input } from '../../../components/Input'
import { PageShell } from '../../../components/PageShell'
import { cn } from '../../../lib/ui'
import { getBrandById, saveBrand } from '../../../services/brand/brand.service'
import type { Brand, BrandImageSlot, BrandSeo } from '../../../services/brand/types'
import { getCities } from '../../../services/locations/city.service'
import { uploadAdminFile } from '../../../services/upload/upload.service'
import { deleteS3File, saveUploadImageMeta } from '../../../services/workspace/workspace.service'

const BRAND_TYPES = [
  { id: 'coworking', name: 'Co Working' },
  { id: 'coliving', name: 'Co Living' },
  { id: 'officespace', name: 'Office Space' },
  { id: 'flat', name: 'Flat' },
]

function emptySeo(): BrandSeo {
  return {
    title: '',
    description: '',
    keywords: '',
    robots: 'index, follow',
    footer_title: '',
    footer_description: '',
    twitter: { title: '', description: '' },
    open_graph: { title: '', description: '' },
  }
}

function stripEmptySocialImage<T extends { image?: { id?: string; s3_link?: string } }>(block: T): T {
  const next = { ...block } as T
  const img = next.image
  if (!img?.id) {
    delete (next as { image?: unknown }).image
  } else {
    next.image = { id: img.id, s3_link: img.s3_link }
  }
  return next
}

/** Brand save payload: image ids only; omit empty `seo.*.image` objects (some APIs return 400). */
function toSavePayload(payload: Brand): Brand {
  const object: Brand = { ...payload }
  object.image = ((payload.image as { id?: string } | null)?.id ?? null) as any
  object.images = (payload.images ?? [])
    .filter((item) => item.image?.id)
    .map((item) => ({
      order: item.order,
      image: item.image!.id,
    })) as any

  if (payload.seo) {
    object.seo = {
      ...payload.seo,
      twitter: stripEmptySocialImage({ ...payload.seo.twitter }),
      open_graph: stripEmptySocialImage({ ...payload.seo.open_graph }),
    }
  }

  if (!object.id) {
    delete (object as { id?: string }).id
  }

  return object
}

function emptyBrand(): Brand {
  return {
    name: '',
    description: '',
    order: 0,
    review: '',
    type: '',
    brand_tag: '',
    brand_tag_line: '',
    logo_tag_line: '',
    should_show_on_home: false,
    trusted_user: false,
    google_sheet_url: '',
    image: null,
    images: [],
    cities: [],
    seo: emptySeo(),
  }
}

function normalizeImageOrders(images: BrandImageSlot[] | undefined) {
  if (!images?.length) return []
  return images.map((item, idx) => ({
    ...item,
    order: idx + 1,
  }))
}

export function BrandFormPage() {
  const { brandId } = useParams<{ brandId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !brandId

  const [brand, setBrand] = useState<Brand>(emptyBrand)
  const [indexFlag, setIndexFlag] = useState(true)
  const logoRef = useRef<HTMLInputElement>(null)
  const communityRef = useRef<HTMLInputElement>(null)
  const twitterRef = useRef<HTMLInputElement>(null)
  const ogRef = useRef<HTMLInputElement>(null)

  const citiesQ = useQuery({
    queryKey: ['cities', 'dropdown'],
    queryFn: () => getCities({ dropdown: 1 }),
    staleTime: 60_000,
  })
  const cities = citiesQ.data?.data ?? []

  const detailQ = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrandById(brandId!),
    enabled: !isNew && !!brandId,
    staleTime: 0,
  })

  useEffect(() => {
    if (!detailQ.data?.data) return
    const b = detailQ.data.data as Brand
    const cityIds = Array.isArray(b.cities)
      ? b.cities.map((c: any) => (typeof c === 'string' ? c : c?.id)).filter(Boolean)
      : []
    setBrand({
      ...emptyBrand(),
      ...b,
      seo: { ...emptySeo(), ...b.seo, twitter: { ...emptySeo().twitter, ...b.seo?.twitter }, open_graph: { ...emptySeo().open_graph, ...b.seo?.open_graph } },
      images: normalizeImageOrders(b.images),
      cities: cityIds as string[],
    })
    const robots = b.seo?.robots
    setIndexFlag(robots === 'index, follow')
  }, [detailQ.data])

  const saveMut = useMutation({
    mutationFn: async (payload: Brand) => {
      const object = toSavePayload(payload)
      if (object.should_show_on_home && !object.image) {
        throw new Error("Logo is required when 'Should show on home' is enabled.")
      }
      return saveBrand(object)
    },
    onSuccess: () => {
      toast.success('Brand saved')
      qc.invalidateQueries({ queryKey: ['brands'] })
      navigate('/layout/brand')
    },
    onError: (e: any) => {
      const data = e?.response?.data
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        (Array.isArray(data?.errors) && data.errors.join(', ')) ||
        e?.message ||
        'Save failed'
      toast.error(msg)
    },
  })

  function logIndexFlag(next: boolean) {
    setIndexFlag(next)
    setBrand((b) => ({
      ...b,
      seo: {
        ...(b.seo ?? emptySeo()),
        robots: next ? 'index, follow' : 'noindex, nofollow',
      },
    }))
  }

  async function onLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const uploaded = await uploadAdminFile(f)
      setBrand((b) => ({ ...b, image: uploaded as any }))
      toast.success('Logo uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
  }

  async function onCommunityPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length) return
    try {
      const uploadedSlots: BrandImageSlot[] = []
      for (const file of files) {
        const uploaded = await uploadAdminFile(file)
        if (!(uploaded as { id?: string })?.id) {
          throw new Error('Upload response missing file id — check the upload response shape.')
        }
        uploadedSlots.push({ order: 0, image: uploaded as BrandImageSlot['image'] })
      }
      setBrand((b) => {
        const base = [...(b.images ?? [])]
        const start = base.length
        uploadedSlots.forEach((slot, i) => {
          base.push({ ...slot, order: start + i + 1 })
        })
        return { ...b, images: normalizeImageOrders(base) }
      })
      toast.success(files.length === 1 ? 'Image added' : `${files.length} images added`)
    } catch (err: any) {
      const data = err?.response?.data
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        err?.message ||
        'Upload failed'
      toast.error(msg)
    }
  }

  async function removeLogo() {
    if (!brand.image) return
    try {
      await deleteS3File(brand.image)
      setBrand((b) => ({ ...b, image: null }))
      toast.success('Logo removed')
    } catch {
      toast.error('Could not remove file')
    }
  }

  async function removeCommunity(idx: number) {
    const slot = brand.images?.[idx]
    if (!slot?.image) return
    try {
      await deleteS3File(slot.image)
      const next = (brand.images ?? []).filter((_, i) => i !== idx)
      setBrand((b) => ({ ...b, images: normalizeImageOrders(next) }))
      toast.success('Image removed')
    } catch {
      toast.error('Could not remove file')
    }
  }

  function moveCommunity(idx: number, dir: -1 | 1) {
    const list = [...(brand.images ?? [])]
    const j = idx + dir
    if (j < 0 || j >= list.length) return
    ;[list[idx], list[j]] = [list[j], list[idx]]
    setBrand((b) => ({ ...b, images: normalizeImageOrders(list) }))
  }

  async function saveCommunityImageMeta(image: any) {
    try {
      await saveUploadImageMeta(image)
      toast.success('Image details saved')
    } catch {
      toast.error('Save failed')
    }
  }

  async function onSeoImage(e: React.ChangeEvent<HTMLInputElement>, which: 'twitter' | 'open_graph') {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const uploaded = await uploadAdminFile(f)
      const img = uploaded as any
      setBrand((b) => ({
        ...b,
        seo: {
          ...(b.seo ?? emptySeo()),
          [which]: {
            ...(which === 'twitter' ? b.seo?.twitter : b.seo?.open_graph),
            image: { id: img.id, s3_link: img.s3_link },
          },
        },
      }))
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
  }

  const title = useMemo(() => (isNew ? 'Add brand' : 'Edit brand'), [isNew])

  if (!isNew && detailQ.isLoading) {
    return (
      <PageShell title={title} description="Loading…">
        <div className="text-sm text-slate-600">Loading brand…</div>
      </PageShell>
    )
  }

  if (!isNew && detailQ.isError) {
    return (
      <PageShell title={title} description="Error">
        <div className="text-sm text-rose-600">Could not load brand.</div>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/layout/brand')}>
          Back to list
        </Button>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={title}
      description="Brand details, media, cities, and SEO."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/layout/brand')}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saveMut.isPending} onClick={() => saveMut.mutate(brand)}>
            {saveMut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-8 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70 backdrop-blur sm:p-8"
        onSubmit={(e) => {
          e.preventDefault()
          saveMut.mutate(brand)
        }}
      >
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Brand details</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Name *</label>
              <Input className="mt-1" value={brand.name ?? ''} onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Type</label>
              <select
                className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={brand.type ?? ''}
                onChange={(e) => setBrand((b) => ({ ...b, type: e.target.value }))}
              >
                <option value="">Choose type</option>
                {BRAND_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Rating</label>
              <Input className="mt-1" value={brand.review ?? ''} onChange={(e) => setBrand((b) => ({ ...b, review: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Order *</label>
              <Input
                className="mt-1"
                type="number"
                value={brand.order ?? 0}
                onChange={(e) => setBrand((b) => ({ ...b, order: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={!!brand.should_show_on_home}
                  onChange={(e) => setBrand((b) => ({ ...b, should_show_on_home: e.target.checked }))}
                />
                Should show on home
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                className={cn(
                  'mt-1 min-h-[88px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200',
                  'focus:outline-none focus:ring-2 focus:ring-violet-500',
                )}
                value={brand.description ?? ''}
                onChange={(e) => setBrand((b) => ({ ...b, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Brand tag</label>
              <Input className="mt-1" value={brand.brand_tag ?? ''} onChange={(e) => setBrand((b) => ({ ...b, brand_tag: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Brand tag line</label>
              <Input className="mt-1" value={brand.brand_tag_line ?? ''} onChange={(e) => setBrand((b) => ({ ...b, brand_tag_line: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Logo tag line</label>
              <Input className="mt-1" value={brand.logo_tag_line ?? ''} onChange={(e) => setBrand((b) => ({ ...b, logo_tag_line: e.target.value }))} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={!!brand.trusted_user}
                  onChange={(e) => setBrand((b) => ({ ...b, trusted_user: e.target.checked }))}
                />
                Trusted by user
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Logo</h3>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={onLogoPick} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => logoRef.current?.click()}>
              Upload logo
            </Button>
            {brand.image ? (
              <>
                <img src={brand.image.s3_link} alt="" className="h-14 max-w-[120px] rounded-lg object-contain ring-1 ring-slate-200" />
                <Button type="button" variant="ghost" className="text-rose-700" onClick={removeLogo}>
                  Remove
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Community photos</h3>
          <input ref={communityRef} type="file" accept="image/*" multiple className="hidden" onChange={onCommunityPick} />
          <Button type="button" variant="secondary" onClick={() => communityRef.current?.click()}>
            Add photos
          </Button>
          <div className="space-y-4">
            {(brand.images ?? []).map((slot, idx) =>
              slot.image ? (
                <div key={idx} className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-200/80">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="text-center text-xs text-slate-500">
                      <div className="font-semibold text-slate-700">Order {slot.order}</div>
                      {idx === 0 ? <div className="text-violet-600">Main</div> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => slot.image && window.open(slot.image.s3_link, '_blank')}
                      className="shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200"
                    >
                      <img src={slot.image.s3_link} alt="" className="h-24 w-36 object-cover" />
                    </button>
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="File name"
                        value={slot.image.real_name ?? ''}
                        onChange={(e) => {
                          const next = [...(brand.images ?? [])]
                          if (next[idx]?.image) next[idx].image!.real_name = e.target.value
                          setBrand((b) => ({ ...b, images: next }))
                        }}
                      />
                      <Input
                        placeholder="Alt text"
                        value={slot.image.title ?? ''}
                        onChange={(e) => {
                          const next = [...(brand.images ?? [])]
                          if (next[idx]?.image) next[idx].image!.title = e.target.value
                          setBrand((b) => ({ ...b, images: next }))
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button type="button" variant="ghost" onClick={() => moveCommunity(idx, -1)}>
                        ↑
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => moveCommunity(idx, 1)}>
                        ↓
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => saveCommunityImageMeta(slot.image)}>
                        Save meta
                      </Button>
                      <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeCommunity(idx)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Cities</h3>
          <CityMultiSelect
            cities={cities.map((c: { id: string; name?: string }) => ({
              id: String(c.id),
              name: String(c.name ?? ''),
            }))}
            value={(brand.cities ?? []).map(String)}
            onChange={(ids) => setBrand((b) => ({ ...b, cities: ids }))}
            loading={citiesQ.isLoading}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Google Sheet URL</h3>
          <Input
            value={(brand.google_sheet_url as string) ?? ''}
            onChange={(e) => setBrand((b) => ({ ...b, google_sheet_url: e.target.value }))}
            placeholder="Sheet URL"
          />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">SEO</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Meta title *</label>
              <Input
                className="mt-1"
                value={brand.seo?.title ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: { ...(b.seo ?? emptySeo()), title: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="flex items-center pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={indexFlag}
                  onChange={(e) => logIndexFlag(e.target.checked)}
                />
                Allow indexing (robots)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Keywords</label>
              <Input
                className="mt-1"
                value={brand.seo?.keywords ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: { ...(b.seo ?? emptySeo()), keywords: e.target.value },
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Meta description *</label>
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={brand.seo?.description ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: { ...(b.seo ?? emptySeo()), description: e.target.value },
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Twitter title</label>
              <Input
                className="mt-1"
                value={brand.seo?.twitter?.title ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: {
                      ...(b.seo ?? emptySeo()),
                      twitter: { ...(b.seo?.twitter ?? {}), title: e.target.value },
                    },
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Twitter description</label>
              <textarea
                className="mt-1 min-h-[64px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                value={brand.seo?.twitter?.description ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: {
                      ...(b.seo ?? emptySeo()),
                      twitter: { ...(b.seo?.twitter ?? {}), description: e.target.value },
                    },
                  }))
                }
              />
            </div>
            <div>
              <input ref={twitterRef} type="file" accept="image/*" className="hidden" onChange={(e) => onSeoImage(e, 'twitter')} />
              <Button type="button" variant="secondary" onClick={() => twitterRef.current?.click()}>
                Twitter image
              </Button>
              {brand.seo?.twitter?.image?.s3_link ? (
                <img src={brand.seo.twitter.image.s3_link} alt="" className="mt-2 h-12 rounded ring-1 ring-slate-200" />
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Open Graph title</label>
              <Input
                className="mt-1"
                value={brand.seo?.open_graph?.title ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: {
                      ...(b.seo ?? emptySeo()),
                      open_graph: { ...(b.seo?.open_graph ?? {}), title: e.target.value },
                    },
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Open Graph description</label>
              <textarea
                className="mt-1 min-h-[64px] w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                value={brand.seo?.open_graph?.description ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: {
                      ...(b.seo ?? emptySeo()),
                      open_graph: { ...(b.seo?.open_graph ?? {}), description: e.target.value },
                    },
                  }))
                }
              />
            </div>
            <div>
              <input ref={ogRef} type="file" accept="image/*" className="hidden" onChange={(e) => onSeoImage(e, 'open_graph')} />
              <Button type="button" variant="secondary" onClick={() => ogRef.current?.click()}>
                Open Graph image
              </Button>
              {brand.seo?.open_graph?.image?.s3_link ? (
                <img src={brand.seo.open_graph.image.s3_link} alt="" className="mt-2 h-12 rounded ring-1 ring-slate-200" />
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Footer title</label>
              <Input
                className="mt-1"
                value={brand.seo?.footer_title ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: { ...(b.seo ?? emptySeo()), footer_title: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Footer description (HTML welcome)</label>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg bg-white px-3 py-2 text-sm font-mono ring-1 ring-slate-200"
                value={brand.seo?.footer_description ?? ''}
                onChange={(e) =>
                  setBrand((b) => ({
                    ...b,
                    seo: { ...(b.seo ?? emptySeo()), footer_description: e.target.value },
                  }))
                }
                placeholder="Rich text / HTML"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/brand')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
