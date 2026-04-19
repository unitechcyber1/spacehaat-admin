/** Matches Angular `OfficeSpace` / detail form shape for admin save. */
export const OFFICE_TYPES = [
  { value: 'raw', label: 'Raw' },
  { value: 'build-to-suite', label: 'Build To Suite' },
  { value: 'semi-furnished', label: 'Semi Furnished' },
  { value: 'fully-furnished', label: 'Fully Furnished' },
] as const

type AnyRec = Record<string, any>

function getImageId(obj: unknown): string | null {
  if (typeof obj === 'string') return obj
  if (obj && typeof obj === 'object' && 'id' in obj) return (obj as { id?: string }).id ?? null
  return null
}

export function normalizeMicroLocationIds(ml: unknown): string[] {
  if (!ml) return []
  if (Array.isArray(ml)) {
    return ml
      .map((x) => {
        if (typeof x === 'string') return x
        if (x && typeof x === 'object' && 'id' in x) return String((x as { id: string }).id)
        return ''
      })
      .filter(Boolean)
  }
  return []
}

export function emptyOfficeSpace(): AnyRec {
  return {
    name: '',
    slug: '',
    spaceTag: '',
    ratings: '',
    builder: '',
    building: '',
    description: '',
    contact_details: [] as AnyRec[],
    space_contact_details: {
      name: '',
      email: '',
      phone: '',
      show_on_website: false,
    },
    other_detail: {
      building_name: '',
      office_type: '',
      area_for_lease_in_sq_ft: undefined as number | undefined,
      rent_in_sq_ft: undefined as number | undefined,
      monthly_rent: undefined as number | undefined,
      floor: '',
      monthly_maintenance: 'No',
      monthly_maintenance_amount: '',
      security_deposit: '',
      facilities: [{ name: '', value: '' }],
    },
    location: {
      address: '',
      country: '',
      state: '',
      city: '',
      micro_location: [] as string[],
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
      metro_detail: { name: '', is_near_metro: false },
      landmark: '',
      landmark_distance: '',
    },
    amenties: [] as AnyRec[],
    images: [] as AnyRec[],
    seo: {
      title: '',
      keywords: '',
      description: '',
      robots: 'index, follow',
      script: '',
      twitter: { title: '', description: '', image: null },
      open_graph: { title: '', description: '', image: null },
    },
    social_media: { facebook: '', twitter: '', instagram: '' },
  }
}

export function normalizeOfficeFromApi(raw: AnyRec): AnyRec {
  const o = JSON.parse(JSON.stringify(raw)) as AnyRec
  const d = emptyOfficeSpace()

  if (!o.other_detail) o.other_detail = d.other_detail
  else {
    o.other_detail = { ...d.other_detail, ...o.other_detail }
    if (!Array.isArray(o.other_detail.facilities) || !o.other_detail.facilities.length) {
      o.other_detail.facilities = [{ name: '', value: '' }]
    }
  }

  if (!o.location) o.location = d.location
  else {
    o.location = { ...d.location, ...o.location }
    o.location.metro_detail = {
      ...d.location.metro_detail,
      ...(o.location.metro_detail || {}),
    }
    o.location.micro_location = normalizeMicroLocationIds(o.location.micro_location)
    const L = o.location as AnyRec
    if (L.country && typeof L.country === 'object' && L.country.id) L.country = L.country.id
    if (L.state && typeof L.state === 'object' && L.state.id) L.state = L.state.id
    if (L.city && typeof L.city === 'object' && L.city.id) L.city = L.city.id
  }

  if (!o.space_contact_details) o.space_contact_details = d.space_contact_details
  else o.space_contact_details = { ...d.space_contact_details, ...o.space_contact_details }

  if (!Array.isArray(o.contact_details)) o.contact_details = []
  if (!Array.isArray(o.amenties)) o.amenties = []
  if (!Array.isArray(o.images)) o.images = []

  if (!o.seo) o.seo = d.seo
  else {
    o.seo = { ...d.seo, ...o.seo }
    o.seo.twitter = { ...d.seo.twitter, ...(o.seo.twitter || {}) }
    o.seo.open_graph = { ...d.seo.open_graph, ...(o.seo.open_graph || {}) }
  }

  if (!o.social_media) o.social_media = d.social_media
  else o.social_media = { ...d.social_media, ...o.social_media }

  o.images = (o.images as AnyRec[]).map((row: AnyRec, idx: number) => ({
    order: row.order ?? idx + 1,
    image: row.image || {},
  }))

  if (o.building && typeof o.building === 'object' && (o.building as AnyRec).id) {
    o.building = (o.building as AnyRec).id
  }

  if (o.builder && typeof o.builder === 'object' && (o.builder as AnyRec).id) {
    o.builder = (o.builder as AnyRec).id
  }

  return o
}

/** Mirrors Angular `onSubmit` transforms: SEO image ids, gallery ids, landmark cleanup. */
export function buildOfficeSpaceSavePayload(os: AnyRec): AnyRec {
  const object = JSON.parse(JSON.stringify(os)) as AnyRec

  const seo = object.seo as AnyRec | undefined
  if (seo?.twitter) {
    const tw = seo.twitter as AnyRec
    tw.image = getImageId(tw.image)
  }
  if (seo?.open_graph) {
    const og = seo.open_graph as AnyRec
    og.image = getImageId(og.image)
  }

  const imgs: { order: number; image: string }[] = []
  const rawImages = object.images as Array<{ order?: number; image?: { id?: string } }> | undefined
  if (Array.isArray(rawImages)) {
    rawImages.forEach((item, idx) => {
      const id = item?.image?.id
      if (!id) return
      imgs.push({ order: item.order ?? idx + 1, image: id })
    })
  }
  object.images = imgs

  const loc = object.location as AnyRec | undefined
  if (loc) {
    const near = loc.metro_detail?.is_near_metro
    if (!near) {
      loc.landmark = ''
      loc.landmark_distance = ''
    }
  }

  return object
}

export function isAmenitySelected(amenties: AnyRec[] | undefined, id: string): boolean {
  return (amenties ?? []).some((a) => String(a?.id) === String(id))
}

export function toggleAmenity(amenties: AnyRec[], master: { id?: string; name?: string }): AnyRec[] {
  const id = master.id
  if (!id) return amenties
  const i = amenties.findIndex((x) => String(x?.id) === String(id))
  if (i >= 0) {
    const next = [...amenties]
    next.splice(i, 1)
    return next
  }
  return [...amenties, { id, name: master.name }]
}
