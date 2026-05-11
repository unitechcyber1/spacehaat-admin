type AnyRec = Record<string, unknown>

export function pgRowId(pg: AnyRec | null | undefined): string {
  if (!pg) return ''
  return String(pg._id ?? pg.id ?? '')
}

function idFromRef(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'id' in v) return String((v as { id?: unknown }).id ?? '')
  if (typeof v === 'object' && v !== null && '_id' in v) return String((v as { _id?: unknown })._id ?? '')
  return ''
}

function normStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x ?? '').trim()).filter(Boolean)
}

function microIdsFromApi(ml: unknown): string[] {
  if (!Array.isArray(ml)) return []
  return ml
    .map((x) => {
      if (typeof x === 'string') return x
      if (x && typeof x === 'object') return idFromRef(x)
      return ''
    })
    .filter(Boolean)
}

export function emptyPgForm(): AnyRec {
  return {
    name: '',
    pg_id: '',
    userId: '',
    /** UI-only helper for first PG owner; `id` set when API returns PgOwner ref. */
    ownerDetails: { id: '', name: '', email: '', phone: '' },
    /** Backend field (PgOwner refs). May come populated as ids or objects. */
    owner: [] as unknown[],
    contactNumber: '',
    contactEmail: '',
    description: '',
    city: '',
    locality: '',
    address: '',
    street: '',
    locationIds: {
      address: '',
      country: '',
      state: '',
      city: '',
      micro_location: [] as string[],
    },
    location: { type: 'Point', coordinates: [undefined, undefined] as [number?, number?] },
    images: [] as { image: unknown; order: number }[],
    pgRooms: [] as { roomType?: string; monthlyRent?: number; expectedDeposit?: number }[],
    minMonthlyRent: undefined as number | undefined,
    maxMonthlyRent: undefined as number | undefined,
    singleRoomPrice: undefined as number | undefined,

    noticePeriod: false,
    noticePeriodDuration: 0,
    maintenanceAmount: false,
    maintenanceAmountValue: '',
    foodIncluded: false,
    includedMeals: [] as string[],
    pgHostelRule: [] as string[],

    isLaundryService: false,
    laundryService: { title: '', days: '' },
    roomCleaning: false,
    waterFacility: false,
    parking: false,

    availableAmenities: [] as string[],
    roomAmenities: [] as string[],

    gateClosing: false,
    gateClosingTime: '',

    status: 'Active',
    active: true,
    verified: false,
    adminApproved: false,
    form_status: '',
  }
}

