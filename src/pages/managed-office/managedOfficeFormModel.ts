import { ensureHoursOfOperation, normalizeGalleryOrders } from '../coworking/CoworkingSpaceDetailPage/workspaceFormModel'

type AnyRec = Record<string, any>

export const SEAT_TYPES = [
  { value: 'warm_shell', label: 'Warm shell' },
  { value: 'ready_to_move_in', label: 'Ready to move in' },
  { value: 'bare_shell', label: 'Bare shell' },
] as const

export const CENTRE_TYPES = [
  { value: 'managed_office', label: 'Managed office' },
  { value: 'coworking', label: 'Coworking' },
] as const

export const MANAGED_OFFICE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'inprogress', label: 'In progress' },
  { value: 'approve', label: 'Enabled' },
  { value: 'reject', label: 'Disabled' },
] as const

export const PLAN_DURATIONS = ['month', 'year', 'week', 'day', 'hour'] as const

/** "Office Space" plan category — the default for managed office seat plans. */
export const OFFICE_SPACE_CATEGORY_ID = '62833d8193f2bd4e9f1a3ceb'

export function seatTypeLabel(value: unknown): string {
  return SEAT_TYPES.find((s) => s.value === value)?.label ?? ''
}

function emptySeoBlock() {
  return {
    title: '',
    description: '',
    keywords: '',
    robots: 'index, follow',
    twitter: { title: '', description: '', image: null as AnyRec | null },
    open_graph: { title: '', description: '', image: null as AnyRec | null },
  }
}

function emptyLocation() {
  return {
    name: '',
    floor: '',
    address1: '',
    building_name: '',
    country: '',
    state: '',
    city: '',
    micro_location: '',
    micro_location_string: '',
    postal_code: '',
    landmark: '',
    landmark_distance: '',
    metro_stop_landmark: '',
    metro_stop_distance: '',
    is_near_metro: false,
  }
}

export function emptyPlan(): AnyRec {
  return {
    category: OFFICE_SPACE_CATEGORY_ID,
    seat_type: 'warm_shell',
    duration: 'month',
    price: 0,
    number_of_items: 1,
    should_show: true,
  }
}

export function emptyManagedOffice(): AnyRec {
  return {
    name: '',
    slug: '',
    description: '',
    new_description: '',
    status: 'pending',
    is_active: true,
    is_new_launch: false,
    centre_type: 'managed_office',
    brand: '',
    no_of_seats: '',
    images: [],
    amenties: [],
    plans: [emptyPlan()],
    building: { total_floors: '', super_area: '', total_seats: '', floors: [] },
    lease_terms: { min_seats: '', min_duration_months: '' },
    rating: { source: '', average: '', total: '' },
    hours_of_operation: ensureHoursOfOperation(null),
    location: emptyLocation(),
    seo: emptySeoBlock(),
    new_seo: emptySeoBlock(),
  }
}

function idOf(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const o = value as { id?: unknown; _id?: unknown }
    const id = o.id ?? o._id
    return id == null ? '' : String(id)
  }
  return ''
}

/** API document → form state (refs become ids, missing blocks get defaults). */
export function normalizeManagedOfficeFromApi(data: AnyRec): AnyRec {
  const base = emptyManagedOffice()
  const m: AnyRec = { ...base, ...data }
  m.id = idOf(data)
  m.brand = idOf(data.brand)
  m.location = { ...base.location, ...(data.location ?? {}) }
  for (const k of ['country', 'state', 'city', 'micro_location'] as const) {
    m.location[k] = idOf(m.location[k])
  }
  m.building = { ...base.building, ...(data.building ?? {}), floors: data.building?.floors ?? [] }
  m.lease_terms = { ...base.lease_terms, ...(data.lease_terms ?? {}) }
  m.rating = { ...base.rating, ...(data.rating ?? {}) }
  m.plans = (data.plans ?? []).map((p: AnyRec) => ({ ...emptyPlan(), ...p, category: idOf(p.category) }))
  m.images = normalizeGalleryOrders(
    [...(data.images ?? [])].sort((a: AnyRec, b: AnyRec) => (a?.order ?? 0) - (b?.order ?? 0)),
  )
  m.amenties = (data.amenties ?? []).map((a: AnyRec) => (typeof a === 'string' ? { id: a } : { id: idOf(a), name: a.name }))
  m.hours_of_operation = ensureHoursOfOperation(data.hours_of_operation)
  for (const block of ['seo', 'new_seo'] as const) {
    const s = { ...emptySeoBlock(), ...(data[block] ?? {}) }
    s.twitter = { ...emptySeoBlock().twitter, ...(s.twitter ?? {}) }
    s.open_graph = { ...emptySeoBlock().open_graph, ...(s.open_graph ?? {}) }
    m[block] = s
  }
  return m
}

function hoursForServer(hours: AnyRec): AnyRec {
  const out: AnyRec = {}
  for (const [day, raw] of Object.entries(hours ?? {})) {
    if (!raw || typeof raw !== 'object') continue
    const row: AnyRec = { ...raw }
    // Imported days can be `should_show: true, is_closed: true`; either flag means closed.
    if (!row.should_show || row.is_closed) {
      Object.assign(row, { should_show: true, is_closed: true, is_open_24: false, from: '', to: '' })
    } else if (row.is_open_24) {
      Object.assign(row, { is_closed: false, from: '12:00 AM', to: '11:59 PM' })
    } else {
      row.is_closed = false
      row.from = row.from || '09:00 AM'
      row.to = row.to || '08:00 PM'
    }
    out[day] = row
  }
  return out
}

/** Form state → API body (ids for refs; the backend converts numbers and builds geometry). */
export function buildManagedOfficeSavePayload(form: AnyRec): AnyRec {
  const body: AnyRec = { ...form }
  body.images = (form.images ?? [])
    .map((slot: AnyRec, i: number) => ({ order: i + 1, image: idOf(slot?.image) }))
    .filter((slot: AnyRec) => slot.image)
  body.amenties = (form.amenties ?? []).map(idOf).filter(Boolean)
  body.plans = (form.plans ?? []).map((p: AnyRec) => ({ ...p, category: idOf(p.category) || undefined, image: idOf(p.image) || undefined }))
  body.hours_of_operation = hoursForServer(form.hours_of_operation)
  body.location = { ...(form.location ?? {}) }
  if (!body.location.is_near_metro) {
    body.location.metro_stop_landmark = ''
    body.location.metro_stop_distance = ''
  }
  for (const block of ['seo', 'new_seo'] as const) {
    const s = { ...(form[block] ?? {}) }
    s.twitter = { ...(s.twitter ?? {}), image: idOf(s.twitter?.image) || null }
    s.open_graph = { ...(s.open_graph ?? {}), image: idOf(s.open_graph?.image) || null }
    body[block] = s
  }
  if (!body.brand) delete body.brand
  if (!body.id) delete body.id
  return body
}
