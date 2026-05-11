import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { PageShell } from '../../components/PageShell'
import { getMicroLocations } from '../../services/locations/microLocation.service'
import {
  getSpacehaatUserById,
  updateSpacehaatUserAccess,
} from '../../services/spacehaat-users/spacehaatUsers.service'
import { LEAD_SOURCE_OPTIONS } from '../enquiry/enquiryConstants'
import { SPACEHAAT_ACCESS_MENU } from './spacehaatUserAccessMenu'
import { cloneSpaceTypeTemplate } from './spaceAccessCitiesTemplate'

const CRM_PATH = '/layout/enquiry'

const DEFAULT_SHOWN_FILTER: Record<string, boolean> = {
  interestedIn: false,
  location: false,
  address: false,
  space_type: false,
  status: false,
  budget: false,
  seats: false,
  dateTime: false,
}

const DEFAULT_SHOWN_COLUMN: Record<string, boolean> = {
  interestedIn: false,
  location: false,
  address: false,
  space_type: false,
  status: false,
  budget: false,
  seats: false,
  dateTime: false,
  pageUrl: false,
  leadId: false,
  delete: false,
  editlead: false,
  comments: false,
}

function spaceParamsForLocation(space: string): Record<string, unknown> {
  if (space === 'Web Coworking') return { for_coworking: true, space_type: 'for_coworking', limit: 1000 }
  if (space === 'Web Coliving') return { for_coliving: true, space_type: 'for_coliving', limit: 1000 }
  if (space === 'Web Office Space') return { for_office: true, space_type: 'for_office', limit: 1000 }
  if (space === 'Web Virtual Office') return { for_coworking: true, space_type: 'for_coworking', limit: 1000 }
  return { limit: 1000 }
}

function convertSpaceLabel(space: string) {
  if (space === 'Web Coworking') return 'Coworking'
  if (space === 'Web Coliving') return 'Coliving'
  if (space === 'Web Office Space') return 'Office Space'
  if (space === 'Web Virtual Office') return 'Virtual Office'
  if (space === 'Web Others') return 'Others'
  return space
}

function mergeUserIntoSpaceType(tree: any[], savedEnquiry: any[]) {
  if (!Array.isArray(savedEnquiry)) return
  for (const space of tree) {
    const spaceData = savedEnquiry.find((d) => d.space === space.space)
    if (!spaceData) continue
    space.checked = true
    for (const city of space.cities) {
      const cityData = spaceData.cities?.find((c: any) => c.city === city.name)
      if (!cityData) continue
      city.checked = true
      if (!Array.isArray(city.locations)) city.locations = []
      if (Array.isArray(cityData.locations)) city.locations = [...cityData.locations]
      for (const seat of city.seats || []) {
        if (cityData.seats?.includes(seat.name)) seat.checked = true
      }
      for (const t of city.workSpaceType || []) {
        if (cityData.workSpaceType?.includes(t.name)) t.checked = true
      }
      for (const t of city.colivingType || []) {
        if (cityData.colivingType?.includes(t.name)) t.checked = true
      }
      for (const b of city.budget || []) {
        if (cityData.budget?.includes(b.name)) b.checked = true
      }
    }
  }
}

function buildEnquiryPayload(tree: any[]) {
  const out: any[] = []
  for (const space of tree) {
    if (!space.checked) continue
    const cities: any[] = []
    for (const city of space.cities) {
      if (!city.checked) continue
      cities.push({
        city: city.name,
        seats: (city.seats || []).filter((s: any) => s.checked).map((s: any) => s.name),
        budget: (city.budget || []).filter((s: any) => s.checked).map((s: any) => s.name),
        workSpaceType: (city.workSpaceType || []).filter((s: any) => s.checked).map((s: any) => s.name),
        colivingType: (city.colivingType || []).filter((s: any) => s.checked).map((s: any) => s.name),
        locations: Array.isArray(city.locations) ? city.locations : [],
      })
    }
    out.push({ space: space.space, cities })
  }
  return out
}

