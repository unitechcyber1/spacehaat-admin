import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Field, Input, Select, Textarea } from '../../components/Input'
import { FormSection } from '../../components/FormSection'
import { PageShell } from '../../components/PageShell'
import { uploadAdminFile } from '../../services/upload/upload.service'
import {
  formatInr,
  getVirtualOffice,
  getVirtualOfficeStats,
  saveVirtualOffice,
  VO_AMENITY_PICKS,
  VO_TIERS,
  errorMessage,
  type VirtualOfficeListing,
  type VoImage,
} from '../../services/virtual-office/virtualOffice.service'

const LIST_PATH = '/layout/virtual-office'

function emptyVo(): VirtualOfficeListing {
  return {
    spaceName: '',
    city: '',
    state: '',
    locality: '',
    fullAddress: '',
    phoneNumber: '',
    status: 'Active',
    annualPriceInr: 0,
    sellingPriceInr: 0,
    cityTier: '',
    amenities: 'Business Address, Mail Handling',
    contactNotes: '',
    remarks: '',
    couponCode: '',
    couponPercentage: 0,
    images: [],
  }
}

const splitAmenities = (s?: string) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)

export function VirtualOfficeFormPage() {
  const { voId } = useParams<{ voId: string }>()
  const isEdit = Boolean(voId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<VirtualOfficeListing>(emptyVo)
  const [uploading, setUploading] = useState(false)

  const existingQ = useQuery({ queryKey: ['virtual-offices', 'one', voId], queryFn: () => getVirtualOffice(voId!), enabled: isEdit })
  const statsQ = useQuery({ queryKey: ['virtual-offices', 'stats'], queryFn: getVirtualOfficeStats, staleTime: 60_000 })

  useEffect(() => {
    if (!isEdit) setForm(emptyVo())
    else if (existingQ.data) setForm({ ...emptyVo(), ...existingQ.data })
  }, [isEdit, existingQ.data])

  const saveMut = useMutation({
    mutationFn: (payload: VirtualOfficeListing) => saveVirtualOffice(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Virtual office saved' : 'Virtual office added')
      qc.invalidateQueries({ queryKey: ['virtual-offices'] })
      navigate(LIST_PATH)
    },
    onError: (e: unknown) => toast.error(errorMessage(e, 'Save failed')),
  })

  const set = <K extends keyof VirtualOfficeListing>(key: K, value: VirtualOfficeListing[K]) => setForm((f) => ({ ...f, [key]: value }))
  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0))

  const amenities = splitAmenities(form.amenities)
  const toggleAmenity = (name: string) => {
    const next = amenities.includes(name) ? amenities.filter((a) => a !== name) : [...amenities, name]
    set('amenities', next.join(', '))
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const added: VoImage[] = []
      for (const file of Array.from(files)) {
        const img = await uploadAdminFile(file, 'virtual-office')
        const url = img?.s3_link || img?.url
        if (url) added.push({ url, name: img?.real_name || file.name })
      }
      setForm((f) => ({ ...f, images: [...(f.images || []), ...added] }))
      if (added.length) toast.success(`${added.length} photo${added.length === 1 ? '' : 's'} added`)
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Upload failed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const moveImage = (i: number, dir: -1 | 1) => {
    setForm((f) => {
      const list = [...(f.images || [])]
      const j = i + dir
      if (j < 0 || j >= list.length) return f
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...f, images: list }
    })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.spaceName.trim() || !form.city.trim()) {
      toast.error('Space name and city are required.')
      return
    }
    const code = String(form.couponCode || '').trim().toUpperCase()
    const pct = Number(form.couponPercentage) || 0
    if (code && (pct <= 0 || pct > 100)) {
      toast.error('Enter a coupon discount between 1 and 100%.')
      return
    }
    saveMut.mutate({ ...form, couponCode: code, couponPercentage: code ? pct : 0 })
  }

  const selling = form.sellingPriceInr || 0
  const operator = form.annualPriceInr || 0
  const pct = form.couponCode?.trim() ? Number(form.couponPercentage) || 0 : 0
  const afterCoupon = pct ? Math.round(selling * (1 - pct / 100)) : selling

  return (
    <PageShell
      title={isEdit ? form.spaceName || 'Edit virtual office' : 'Add virtual office'}
      description={isEdit ? [form.locality, form.city].filter(Boolean).join(', ') : 'A business-address plan in one city.'}
      actions={<Button variant="secondary" onClick={() => navigate(LIST_PATH)}>Back to list</Button>}
    >
      {isEdit && existingQ.isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : isEdit && existingQ.isError ? (
        <p className="text-sm text-rose-600">Could not load this virtual office.</p>
      ) : (
        <form onSubmit={onSubmit} className="form-page">
          <FormSection title="Space" description="Who runs it and where it is.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Space name" required>
                <Input value={form.spaceName} onChange={(e) => set('spaceName', e.target.value)} placeholder="e.g. Vision Cowork" required />
              </Field>
              <Field label="City" required hint="Pick an existing city or type a new one.">
                <Input list="vo-city-list" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" required />
                <datalist id="vo-city-list">
                  {(statsQ.data?.cities ?? []).map((c) => <option key={c.city} value={c.city} />)}
                </datalist>
              </Field>
              <Field label="Locality / area">
                <Input value={form.locality ?? ''} onChange={(e) => set('locality', e.target.value)} placeholder="e.g. Saket" />
              </Field>
              <Field label="State">
                <Input value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} placeholder="e.g. Delhi" />
              </Field>
              <Field label="Full address" className="sm:col-span-2">
                <Textarea rows={2} value={form.fullAddress ?? ''} onChange={(e) => set('fullAddress', e.target.value)} placeholder="Address that goes on the customer's documents" />
              </Field>
              <Field label="Phone number">
                <Input value={form.phoneNumber ?? ''} onChange={(e) => set('phoneNumber', e.target.value)} placeholder="Operator contact" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => set('status', e.target.value as VirtualOfficeListing['status'])}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </Field>
                <Field label="City tier">
                  <Select value={form.cityTier ?? ''} onChange={(e) => set('cityTier', e.target.value)}>
                    <option value="">—</option>
                    {VO_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection title="Price" description="Yearly prices. Monthly figures are worked out on save.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Operator price (₹/year)" hint="What the operator charges us. Not shown to customers.">
                <Input type="number" min={0} value={form.annualPriceInr || ''} onChange={(e) => set('annualPriceInr', num(e.target.value))} placeholder="0" />
              </Field>
              <Field label="Selling price (₹/year)" hint="What the customer pays.">
                <Input type="number" min={0} value={form.sellingPriceInr || ''} onChange={(e) => set('sellingPriceInr', num(e.target.value))} placeholder="0" />
              </Field>
              <div className="rounded-xl bg-surface-2 p-3 text-sm">
                <div className="text-muted">Per month: <b className="text-ink">{formatInr(selling / 12)}</b></div>
                <div className="text-muted">Margin / year: <b className={selling - operator >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{selling && operator ? formatInr(selling - operator) : '—'}</b></div>
                {pct ? <div className="text-muted">After coupon: <b className="text-ink">{formatInr(afterCoupon)}</b></div> : null}
              </div>
              <Field label="Coupon code" hint="Optional, for this plan only. e.g. VO10">
                <Input value={form.couponCode ?? ''} onChange={(e) => set('couponCode', e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="None" />
              </Field>
              <Field label="Coupon discount (%)">
                <Input type="number" min={0} max={100} disabled={!form.couponCode?.trim()} value={form.couponCode?.trim() ? form.couponPercentage || '' : ''} onChange={(e) => set('couponPercentage', num(e.target.value))} placeholder="0" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="What's included" description="Tick the common ones, or type others separated by commas.">
            <div className="mb-3 flex flex-wrap gap-2">
              {VO_AMENITY_PICKS.map((a) => {
                const on = amenities.includes(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={on ? 'btn sm primary' : 'btn sm'}
                    aria-pressed={on}
                  >
                    {a}
                  </button>
                )
              })}
            </div>
            <Input value={form.amenities ?? ''} onChange={(e) => set('amenities', e.target.value)} placeholder="Business Address, Mail Handling, …" />
          </FormSection>

          <FormSection title="Notes" description="Internal only.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact / notes">
                <Textarea rows={2} value={form.contactNotes ?? ''} onChange={(e) => set('contactNotes', e.target.value)} placeholder="Who to call, how they bill…" />
              </Field>
              <Field label="Remarks">
                <Textarea rows={2} value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} placeholder="e.g. Price checked Apr 2025" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Photos" description="The first photo is the cover.">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <div className="flex flex-wrap gap-3">
              {(form.images || []).map((img, i) => (
                <div key={`${img.url}-${i}`} className="relative w-36 overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <img src={img.url} alt={img.name || `Photo ${i + 1}`} className="h-24 w-full object-cover" />
                  <div className="flex items-center justify-between px-1.5 py-1 text-xs">
                    <span className="text-muted">{i === 0 ? 'Cover' : `#${i + 1}`}</span>
                    <span className="flex gap-1">
                      <button type="button" className="px-1 disabled:opacity-30" disabled={i === 0} onClick={() => moveImage(i, -1)} aria-label="Move left">←</button>
                      <button type="button" className="px-1 disabled:opacity-30" disabled={i === (form.images?.length || 0) - 1} onClick={() => moveImage(i, 1)} aria-label="Move right">→</button>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-rose-700 shadow"
                    onClick={() => set('images', (form.images || []).filter((_, j) => j !== i))}
                    aria-label="Remove photo"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex h-[7.5rem] w-36 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-muted hover:border-violet-400 hover:text-ink"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : '+ Add photos'}
              </button>
            </div>
          </FormSection>

          <div className="form-actions-bar">
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saveMut.isPending || uploading}>
              {saveMut.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add virtual office'}
            </Button>
          </div>
        </form>
      )}
    </PageShell>
  )
}
