type AnyRec = Record<string, any>

function getId(obj: unknown): string | null {
  if (typeof obj === 'string') return obj
  if (obj && typeof obj === 'object' && 'id' in (obj as object)) {
    const id = (obj as { id?: string }).id
    return id ?? null
  }
  return null
}

function setSeoImagesForServer(seo: AnyRec | undefined) {
  if (!seo) return
  if (seo.twitter) {
    seo.twitter.image = getId(seo.twitter.image)
  }
  if (seo.open_graph) {
    seo.open_graph.image = getId(seo.open_graph.image)
  }
}

function setVirtualSeoImagesForServer(virtualSeo: AnyRec | undefined) {
  if (!virtualSeo) return
  if (virtualSeo.twitter) {
    virtualSeo.twitter.image = getId(virtualSeo.twitter.image)
  }
  if (virtualSeo.open_graph) {
    virtualSeo.open_graph.image = getId(virtualSeo.open_graph.image)
  }
}

function setImagesForServer(images: unknown) {
  if (!Array.isArray(images)) return []
  const out: { order: number; image: string }[] = []
  images.forEach((item: AnyRec, idx: number) => {
    const id = item?.image?.id
    if (!id) return
    out.push({ order: item.order ?? idx + 1, image: id })
  })
  return out
}

function setPlansForServer(plans: unknown) {
  if (!Array.isArray(plans)) return []
  return plans.map((plan: AnyRec) => ({
    ...plan,
    image: plan?.image?.id ?? plan?.image,
  }))
}

function setRoomsForServer(rooms: unknown) {
  if (!Array.isArray(rooms)) return []
  return rooms.reduce((m: AnyRec[], d: AnyRec) => {
    const data = d?.data
    if (Array.isArray(data) && data.length) {
      m.push({ room: d.room, data })
    }
    return m
  }, [])
}

function setHoursOfOperationForServer(hours: unknown) {
  if (!hours || typeof hours !== 'object') return hours
  const out: AnyRec = {}
  for (const [day, raw] of Object.entries(hours as AnyRec)) {
    if (!raw || typeof raw !== 'object') continue
    const row: AnyRec = { ...(raw as AnyRec) }
    // Normalize camelCase variants to snake_case.
    if (row.should_show === undefined && row.shouldShow !== undefined) row.should_show = row.shouldShow
    if (row.is_open_24 === undefined && row.isOpen24 !== undefined) row.is_open_24 = row.isOpen24

    const show = !!row.should_show
    const open24 = !!row.is_open_24
    if (!show) {
      row.is_closed = true
      row.is_open_24 = false
      row.from = ''
      row.to = ''
    } else if (open24) {
      row.is_closed = false
      row.from = '12:00 AM'
      row.to = '12:00 PM'
    } else {
      row.is_closed = false
      // Keep whatever the UI set; if missing, default to common values.
      if (!row.from) row.from = '09:00 AM'
      if (!row.to) row.to = '08:00 PM'
    }
    out[day] = row
  }
  return out
}

/** Workspace save payload transforms (image ids, rooms, location flags). */
export function buildWorkspaceSavePayload(ws: AnyRec): AnyRec {
  const object = { ...ws }
  setSeoImagesForServer(object.seo)
  setVirtualSeoImagesForServer(object.virtualSeo)
  object.rooms = setRoomsForServer(object.rooms)
  object.images = setImagesForServer(object.images)
  object.plans = setPlansForServer(object.plans)
  object.hours_of_operation = setHoursOfOperationForServer(object.hours_of_operation)

  const loc = object.location as AnyRec | undefined
  if (loc) {
    // Backend expects ObjectId-like values for these fields; omit empty strings to avoid cast errors.
    ;(['country', 'state', 'city', 'micro_location'] as const).forEach((k) => {
      if (loc[k] === '' || loc[k] == null) delete loc[k]
    })

    if (!loc.is_near_metro) {
      loc.landmark = ''
      loc.landmark_distance = ''
    }
    if (!loc.is_ferry_stop) {
      loc.ferry_stop_landmark = ''
      loc.ferry_stop_distance = ''
    }
    if (!loc.is_bus_stop) {
      loc.bus_stop_landmark = ''
      loc.bus_stop_distance = ''
    }
    if (!loc.is_taxi_stand) {
      loc.taxi_stand_landmark = ''
      loc.taxi_stand_distance = ''
    }
    if (!loc.is_tram) {
      loc.tram_landmark = ''
      loc.tram_distance = ''
    }
  }

  return object
}