/** Map API PG document into flat form state (minimal fields only). */
export function normalizePgFromApi(raw: AnyRec): AnyRec {
  const base = emptyPgForm()
  const ownerIn = raw.owner
  const firstRaw = Array.isArray(ownerIn) && ownerIn.length ? ownerIn[0] : null
  let ownerIdStr = ''
  let firstOwner: AnyRec | null = null
  if (typeof firstRaw === 'string' && /^[a-f\d]{24}$/i.test(firstRaw.trim())) {
    ownerIdStr = firstRaw.trim()
  } else if (firstRaw && typeof firstRaw === 'object') {
    firstOwner = firstRaw as AnyRec
    ownerIdStr = idFromRef(firstRaw) || ''
  }
  const lidsIn = (raw.locationIds ?? {}) as AnyRec
  const coords = (
    raw.location && typeof raw.location === 'object' ? (raw.location as AnyRec).coordinates : null
  ) as unknown
  let lng: number | undefined
  let lat: number | undefined
  if (Array.isArray(coords) && coords.length >= 2) {
    lng = typeof coords[0] === 'number' ? coords[0] : parseFloat(String(coords[0]))
    lat = typeof coords[1] === 'number' ? coords[1] : parseFloat(String(coords[1]))
    if (!Number.isFinite(lng)) lng = undefined
    if (!Number.isFinite(lat)) lat = undefined
  }

  return {
    ...base,
    _id: raw._id,
    id: raw.id,
    name: String(raw.name ?? ''),
    pg_id: raw.pg_id != null ? String(raw.pg_id) : '',
    userId: raw.userId != null ? idFromRef(raw.userId) || String(raw.userId) : '',
    owner: Array.isArray(ownerIn) ? ownerIn : [],
    ownerDetails: {
      ...(ownerIdStr ? { id: ownerIdStr } : {}),
      name: firstOwner && firstOwner.name != null ? String(firstOwner.name) : '',
      email: firstOwner && firstOwner.email != null ? String(firstOwner.email) : '',
      phone: firstOwner && firstOwner.phone != null ? String(firstOwner.phone) : '',
    },
    contactNumber: raw.contactNumber != null ? String(raw.contactNumber) : '',
    contactEmail: raw.contactEmail != null ? String(raw.contactEmail) : '',
    description: raw.description != null ? String(raw.description) : '',
    city: raw.city != null ? String(raw.city) : '',
    locality: raw.locality != null ? String(raw.locality) : '',
    address: raw.address != null ? String(raw.address) : '',
    street: raw.street != null ? String(raw.street) : '',
    locationIds: {
      address: lidsIn.address != null ? String(lidsIn.address) : '',
      country: idFromRef(lidsIn.country) || (lidsIn.country != null ? String(lidsIn.country) : ''),
      state: idFromRef(lidsIn.state) || (lidsIn.state != null ? String(lidsIn.state) : ''),
      city: idFromRef(lidsIn.city) || (lidsIn.city != null ? String(lidsIn.city) : ''),
      micro_location: microIdsFromApi(lidsIn.micro_location),
    },
    location:
      lng != null && lat != null
        ? { type: 'Point', coordinates: [lng, lat] as [number, number] }
        : { type: 'Point', coordinates: [undefined, undefined] },
    images: Array.isArray(raw.images)
      ? (raw.images as AnyRec[])
          .map((row, idx) => {
            const img = row.image
            if (img && typeof img === 'object') {
              const id = idFromRef(img)
              return { image: { ...(img as AnyRec), ...(id ? { id } : {}) }, order: typeof row.order === 'number' ? row.order : idx }
            }
            const id = idFromRef(img) || String(img ?? '')
            return { image: id, order: typeof row.order === 'number' ? row.order : idx }
          })
          .filter((x) => Boolean(x.image))
      : [],
    pgRooms: Array.isArray(raw.pgRooms)
      ? (raw.pgRooms as AnyRec[]).map((r) => ({
          roomType: r.roomType != null ? String(r.roomType) : '',
          monthlyRent:
            typeof r.monthlyRent === 'number' ? r.monthlyRent : r.monthlyRent != null ? Number(r.monthlyRent) : undefined,
          expectedDeposit:
            typeof r.expectedDeposit === 'number'
              ? r.expectedDeposit
              : r.expectedDeposit != null
                ? Number(r.expectedDeposit)
                : undefined,
        }))
      : [],
    minMonthlyRent:
      typeof raw.minMonthlyRent === 'number' ? raw.minMonthlyRent : raw.minMonthlyRent != null ? Number(raw.minMonthlyRent) : undefined,
    maxMonthlyRent:
      typeof raw.maxMonthlyRent === 'number' ? raw.maxMonthlyRent : raw.maxMonthlyRent != null ? Number(raw.maxMonthlyRent) : undefined,
    singleRoomPrice:
      typeof raw.singleRoomPrice === 'number'
        ? raw.singleRoomPrice
        : raw.singleRoomPrice != null
          ? Number(raw.singleRoomPrice)
          : undefined,
    noticePeriod: Boolean(raw.noticePeriod),
    noticePeriodDuration:
      typeof raw.noticePeriodDuration === 'number' && Number.isFinite(raw.noticePeriodDuration)
        ? raw.noticePeriodDuration
        : raw.noticePeriodDuration != null && String(raw.noticePeriodDuration).trim() !== ''
          ? Number(raw.noticePeriodDuration) || 0
          : 0,
    maintenanceAmount: Boolean(raw.maintenanceAmount),
    maintenanceAmountValue:
      raw.maintenanceAmountValue != null ? String(raw.maintenanceAmountValue) : '',
    foodIncluded: Boolean(raw.foodIncluded),
    includedMeals: normStrArray(raw.includedMeals),
    pgHostelRule: normStrArray(raw.pgHostelRule),

    isLaundryService: Boolean(raw.isLaundryService),
    laundryService: (() => {
      const ls = raw.laundryService
      if (!ls || typeof ls !== 'object') return { title: '', days: '' }
      const o = ls as AnyRec
      return {
        title: o.title != null ? String(o.title) : '',
        days: o.days != null ? String(o.days) : '',
      }
    })(),
    roomCleaning: Boolean(raw.roomCleaning),
    waterFacility: Boolean(raw.waterFacility),
    parking: Boolean(raw.parking),

    availableAmenities: normStrArray(raw.availableAmenities),
    roomAmenities: normStrArray(raw.roomAmenities),

    gateClosing: Boolean(raw.gateClosing),
    gateClosingTime: raw.gateClosingTime != null ? String(raw.gateClosingTime) : '',

    status: raw.status != null ? String(raw.status) : 'Active',
    active: raw.active !== false,
    verified: Boolean(raw.verified),
    adminApproved: Boolean(raw.adminApproved),
    form_status: raw.form_status != null ? String(raw.form_status) : '',
    views: typeof raw.views === 'number' ? raw.views : raw.views != null ? Number(raw.views) : undefined,
    adminApprovalDate: raw.adminApprovalDate != null ? String(raw.adminApprovalDate) : '',
  }
}