export function SpacehaatUserAccessPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const userQ = useQuery({
    queryKey: ['spacehaat-user', userId, 'access'],
    queryFn: () => getSpacehaatUserById(userId!),
    enabled: Boolean(userId),
  })

  const user = userQ.data?.data as Record<string, any> | undefined

  const [spaceType, setSpaceType] = useState<any[]>(() => cloneSpaceTypeTemplate())
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [shownFilter, setShownFilter] = useState<Record<string, boolean>>({ ...DEFAULT_SHOWN_FILTER })
  const [shownColumn, setShownColumn] = useState<Record<string, boolean>>({ ...DEFAULT_SHOWN_COLUMN })
  const [googleSheet, setGoogleSheet] = useState('')
  const [salesContact, setSalesContact] = useState('')
  const [selectedLeadSources, setSelectedLeadSources] = useState<string[]>([])
  const [createLead, setCreateLead] = useState(false)
  const [isLeadReminder, setIsLeadReminder] = useState(false)
  const [isMarketing, setIsMarketing] = useState(false)
  const [isInventory, setIsInventory] = useState(false)
  const [inventoryCities, setInventoryCities] = useState<string[]>([])
  const [microLocations, setMicroLocations] = useState<Record<string, { name?: string }[]>>({})

  const hydrateKey = user?._id ?? user?.id ?? userId

  const prefetchMicros = useCallback(async (tree: any[]) => {
    const next: Record<string, { name?: string }[]> = {}
    for (const sp of tree) {
      if (!sp.checked) continue
      for (const city of sp.cities) {
        if (!city.checked) continue
        const key = `${city.id}_${sp.space}`
        try {
          const res = await getMicroLocations({ city: city.id, ...spaceParamsForLocation(sp.space) } as any)
          const rows = ((res as any)?.data ?? []) as { name?: string }[]
          next[key] = rows.slice().sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
        } catch {
          next[key] = []
        }
      }
    }
    setMicroLocations(next)
  }, [])

  useEffect(() => {
    if (!user) return
    const tree = cloneSpaceTypeTemplate()
    mergeUserIntoSpaceType(tree, user.enquiry ?? [])
    setSpaceType(tree)
    setSelectedPaths(Array.isArray(user.access) ? [...user.access] : [])
    setShownFilter({ ...DEFAULT_SHOWN_FILTER, ...(user.shown_filter ?? {}) })
    setShownColumn({ ...DEFAULT_SHOWN_COLUMN, ...(user.shown_column ?? {}) })
    setGoogleSheet(String(user.google_sheet ?? ''))
    setSalesContact(String(user.sales_contact ?? ''))
    setSelectedLeadSources(Array.isArray(user.lead_source) ? [...user.lead_source] : [])
    setCreateLead(Boolean(user.create_lead))
    setIsLeadReminder(Boolean(user.isLeadReminder))
    setIsMarketing(Boolean(user.isMarketing))
    const inv = user.inventory
    setIsInventory(Boolean(inv?.isInventory))
    setInventoryCities(Array.isArray(inv?.cities) ? [...inv.cities] : [])
    void prefetchMicros(tree)
  }, [hydrateKey, user, prefetchMicros])

  const setTree = (next: any[]) => {
    setSpaceType(next)
    void prefetchMicros(next)
  }

  const onPathToggle = (path: string, checked: boolean) => {
    if (path === CRM_PATH && !checked) {
      setTree(cloneSpaceTypeTemplate())
      setIsInventory(false)
      setInventoryCities([])
      setCreateLead(false)
      setIsLeadReminder(false)
      setIsMarketing(false)
      setSelectedLeadSources([])
      setShownColumn({ ...DEFAULT_SHOWN_COLUMN })
      setShownFilter({ ...DEFAULT_SHOWN_FILTER })
    }
    setSelectedPaths((prev) => {
      if (checked) return prev.includes(path) ? prev : [...prev, path]
      return prev.filter((p) => p !== path)
    })
  }

  const crmSelected = selectedPaths.includes(CRM_PATH)

  const onSpaceToggle = (spaceKey: string, checked: boolean) => {
    const next = structuredClone(spaceType)
    const sp = next.find((s: any) => s.space === spaceKey)
    if (!sp) return
    sp.checked = checked
    if (!checked) {
      for (const c of sp.cities) {
        c.checked = false
        if (c.seats) for (const s of c.seats) s.checked = false
        if (c.workSpaceType) for (const t of c.workSpaceType) t.checked = false
        if (c.colivingType) for (const t of c.colivingType) t.checked = false
        if (c.budget) for (const b of c.budget) b.checked = false
        c.locations = []
      }
    }
    setTree(next)
  }

  const onCityToggle = (spaceKey: string, cityName: string, checked: boolean) => {
    const next = structuredClone(spaceType)
    const sp = next.find((s: any) => s.space === spaceKey)
    const city = sp?.cities?.find((c: any) => c.name === cityName)
    if (!city) return
    city.checked = checked
    if (!checked) {
      if (city.seats) for (const s of city.seats) s.checked = false
      if (city.workSpaceType) for (const t of city.workSpaceType) t.checked = false
      if (city.colivingType) for (const t of city.colivingType) t.checked = false
      if (city.budget) for (const b of city.budget) b.checked = false
      city.locations = []
    }
    setTree(next)
  }

  const onSeatToggle = (spaceKey: string, cityName: string, seatName: string, checked: boolean) => {
    const next = structuredClone(spaceType)
    const city = next.find((s: any) => s.space === spaceKey)?.cities?.find((c: any) => c.name === cityName)
    const seat = city?.seats?.find((s: any) => s.name === seatName)
    if (seat) seat.checked = checked
    setSpaceType(next)
  }

  const onWsTypeToggle = (spaceKey: string, cityName: string, name: string, checked: boolean) => {
    const next = structuredClone(spaceType)
    const city = next.find((s: any) => s.space === spaceKey)?.cities?.find((c: any) => c.name === cityName)
    const t = city?.workSpaceType?.find((x: any) => x.name === name)
    if (t) t.checked = checked
    setSpaceType(next)
  }

  const onColivingToggle = (spaceKey: string, cityName: string, name: string, checked: boolean) => {
    const next = structuredClone(spaceType)
    const city = next.find((s: any) => s.space === spaceKey)?.cities?.find((c: any) => c.name === cityName)
    const t = city?.colivingType?.find((x: any) => x.name === name)
    if (t) t.checked = checked
    setSpaceType(next)
  }

  const onBudgetToggle = (spaceKey: string, cityName: string, name: string, checked: boolean) => {
    const next = structuredClone(spaceType)
    const city = next.find((s: any) => s.space === spaceKey)?.cities?.find((c: any) => c.name === cityName)
    const t = city?.budget?.find((x: any) => x.name === name)
    if (t) t.checked = checked
    setSpaceType(next)
  }

  const onMicroChange = (spaceKey: string, city: any, selected: string[]) => {
    const next = structuredClone(spaceType)
    const c = next.find((s: any) => s.space === spaceKey)?.cities?.find((x: any) => x.name === city.name)
    if (c) c.locations = selected
    setSpaceType(next)
  }

  const onInventoryCityToggle = (cityName: string) => {
    if (cityName === 'Gurugram') {
      setInventoryCities((prev) => {
        const hasG = prev.includes('Gurugram') || prev.includes('Gurgaon')
        if (hasG) return prev.filter((c) => c !== 'Gurugram' && c !== 'Gurgaon')
        return [...prev, 'Gurugram', 'Gurgaon']
      })
      return
    }
    setInventoryCities((prev) => {
      const i = prev.indexOf(cityName)
      if (i > -1) return prev.filter((_, idx) => idx !== i)
      return [...prev, cityName]
    })
  }

  const saveMut = useMutation({
    mutationFn: () =>
      updateSpacehaatUserAccess({
        access: selectedPaths,
        id: userId,
        enquiry: buildEnquiryPayload(spaceType),
        shown_column: shownColumn,
        shown_filter: shownFilter,
        google_sheet: googleSheet,
        sales_contact: salesContact,
        lead_source: selectedLeadSources,
        create_lead: createLead,
        isLeadReminder,
        isMarketing,
        inventory: { isInventory, cities: inventoryCities },
      }),
    onSuccess: () => {
      toast.success('Access updated')
      qc.invalidateQueries({ queryKey: ['spacehaat-user', userId] })
      qc.invalidateQueries({ queryKey: ['spacehaat-users'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  const filterKeys = useMemo(() => Object.keys(DEFAULT_SHOWN_FILTER), [])
  const columnKeys = useMemo(() => Object.keys(DEFAULT_SHOWN_COLUMN), [])

  return (
    <PageShell
      title="User access"
      description={user?.name ? `Permissions for ${String(user.name)}` : 'Loading…'}
      actions={
        <Button type="button" variant="ghost" onClick={() => navigate('/layout/spacehaat-users')}>
          Back to list
        </Button>
      }
    >
      {userQ.isLoading ? <p className="text-sm text-slate-500">Loading user…</p> : null}
      {userQ.isError ? <p className="text-sm text-red-600">Failed to load user.</p> : null}
      {user ? (
        <div className="space-y-8 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{String(user.name ?? '')}</h2>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Menu access</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SPACEHAAT_ACCESS_MENU.map((m) => (
                <li key={m.path} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200/80">
                  <input
                    type="checkbox"
                    checked={selectedPaths.includes(m.path)}
                    onChange={(e) => onPathToggle(m.path, e.target.checked)}
                    id={`path-${m.path.replace(/\//g, '-')}`}
                  />
                  <label htmlFor={`path-${m.path.replace(/\//g, '-')}`} className="text-sm text-slate-800">
                    {m.title}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {crmSelected ? (
            <section className="space-y-6 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">CRM · enquiry scope</h3>
              {spaceType.map((sp: any) => (
                <div key={sp.space} className="rounded-xl bg-white p-4 ring-1 ring-slate-200/80">
                  <label className="flex items-center gap-2 font-medium text-slate-900">
                    <input type="checkbox" checked={!!sp.checked} onChange={(e) => onSpaceToggle(sp.space, e.target.checked)} />
                    {convertSpaceLabel(sp.space)}
                  </label>
                  {sp.checked ? (
                    <div className="mt-3 space-y-4 pl-4">
                      <div className="flex flex-wrap gap-3">
                        {sp.cities.map((city: any) => (
                          <div key={city.id} className="min-w-[200px] rounded-lg bg-slate-50/80 p-3 ring-1 ring-slate-200/60">
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={!!city.checked}
                                onChange={(e) => onCityToggle(sp.space, city.name, e.target.checked)}
                              />
                              {city.name}
                            </label>
                            {city.checked && city.seats?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {city.seats.map((seat: any) => (
                                  <label key={seat.name} className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={!!seat.checked}
                                      onChange={(e) => onSeatToggle(sp.space, city.name, seat.name, e.target.checked)}
                                    />
                                    {seat.name}
                                  </label>
                                ))}
                              </div>
                            ) : null}
                            {city.checked && city.colivingType?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {city.colivingType.map((t: any) => (
                                  <label key={t.name} className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={!!t.checked}
                                      onChange={(e) => onColivingToggle(sp.space, city.name, t.name, e.target.checked)}
                                    />
                                    {t.name}
                                  </label>
                                ))}
                              </div>
                            ) : null}
                            {city.checked && city.workSpaceType?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {city.workSpaceType.map((t: any) => (
                                  <label key={t.name} className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={!!t.checked}
                                      onChange={(e) => onWsTypeToggle(sp.space, city.name, t.name, e.target.checked)}
                                    />
                                    {t.name}
                                  </label>
                                ))}
                              </div>
                            ) : null}
                            {city.checked && city.budget?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {city.budget.map((b: any) => (
                                  <label key={b.name} className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={!!b.checked}
                                      onChange={(e) => onBudgetToggle(sp.space, city.name, b.name, e.target.checked)}
                                    />
                                    {b.name}
                                  </label>
                                ))}
                              </div>
                            ) : null}
                            {city.checked ? (
                              <div className="mt-2">
                                <label className="mb-1 block text-xs font-medium text-slate-600">Micro-locations</label>
                                <select
                                  multiple
                                  className="min-h-[72px] w-full rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-slate-200"
                                  value={Array.isArray(city.locations) ? city.locations : []}
                                  onChange={(e) => {
                                    const opts = [...e.target.selectedOptions].map((o) => o.value)
                                    onMicroChange(sp.space, city, opts)
                                  }}
                                >
                                  {(microLocations[`${city.id}_${sp.space}`] ?? []).map((opt) => (
                                    <option key={String(opt.name)} value={String(opt.name)}>
                                      {String(opt.name)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {sp.space === 'Web Coworking' ? (
                        <div className="rounded-lg bg-violet-50/50 p-3 ring-1 ring-violet-200/60">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input type="checkbox" checked={isInventory} onChange={(e) => setIsInventory(e.target.checked)} />
                            Inventory
                          </label>
                          {isInventory ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {sp.cities.map((city: any) => (
                                <label key={`inv-${city.id}`} className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={
                                      city.name === 'Gurugram'
                                        ? inventoryCities.includes('Gurugram') || inventoryCities.includes('Gurgaon')
                                        : inventoryCities.includes(city.name)
                                    }
                                    onChange={() => onInventoryCityToggle(city.name)}
                                  />
                                  {city.name}
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isMarketing} onChange={(e) => setIsMarketing(e.target.checked)} />
                  Marketing access
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={createLead} onChange={(e) => setCreateLead(e.target.checked)} />
                  Create lead
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isLeadReminder} onChange={(e) => setIsLeadReminder(e.target.checked)} />
                  Lead reminder
                </label>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lead source</h4>
                <div className="flex flex-wrap gap-3">
                  {LEAD_SOURCE_OPTIONS.map((k) => (
                    <label key={k.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLeadSources.includes(k.value)}
                        onChange={(e) => {
                          setSelectedLeadSources((prev) =>
                            e.target.checked ? [...prev, k.value] : prev.filter((x) => x !== k.value),
                          )
                        }}
                      />
                      {k.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shown filter</h4>
                <div className="flex flex-wrap gap-3">
                  {filterKeys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm capitalize">
                      <input
                        type="checkbox"
                        checked={!!shownFilter[key]}
                        onChange={(e) => setShownFilter((p) => ({ ...p, [key]: e.target.checked }))}
                      />
                      {key === 'status' ? 'Lead stage' : key}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shown column</h4>
                <div className="flex flex-wrap gap-3">
                  {columnKeys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm capitalize">
                      <input
                        type="checkbox"
                        checked={!!shownColumn[key]}
                        onChange={(e) => setShownColumn((p) => ({ ...p, [key]: e.target.checked }))}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Google Sheet URL</label>
                  <input
                    className="mt-1 w-full rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={googleSheet}
                    onChange={(e) => setGoogleSheet(e.target.value)}
                    placeholder="Sheet URL"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales contact phone</label>
                  <input
                    className="mt-1 w-full rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={salesContact}
                    onChange={(e) => setSalesContact(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button type="button" variant="primary" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? 'Saving…' : 'Update access'}
            </Button>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
