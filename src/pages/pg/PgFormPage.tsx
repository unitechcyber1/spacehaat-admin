import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { MicroLocationPicker } from '../../components/MicroLocationPicker'
import { PageShell } from '../../components/PageShell'
import { RichTextEditor } from '../../components/RichTextEditor/RichTextEditor'
import { Table, Td, Th, Tr } from '../../components/Table'
import { cn } from '../../lib/ui'
import { getCitiesByCountryOnly, getCitiesByState } from '../../services/locations/city.service'
import { getCountries } from '../../services/locations/country.service'
import { getStatesByCountry } from '../../services/locations/state.service'
import {
  changePgStatus,
  createPg,
  getPgById,
  updatePg,
} from '../../services/pg/pg.service'
import { uploadAdminFile } from '../../services/upload/upload.service'
import { buildPgSavePayload, emptyPgForm, normalizePgFromApi, pgRowId } from './pgFormModel'

type AnyRec = Record<string, unknown>

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const inputClass =
  'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500'

function section(title: string, children: React.ReactNode) {
  return (
    <section className="space-y-4 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  )
}

function strArrToLines(arr: unknown): string {
  if (!Array.isArray(arr)) return ''
  return arr.map((x) => String(x ?? '')).join('\n')
}

function linesToStrArr(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function PgFormPage() {
  const { pgId } = useParams<{ pgId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !pgId
  const title = isNew ? 'Add PG' : 'Edit PG'

  const [pg, setPg] = useState<AnyRec | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const detailQ = useQuery({
    queryKey: ['pg', pgId],
    queryFn: () => getPgById(pgId!),
    enabled: !!pgId,
  })

  const countriesQ = useQuery({
    queryKey: ['countries', 'pg-form'],
    queryFn: () => getCountries({ limit: 100_000 }),
    staleTime: 60_000,
  })

  const lids = (pg?.locationIds ?? {}) as AnyRec
  const countryId = String(lids.country ?? '')
  const stateId = String(lids.state ?? '')
  const cityId = String(lids.city ?? '')

  const statesQ = useQuery({
    queryKey: ['states', countryId],
    queryFn: () => getStatesByCountry(countryId),
    enabled: !!countryId,
  })

  const citiesQ = useQuery({
    queryKey: ['cities-pg', stateId, countryId],
    queryFn: () => (stateId ? getCitiesByState(stateId) : getCitiesByCountryOnly(countryId)),
    enabled: !!countryId,
  })

  useEffect(() => {
    if (isNew) {
      setPg(emptyPgForm())
      return
    }
    if (detailQ.data?.data) {
      setPg(normalizePgFromApi(detailQ.data.data as AnyRec))
    }
  }, [isNew, detailQ.data])

  const setRoot = useCallback((patch: AnyRec) => {
    setPg((p) => (p ? { ...p, ...patch } : p))
  }, [])

  const setOwnerDetails = useCallback((patch: AnyRec) => {
    setPg((p) => {
      if (!p) return p
      const cur = ((p.ownerDetails ?? {}) as AnyRec) || {}
      return { ...p, ownerDetails: { ...cur, ...patch } }
    })
  }, [])

  const setLocationIds = useCallback((patch: AnyRec) => {
    setPg((p) => {
      if (!p) return p
      const cur = { ...((p.locationIds as AnyRec) ?? {}) }
      return { ...p, locationIds: { ...cur, ...patch } }
    })
  }, [])

  const setLaundryService = useCallback((patch: AnyRec) => {
    setPg((p) => {
      if (!p) return p
      const cur = { ...((p.laundryService as AnyRec) ?? {}) }
      return { ...p, laundryService: { ...cur, ...patch } }
    })
  }, [])

  const coordLng = (): number | undefined => {
    const c = pg?.location as AnyRec | undefined
    const arr = c?.coordinates as unknown
    if (!Array.isArray(arr) || arr.length < 1) return undefined
    const v = typeof arr[0] === 'number' ? arr[0] : parseFloat(String(arr[0]))
    return Number.isFinite(v) ? v : undefined
  }

  const coordLat = (): number | undefined => {
    const c = pg?.location as AnyRec | undefined
    const arr = c?.coordinates as unknown
    if (!Array.isArray(arr) || arr.length < 2) return undefined
    const v = typeof arr[1] === 'number' ? arr[1] : parseFloat(String(arr[1]))
    return Number.isFinite(v) ? v : undefined
  }

  const setCoord = useCallback((index: 0 | 1, raw: string) => {
    setPg((p) => {
      if (!p) return p
      const loc = (p.location as AnyRec | undefined) ?? { type: 'Point' }
      const prev = Array.isArray(loc.coordinates) ? [...loc.coordinates] : [undefined, undefined]
      const n = raw.trim() === '' ? undefined : parseFloat(raw)
      prev[index] = n != null && Number.isFinite(n) ? n : undefined
      return { ...p, location: { ...loc, type: 'Point', coordinates: prev } }
    })
  }, [])

  const saveMut = useMutation({
    mutationFn: async (body: AnyRec) => {
      const payload = buildPgSavePayload(body)
      const id = pgRowId(body)
      if (isNew || !id) return createPg(payload)
      return updatePg(id, payload)
    },
    onSuccess: (res: unknown, variables) => {
      toast.success('PG saved')
      qc.invalidateQueries({ queryKey: ['pgs'] })
      const envelope = res as AnyRec | undefined
      const saved = envelope?.data as AnyRec | undefined
      const sid = pgRowId(saved) || pgRowId(variables as AnyRec)
      if (isNew && sid) {
        navigate(`/layout/pg/${sid}/edit`, { replace: true })
        return
      }
      if (saved) setPg(normalizePgFromApi(saved))
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? e?.response?.data?.msg ?? e?.message ?? 'Save failed'),
  })

  const statusActMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => changePgStatus(id, body),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['pg', pgId] })
      qc.invalidateQueries({ queryKey: ['pgs'] })
      detailQ.refetch()
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? e?.response?.data?.msg ?? e?.message ?? 'Update failed'),
  })

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!files.length || !pg) return
    try {
      const imgs = [...((pg.images as AnyRec[]) ?? [])] as { image: unknown; order: number }[]
      let orderBase = imgs.length
      for (const file of files) {
        const up = await uploadAdminFile(file)
        if (!up?.id) continue
        imgs.push({
          image: {
            id: up.id,
            s3_link: up.s3_link,
            real_name: up.real_name ?? up.name ?? '',
            name: up.name ?? '',
            title: up.title ?? '',
          },
          order: orderBase++,
        })
      }
      setRoot({ images: imgs })
      toast.success('Images uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    }
  }

  function removeGalleryAt(i: number) {
    setPg((p) => {
      if (!p) return p
      const imgs = [...(((p.images as AnyRec[]) ?? []) as { image: string; order: number }[])]
      imgs.splice(i, 1)
      return { ...p, images: imgs.map((row, idx) => ({ ...row, order: idx })) }
    })
  }

  const cityOptions = useMemo(() => {
    const raw = (citiesQ.data?.data ?? []) as AnyRec[]
    return raw
      .map((c) => ({ id: String(c.id ?? c._id ?? ''), name: c.name }))
      .filter((c) => c.id)
  }, [citiesQ.data?.data])

  function addRoomRow() {
    setPg((p) => {
      if (!p) return p
      const rows = [...((p.pgRooms as AnyRec[]) ?? [])]
      rows.push({ roomType: '', monthlyRent: undefined, expectedDeposit: undefined })
      return { ...p, pgRooms: rows }
    })
  }

  function patchRoomRow(i: number, patch: AnyRec) {
    setPg((p) => {
      if (!p) return p
      const rows = [...((p.pgRooms as AnyRec[]) ?? [])]
      rows[i] = { ...(rows[i] ?? {}), ...patch }
      return { ...p, pgRooms: rows }
    })
  }

  function removeRoomRow(i: number) {
    setPg((p) => {
      if (!p) return p
      const rows = [...((p.pgRooms as AnyRec[]) ?? [])]
      rows.splice(i, 1)
      return { ...p, pgRooms: rows }
    })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pg) return
    if (!String(pg.name ?? '').trim()) {
      toast.error('Name is required.')
      return
    }
    saveMut.mutate(pg)
  }

  if ((!isNew && detailQ.isLoading) || pg === null) {
    return (
      <PageShell title={title} description="Loading…">
        <p className="text-sm text-slate-600">{isNew ? 'Preparing…' : 'Loading PG…'}</p>
      </PageShell>
    )
  }

  if (!isNew && detailQ.isError) {
    return (
      <PageShell title={title} description="Error">
        <p className="text-sm text-rose-600">Could not load this PG.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/layout/pg')}>
          Back to list
        </Button>
      </PageShell>
    )
  }

  const id = pgRowId(pg as AnyRec)
  const images = ((pg.images as AnyRec[]) ?? []) as { image?: unknown; order?: number }[]

  return (
    <PageShell
      title={title}
      description="Minimal PG fields wired to POST/PUT admin PG APIs."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/pg')}>
            Back to list
          </Button>
        </div>
      }
    >
      {!isNew && id ? (
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
          <span className="mr-2 text-sm font-medium text-slate-700">Quick status:</span>
          <Button
            type="button"
            variant="secondary"
            className="text-sm"
            disabled={statusActMut.isPending}
            onClick={() => statusActMut.mutate({ id, body: { active: true } })}
          >
            Set active
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="text-sm"
            disabled={statusActMut.isPending}
            onClick={() => statusActMut.mutate({ id, body: { active: false } })}
          >
            Set inactive
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="text-sm"
            disabled={statusActMut.isPending}
            onClick={() => statusActMut.mutate({ id, body: { adminApproved: true } })}
          >
            Approve (admin)
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="text-sm"
            disabled={statusActMut.isPending}
            onClick={() => statusActMut.mutate({ id, body: { verified: true } })}
          >
            Verify
          </Button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-8">
        {!isNew && id ? (
          <p className="text-xs text-slate-500">
            ID: <code className="rounded bg-slate-100 px-1 py-0.5">{id}</code>
            {typeof pg.views === 'number' ? (
              <>
                {' '}
                · Views: <span className="font-medium text-slate-700">{pg.views}</span>
              </>
            ) : null}
            {typeof pg.adminApprovalDate === 'string' && pg.adminApprovalDate.trim() !== '' ? (
              <>
                {' '}
                · Approved at:{' '}
                <span className="font-medium text-slate-700">{new Date(pg.adminApprovalDate).toLocaleString()}</span>
              </>
            ) : null}
          </p>
        ) : null}

        {section(
          'Owner details',
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Owner name</label>
              <Input
                className={cn(inputClass, 'rounded-xl')}
                value={String(((pg.ownerDetails as AnyRec | undefined)?.name ?? '') as unknown)}
                onChange={(e) => setOwnerDetails({ name: e.target.value })}
                placeholder="Owner name"
              />
            </div>
            <div>
              <label className={labelClass}>Owner email</label>
              <Input
                type="email"
                className={cn(inputClass, 'rounded-xl')}
                value={String(((pg.ownerDetails as AnyRec | undefined)?.email ?? '') as unknown)}
                onChange={(e) => setOwnerDetails({ email: e.target.value })}
                placeholder="Owner email"
              />
            </div>
            <div>
              <label className={labelClass}>Owner phone</label>
              <Input
                className={cn(inputClass, 'rounded-xl')}
                value={String(((pg.ownerDetails as AnyRec | undefined)?.phone ?? '') as unknown)}
                onChange={(e) => setOwnerDetails({ phone: e.target.value })}
                placeholder="Owner phone"
              />
            </div>
          </div>,
        )}

        {section(
          'Basics',
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className={labelClass}>Name *</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.name ?? '')} onChange={(e) => setRoot({ name: e.target.value })} required />
            </div>
            <div>
              <label className={labelClass}>PG external id</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.pg_id ?? '')} onChange={(e) => setRoot({ pg_id: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Listed by user id (optional)</label>
              <Input
                className={cn(inputClass, 'rounded-xl')}
                placeholder="24-char hex userId"
                value={String(pg.userId ?? '')}
                onChange={(e) => setRoot({ userId: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Contact number</label>
              <Input
                className={cn(inputClass, 'rounded-xl')}
                value={String(pg.contactNumber ?? '')}
                onChange={(e) => setRoot({ contactNumber: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Contact email</label>
              <Input
                type="email"
                className={cn(inputClass, 'rounded-xl')}
                value={String(pg.contactEmail ?? '')}
                onChange={(e) => setRoot({ contactEmail: e.target.value })}
              />
            </div>
          </div>,
        )}

        {section(
          'Description',
          <RichTextEditor value={typeof pg.description === 'string' ? pg.description : ''} onChange={(html) => setRoot({ description: html })} />,
        )}

        {section(
          'Address',
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City (display)</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.city ?? '')} onChange={(e) => setRoot({ city: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Locality</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.locality ?? '')} onChange={(e) => setRoot({ locality: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.address ?? '')} onChange={(e) => setRoot({ address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Street</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.street ?? '')} onChange={(e) => setRoot({ street: e.target.value })} />
            </div>
          </div>,
        )}

        {section(
          'Location references (IDs)',
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Country</label>
              <select
                className={inputClass}
                value={countryId}
                onChange={(e) => setLocationIds({ country: e.target.value, state: '', city: '', micro_location: [] })}
              >
                <option value="">Select country</option>
                {(countriesQ.data?.data ?? []).map((c: AnyRec) => (
                  <option key={String(c.id ?? c._id)} value={String(c.id ?? c._id)}>
                    {String(c.name ?? '')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select
                className={inputClass}
                disabled={!countryId}
                value={stateId}
                onChange={(e) => setLocationIds({ state: e.target.value, city: '', micro_location: [] })}
              >
                <option value="">Select state</option>
                {(statesQ.data?.data ?? []).map((s: AnyRec) => (
                  <option key={String(s.id ?? s._id)} value={String(s.id ?? s._id)}>
                    {String(s.name ?? '')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>City (ref)</label>
              <select
                className={inputClass}
                disabled={!countryId}
                value={cityId}
                onChange={(e) => setLocationIds({ city: e.target.value })}
              >
                <option value="">Select city</option>
                {cityOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {String(c.name ?? '')}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Micro-locations</label>
              <div className="mt-1">
                <MicroLocationPicker
                  multiple
                  cityId={cityId}
                  value={Array.isArray(lids.micro_location) ? (lids.micro_location as string[]).map(String) : []}
                  onChange={(ids) => setLocationIds({ micro_location: ids })}
                  disabled={!cityId}
                />
              </div>
            </div>
          </div>,
        )}

        {section(
          'Map coordinates (GeoJSON point)',
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Longitude</label>
              <Input
                type="number"
                step="any"
                className={cn(inputClass, 'rounded-xl')}
                value={coordLng() ?? ''}
                onChange={(e) => setCoord(0, e.target.value)}
                placeholder="-180 — 180"
              />
            </div>
            <div>
              <label className={labelClass}>Latitude</label>
              <Input
                type="number"
                step="any"
                className={cn(inputClass, 'rounded-xl')}
                value={coordLat() ?? ''}
                onChange={(e) => setCoord(1, e.target.value)}
                placeholder="-90 — 90"
              />
            </div>
            <p className="sm:col-span-2 text-xs text-slate-500">Order saved as [longitude, latitude].</p>
          </div>,
        )}

        {section(
          'Gallery',
          <div className="space-y-4">
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryPick} />
            <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()}>
              Upload images
            </Button>
            {images.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Preview</Th>
                    <Th>Image name</Th>
                    <Th>Image id</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {images.map((row, i) => (
                    <Tr key={`${typeof row.image === 'string' ? row.image : (row.image as any)?.id ?? 'img'}-${i}`}>
                      <Td>
                        {row.image && typeof row.image === 'object' && (row.image as any).s3_link ? (
                          <img
                            src={(row.image as any).s3_link as string}
                            alt=""
                            className="h-16 w-24 rounded-xl object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </Td>
                      <Td className="max-w-[260px] truncate text-sm text-slate-700">
                        {row.image && typeof row.image === 'object'
                          ? String(
                              (row.image as any).real_name ??
                                (row.image as any).name ??
                                (row.image as any).title ??
                                '',
                            ) || '—'
                          : '—'}
                      </Td>
                      <Td className="font-mono text-xs">
                        {row.image && typeof row.image === 'object' ? String((row.image as any).id ?? '') : String(row.image ?? '')}
                      </Td>
                      <Td>
                        <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeGalleryAt(i)}>
                          Remove
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-sm text-slate-500">No images yet.</p>
            )}
          </div>,
        )}

        {section(
          'Rooms & rent',
          <div className="space-y-4">
            <Button type="button" variant="secondary" onClick={addRoomRow}>
              Add room
            </Button>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Min monthly rent</label>
                <Input
                  type="number"
                  className={cn(inputClass, 'rounded-xl')}
                  value={pg.minMonthlyRent != null && pg.minMonthlyRent !== '' ? String(pg.minMonthlyRent) : ''}
                  onChange={(e) => setRoot({ minMonthlyRent: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelClass}>Max monthly rent</label>
                <Input
                  type="number"
                  className={cn(inputClass, 'rounded-xl')}
                  value={pg.maxMonthlyRent != null && pg.maxMonthlyRent !== '' ? String(pg.maxMonthlyRent) : ''}
                  onChange={(e) => setRoot({ maxMonthlyRent: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelClass}>Single room price</label>
                <Input
                  type="number"
                  className={cn(inputClass, 'rounded-xl')}
                  value={pg.singleRoomPrice != null && pg.singleRoomPrice !== '' ? String(pg.singleRoomPrice) : ''}
                  onChange={(e) => setRoot({ singleRoomPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
            </div>
            {(pg.pgRooms as AnyRec[])?.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Room type</Th>
                    <Th>Monthly rent</Th>
                    <Th>Deposit</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {((pg.pgRooms as AnyRec[]) ?? []).map((r, i) => (
                    <Tr key={`room-${i}`}>
                      <Td>
                        <Input className={cn(inputClass, 'rounded-lg')} value={String(r.roomType ?? '')} onChange={(e) => patchRoomRow(i, { roomType: e.target.value })} />
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          className={cn(inputClass, 'rounded-lg')}
                          value={r.monthlyRent != null && r.monthlyRent !== '' ? String(r.monthlyRent) : ''}
                          onChange={(e) =>
                            patchRoomRow(i, {
                              monthlyRent: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          className={cn(inputClass, 'rounded-lg')}
                          value={r.expectedDeposit != null && r.expectedDeposit !== '' ? String(r.expectedDeposit) : ''}
                          onChange={(e) =>
                            patchRoomRow(i, {
                              expectedDeposit: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </Td>
                      <Td>
                        <Button type="button" variant="ghost" className="text-rose-700" onClick={() => removeRoomRow(i)}>
                          Remove
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </div>,
        )}

        {section(
          'Policies, food & amenities',
          <div className="space-y-8">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Notice & maintenance</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={Boolean(pg.noticePeriod)}
                    onChange={(e) => setRoot({ noticePeriod: e.target.checked })}
                  />
                  Notice period
                </label>
                <div>
                  <label className={labelClass}>Notice period duration</label>
                  <Input
                    type="number"
                    min={0}
                    className={cn(inputClass, 'rounded-xl')}
                    value={pg.noticePeriodDuration != null ? String(pg.noticePeriodDuration) : '0'}
                    onChange={(e) =>
                      setRoot({
                        noticePeriodDuration: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={Boolean(pg.maintenanceAmount)}
                    onChange={(e) => setRoot({ maintenanceAmount: e.target.checked })}
                  />
                  Maintenance amount
                </label>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className={labelClass}>Maintenance amount value</label>
                  <Input
                    className={cn(inputClass, 'rounded-xl')}
                    value={String(pg.maintenanceAmountValue ?? '')}
                    onChange={(e) => setRoot({ maintenanceAmountValue: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Food & rules</h4>
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={Boolean(pg.foodIncluded)}
                    onChange={(e) => setRoot({ foodIncluded: e.target.checked })}
                  />
                  Food included
                </label>
                <div>
                  <label className={labelClass}>Included meals</label>
                  <p className="mb-1 text-xs text-slate-500">One item per line.</p>
                  <textarea
                    className={cn(inputClass, 'min-h-[96px] resize-y')}
                    value={strArrToLines(pg.includedMeals)}
                    onChange={(e) => setRoot({ includedMeals: linesToStrArr(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>PG / hostel rules</label>
                  <p className="mb-1 text-xs text-slate-500">One rule per line.</p>
                  <textarea
                    className={cn(inputClass, 'min-h-[96px] resize-y')}
                    value={strArrToLines(pg.pgHostelRule)}
                    onChange={(e) => setRoot({ pgHostelRule: linesToStrArr(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Laundry & facilities</h4>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={Boolean(pg.isLaundryService)}
                    onChange={(e) => setRoot({ isLaundryService: e.target.checked })}
                  />
                  Laundry service
                </label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={Boolean(pg.roomCleaning)}
                      onChange={(e) => setRoot({ roomCleaning: e.target.checked })}
                    />
                    Room cleaning
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={Boolean(pg.waterFacility)}
                      onChange={(e) => setRoot({ waterFacility: e.target.checked })}
                    />
                    Water facility
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={Boolean(pg.parking)}
                      onChange={(e) => setRoot({ parking: e.target.checked })}
                    />
                    Parking
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                  <div>
                    <label className={labelClass}>Laundry — title</label>
                    <Input
                      className={cn(inputClass, 'rounded-xl')}
                      value={String(((pg.laundryService as AnyRec)?.title ?? '') as unknown)}
                      onChange={(e) => setLaundryService({ title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Laundry — days</label>
                    <Input
                      className={cn(inputClass, 'rounded-xl')}
                      value={String(((pg.laundryService as AnyRec)?.days ?? '') as unknown)}
                      onChange={(e) => setLaundryService({ days: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Amenity lists</h4>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className={labelClass}>Available amenities</label>
                  <p className="mb-1 text-xs text-slate-500">One per line.</p>
                  <textarea
                    className={cn(inputClass, 'min-h-[120px] resize-y')}
                    value={strArrToLines(pg.availableAmenities)}
                    onChange={(e) => setRoot({ availableAmenities: linesToStrArr(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Room amenities</label>
                  <p className="mb-1 text-xs text-slate-500">One per line.</p>
                  <textarea
                    className={cn(inputClass, 'min-h-[120px] resize-y')}
                    value={strArrToLines(pg.roomAmenities)}
                    onChange={(e) => setRoot({ roomAmenities: linesToStrArr(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Gate</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={Boolean(pg.gateClosing)}
                    onChange={(e) => setRoot({ gateClosing: e.target.checked })}
                  />
                  Gate closing
                </label>
                <div>
                  <label className={labelClass}>Gate closing time</label>
                  <Input
                    className={cn(inputClass, 'rounded-xl')}
                    placeholder="e.g. 10:00 PM"
                    value={String(pg.gateClosingTime ?? '')}
                    onChange={(e) => setRoot({ gateClosingTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>,
        )}

        {section(
          'Publishing',
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Status</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.status ?? '')} onChange={(e) => setRoot({ status: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Form status</label>
              <Input className={cn(inputClass, 'rounded-xl')} value={String(pg.form_status ?? '')} onChange={(e) => setRoot({ form_status: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 pt-8 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={Boolean(pg.active)}
                onChange={(e) => setRoot({ active: e.target.checked })}
              />
              Active
            </label>
            <label className="flex items-center gap-2 pt-8 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={Boolean(pg.verified)}
                onChange={(e) => setRoot({ verified: e.target.checked })}
              />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={Boolean(pg.adminApproved)}
                onChange={(e) => setRoot({ adminApproved: e.target.checked })}
              />
              Admin approved
            </label>
          </div>,
        )}

        <Button type="submit" variant="primary" disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Saving…' : 'Save PG'}
        </Button>
      </form>
    </PageShell>
  )
}