export function buildPgSavePayload(pg: AnyRec): AnyRec {
  const out = JSON.parse(JSON.stringify(pg)) as AnyRec

  delete out.added_on
  delete out.updated_on
  delete out.__v
  delete out.delete
  delete out.ratings
  delete out.views

  // Owner: if UI has ownerDetails, send object (backend can create/link PgOwner).
  // Otherwise, preserve existing owner ids if already present.
  const od = (out.ownerDetails ?? {}) as AnyRec
  const odName = typeof od.name === 'string' ? od.name.trim() : ''
  const odEmail = typeof od.email === 'string' ? od.email.trim() : ''
  const odPhone = typeof od.phone === 'string' ? od.phone.trim() : ''
  const odIdRaw = typeof od.id === 'string' ? od.id.trim() : ''
  const odId = /^[a-f\d]{24}$/i.test(odIdRaw) ? odIdRaw : ''
  if (odName || odEmail || odPhone || odId) {
    out.owner = [
      {
        ...(odId ? { id: odId } : {}),
        ...(odName ? { name: odName } : {}),
        ...(odEmail ? { email: odEmail } : {}),
        ...(odPhone ? { phone: odPhone } : {}),
      },
    ]
  } else if (Array.isArray(out.owner)) {
    const ids = (out.owner as unknown[])
      .map((x) => (typeof x === 'string' ? x : idFromRef(x)))
      .filter((x) => typeof x === 'string' && /^[a-f\\d]{24}$/i.test(x))
    if (ids.length) out.owner = ids
    else delete out.owner
  } else {
    delete out.owner
  }
  delete out.ownerDetails

  const lids = { ...(out.locationIds as AnyRec | undefined) } as AnyRec
  ;(['country', 'state', 'city'] as const).forEach((k) => {
    if (lids[k] === '' || lids[k] == null) delete lids[k]
  })
  const micro = lids.micro_location as string[] | undefined
  if (Array.isArray(micro) && micro.length) {
    lids.micro_location = micro.map(String).filter(Boolean)
  } else {
    delete lids.micro_location
  }
  if (!lids.address) delete lids.address
  out.locationIds = Object.keys(lids).length ? lids : undefined
  if (!out.locationIds) delete out.locationIds

  const loc = out.location as AnyRec | undefined
  const crd = loc?.coordinates as unknown
  if (Array.isArray(crd) && crd.length >= 2) {
    const lng = typeof crd[0] === 'number' ? crd[0] : parseFloat(String(crd[0]))
    const lat = typeof crd[1] === 'number' ? crd[1] : parseFloat(String(crd[1]))
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    ) {
      out.location = { type: 'Point', coordinates: [lng, lat] }
    } else {
      delete out.location
    }
  } else {
    delete out.location
  }

  const imageRowsRaw = out.images
  if (Array.isArray(imageRowsRaw)) {
    const mapped = (imageRowsRaw as AnyRec[])
      .filter((row) => row?.image)
      .map((row, idx) => ({
        image: (() => {
          const v = row.image
          const id = idFromRef(v) || (typeof v === 'string' ? v : '')
          return String(id)
        })(),
        order: typeof row.order === 'number' ? row.order : idx,
      }))
      .filter((r) => r.image)
    if (mapped.length) out.images = mapped
    else delete out.images
  }

  const roomRowsRaw = out.pgRooms
  if (Array.isArray(roomRowsRaw)) {
    const mappedRooms = (roomRowsRaw as AnyRec[])
      .map((r) => ({
        ...(r._id ? { _id: r._id } : {}),
        roomType: r.roomType ? String(r.roomType) : undefined,
        monthlyRent: Number.isFinite(Number(r.monthlyRent)) ? Number(r.monthlyRent) : undefined,
        expectedDeposit: Number.isFinite(Number(r.expectedDeposit)) ? Number(r.expectedDeposit) : undefined,
      }))
      .filter((r) => r.roomType || r.monthlyRent != null || r.expectedDeposit != null)
    if (mappedRooms.length) out.pgRooms = mappedRooms
    else delete out.pgRooms
  }

  ;(['minMonthlyRent', 'maxMonthlyRent', 'singleRoomPrice'] as const).forEach((k) => {
    const n = out[k]
    if (n === '' || n == null || !Number.isFinite(Number(n))) delete out[k]
    else out[k] = Number(n)
  })

  const uid = String(out.userId ?? '').trim()
  if (/^[a-f\d]{24}$/i.test(uid)) out.userId = uid
  else delete out.userId

  if (!String(out.pg_id ?? '').trim()) delete out.pg_id

  ;(['city', 'locality', 'address', 'street', 'contactEmail', 'description', 'form_status'] as const).forEach((k) => {
    const s = typeof out[k] === 'string' ? out[k].trim() : out[k]
    if (s === '' || s == null) delete out[k]
  })

  const ph = typeof out.contactNumber === 'string' ? out.contactNumber.trim() : out.contactNumber
  if (!ph) delete out.contactNumber
  else out.contactNumber = ph

  out.noticePeriod = Boolean(out.noticePeriod)
  const npd = out.noticePeriodDuration
  out.noticePeriodDuration =
    npd === '' || npd == null || !Number.isFinite(Number(npd)) ? 0 : Number(npd)
  out.maintenanceAmount = Boolean(out.maintenanceAmount)
  const mav = typeof out.maintenanceAmountValue === 'string' ? out.maintenanceAmountValue.trim() : ''
  if (mav) out.maintenanceAmountValue = mav
  else delete out.maintenanceAmountValue

  out.foodIncluded = Boolean(out.foodIncluded)
  ;(['includedMeals', 'pgHostelRule', 'availableAmenities', 'roomAmenities'] as const).forEach((k) => {
    const a = out[k]
    if (!Array.isArray(a) || !a.length) {
      delete out[k]
      return
    }
    const cleaned = (a as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    if (cleaned.length) out[k] = cleaned
    else delete out[k]
  })

  out.isLaundryService = Boolean(out.isLaundryService)
  const ls = out.laundryService as AnyRec | undefined
  if (ls && typeof ls === 'object') {
    const t = typeof ls.title === 'string' ? ls.title.trim() : ''
    const d = typeof ls.days === 'string' ? ls.days.trim() : ''
    if (t || d) out.laundryService = { ...(t ? { title: t } : {}), ...(d ? { days: d } : {}) }
    else delete out.laundryService
  } else {
    delete out.laundryService
  }

  out.roomCleaning = Boolean(out.roomCleaning)
  out.waterFacility = Boolean(out.waterFacility)
  out.parking = Boolean(out.parking)

  out.gateClosing = Boolean(out.gateClosing)
  const gct = typeof out.gateClosingTime === 'string' ? out.gateClosingTime.trim() : ''
  if (gct) out.gateClosingTime = gct
  else delete out.gateClosingTime

  const sc = out.space_contact_details as AnyRec | undefined
  if (sc && typeof sc === 'object') {
    const next = {
      name: typeof sc.name === 'string' ? sc.name.trim() : '',
      email: typeof sc.email === 'string' ? sc.email.trim() : '',
      phone: typeof sc.phone === 'string' ? sc.phone.trim() : '',
      show_on_website: Boolean(sc.show_on_website),
    }
    if (!next.name && !next.email && !next.phone) delete out.space_contact_details
    else out.space_contact_details = next
  } else {
    delete out.space_contact_details
  }

  return out
}
