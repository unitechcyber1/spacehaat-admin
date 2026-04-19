/** Default `hours_of_operation` shape for each weekday. */
function day(should_show: boolean) {
  return {
    should_show,
    from: '09:00 AM',
    to: '08:00 PM',
    is_closed: false,
    is_open_24: false,
  }
}

export const SPACE_TAGS = [
  { label: 'Premium', value: 'Premium' },
  { label: 'Near Metro', value: 'Near Metro' },
  { label: 'Special Offer', value: 'Special Offer' },
  { label: 'Popular', value: 'Popular' },
] as const

export const PLAN_DURATIONS = ['month', 'year', 'week', 'day', 'hour'] as const

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

function emptyHours() {
  return {
    monday: day(true),
    tuesday: day(false),
    wednesday: day(false),
    thursday: day(false),
    friday: day(false),
    saturday: day(true),
    sunday: day(false),
  }
}

/** Merge API `hours_of_operation` with defaults so every weekday exists. */
export function ensureHoursOfOperation(h: unknown): Record<string, unknown> {
  const base = emptyHours()
  if (!h || typeof h !== 'object') return base
  const o = h as Record<string, unknown>
  const out: Record<string, unknown> = { ...base }
  for (const d of WEEKDAYS) {
    const row = o[d]
    if (row && typeof row === 'object') {
      const r = row as Record<string, unknown>
      // Some payloads use camelCase (shouldShow / isOpen24); normalize to our snake_case keys.
      const normalized: Record<string, unknown> = { ...r }
      if (normalized.should_show === undefined && normalized.shouldShow !== undefined) {
        normalized.should_show = normalized.shouldShow
      }
      if (normalized.is_open_24 === undefined && normalized.isOpen24 !== undefined) {
        normalized.is_open_24 = normalized.isOpen24
      }
      const merged = { ...(base[d] as object), ...(normalized as object) } as Record<string, unknown>
      // Ensure selects have a non-empty value when the day is shown and not 24h.
      const show = !!merged.should_show
      const open24 = !!merged.is_open_24
      if (show && !open24) {
        if (!merged.from || typeof merged.from !== 'string') merged.from = (base[d] as any).from
        if (!merged.to || typeof merged.to !== 'string') merged.to = (base[d] as any).to
      }
      out[d] = merged
    }
  }
  return out
}

export const WORKSPACE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approve', label: 'Enabled' },
  { value: 'reject', label: 'Disabled' },
] as const

function emptySeoBlock() {
  return {
    title: '',
    description: '',
    keywords: '',
    robots: 'index, follow',
    footer_title: '',
    footer_description: '',
    twitter: { title: '', description: '', image: null as { id?: string; s3_link?: string } | null },
    open_graph: { title: '', description: '', image: null as { id?: string; s3_link?: string } | null },
  }
}

export function emptyWorkspace(): Record<string, unknown> {
  return {
    name: '',
    slug: '',
    description: '',
    email: '',
    website_Url: '',
    currency_code: 'INR',
    country_dbname: '',
    spaceTag: '',
    ratings: '',
    contact_details: [] as Record<string, unknown>[],
    images: [] as { order?: number; image?: Record<string, unknown> }[],
    amenties: [] as { id?: string; name?: string }[],
    social_media: { facebook: '', twitter: '', instagram: '' },
    is_active: true,
    plans: [] as Record<string, unknown>[],
    facilities: { desks: '', lounge: '', table: '' },
    rooms: [] as Record<string, unknown>[],
    hours_of_operation: emptyHours(),
    location: {
      name: '',
      name1: '',
      floor: '',
      address: '',
      address1: '',
      city: '',
      micro_location: '',
      state: '',
      country: '',
      postal_code: '',
      landmark: '',
      landmark_distance: '',
      ferry_stop_landmark: '',
      ferry_stop_distance: '',
      bus_stop_landmark: '',
      bus_stop_distance: '',
      taxi_stand_landmark: '',
      taxi_stand_distance: '',
      tram_landmark: '',
      tram_distance: '',
      latitude: 0,
      longitude: 0,
      is_near_metro: false,
      is_ferry_stop: false,
      is_bus_stop: false,
      is_taxi_stand: false,
      is_tram: false,
    },
    status: 'pending',
    no_of_seats: 0,
    small_team_availability: false,
    enterprise_availability: false,
    brand: '',
    starting_price: 0,
    seo: emptySeoBlock(),
    virtualSeo: emptySeoBlock(),
    space_contact_details: {
      name: '',
      email: '',
      phone: '',
      show_on_website: false,
    },
    space_type: 'coworking',
  }
}

export function normalizeWorkspaceFromApi(data: Record<string, unknown>): Record<string, unknown> {
  const w = { ...data } as Record<string, unknown>
  if (!w.space_contact_details || typeof w.space_contact_details !== 'object') {
    w.space_contact_details = {
      name: '',
      email: '',
      phone: '',
      show_on_website: false,
    }
  }
  if (!w.virtualSeo || typeof w.virtualSeo !== 'object') {
    w.virtualSeo = emptySeoBlock()
  } else {
    const vs = w.virtualSeo as Record<string, unknown>
    if (!vs.twitter || typeof vs.twitter !== 'object') {
      vs.twitter = { title: '', description: '', image: null }
    }
    if (!vs.open_graph || typeof vs.open_graph !== 'object') {
      vs.open_graph = { title: '', description: '', image: null }
    }
  }
  if (!w.seo || typeof w.seo !== 'object') {
    w.seo = emptySeoBlock()
  } else {
    const s = w.seo as Record<string, unknown>
    if (!s.twitter || typeof s.twitter !== 'object') {
      s.twitter = { title: '', description: '', image: null }
    }
    if (!s.open_graph || typeof s.open_graph !== 'object') {
      s.open_graph = { title: '', description: '', image: null }
    }
  }
  if (!w.social_media || typeof w.social_media !== 'object') {
    w.social_media = { facebook: '', twitter: '', instagram: '' }
  }
  if (!w.contact_details) w.contact_details = []
  if (!w.images) w.images = []
  if (!w.plans) w.plans = []
  if (!w.amenties) w.amenties = []
  if (!w.facilities || typeof w.facilities !== 'object') {
    w.facilities = { desks: '', lounge: '', table: '' }
  }
  w.hours_of_operation = ensureHoursOfOperation(w.hours_of_operation)
  const defLoc = emptyWorkspace().location as Record<string, unknown>
  const rawLoc =
    w.location && typeof w.location === 'object' ? (w.location as Record<string, unknown>) : {}
  w.location = { ...defLoc, ...rawLoc }
  const loc = w.location as Record<string, unknown>
  if (loc.city && typeof loc.city === 'object') {
    loc.city = (loc.city as { id?: string }).id ?? ''
  }
  if (loc.state && typeof loc.state === 'object') {
    loc.state = (loc.state as { id?: string }).id ?? ''
  }
  if (loc.country && typeof loc.country === 'object') {
    loc.country = (loc.country as { id?: string }).id ?? ''
  }
  if (loc.micro_location && typeof loc.micro_location === 'object') {
    loc.micro_location = (loc.micro_location as { id?: string }).id ?? ''
  }
  return w
}
