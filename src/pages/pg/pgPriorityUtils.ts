import type { PgPriorityType } from '../../services/pg/pgPriority.service'
import { pgRowId } from './pgFormModel'

export type PgRow = Record<string, unknown>

/** Enabled / approved for public site (matches PG list workflow). */
export function isPgApproved(pg: PgRow): boolean {
  return pg.status === 'approve'
}

type PrioritySlot = {
  order?: number
  is_active?: boolean
  city?: string | { _id?: string; id?: string }
  name?: string
}

export function pgThumbnail(pg: PgRow): string {
  const images = pg.images
  if (!Array.isArray(images) || images.length === 0) return ''
  const first = images[0] as { image?: unknown }
  const img = first?.image
  if (img && typeof img === 'object' && img !== null && 's3_link' in img) {
    return String((img as { s3_link?: string }).s3_link ?? '')
  }
  return ''
}

export function pgCityLabel(pg: PgRow): string {
  const lids = pg.locationIds as Record<string, unknown> | undefined
  const cref = lids?.city
  if (cref && typeof cref === 'object' && cref !== null && 'name' in cref) {
    return String((cref as { name?: string }).name ?? '')
  }
  if (typeof pg.city === 'string' && pg.city) return pg.city
  return '—'
}

export function pgLocalityLabel(pg: PgRow): string {
  if (typeof pg.locality === 'string' && pg.locality.trim()) return pg.locality
  const lids = pg.locationIds as Record<string, unknown> | undefined
  const m = lids?.micro_location
  if (m && typeof m === 'object' && m !== null && 'name' in m) {
    return String((m as { name?: string }).name ?? '')
  }
  return '—'
}

export function pgStatusLabel(status: unknown): string {
  const s = typeof status === 'string' ? status : status != null ? String(status) : ''
  if (s === 'approve') return 'Enabled'
  if (s === 'reject') return 'Rejected'
  if (s === 'pending') return 'Pending'
  if (s === 'inprogress') return 'In progress'
  return s || '—'
}

export function getPrioritySlot(pg: PgRow, type: PgPriorityType): PrioritySlot | undefined {
  const priority = pg.priority as Record<string, PrioritySlot> | undefined
  return priority?.[type]
}

export function getPriorityOrder(pg: PgRow, type: PgPriorityType): number {
  const slot = getPrioritySlot(pg, type)
  if (slot?.order != null && Number.isFinite(Number(slot.order))) return Number(slot.order)
  return 1000
}

export function normalizeLocalityKey(name: string): string {
  return name.trim().toLowerCase()
}

/** PG belongs to locality (string field or micro-location ref name). */
export function pgMatchesLocality(pg: PgRow, localityName: string): boolean {
  const want = normalizeLocalityKey(localityName)
  if (!want) return true
  const pgLoc = normalizeLocalityKey(pgLocalityLabel(pg))
  if (pgLoc === want) return true
  if (pgLoc.includes(want) || want.includes(pgLoc)) return pgLoc.length > 0
  const slot = getPrioritySlot(pg, 'micro_location')
  if (slot?.name && normalizeLocalityKey(slot.name) === want) return true
  return false
}

export function filterMicroLocationPriority(rows: PgRow[], localityName: string): PgRow[] {
  const name = localityName.trim()
  if (!name) return rows
  const want = normalizeLocalityKey(name)
  return rows.filter((pg) => {
    const slot = getPrioritySlot(pg, 'micro_location')
    if (!slot?.is_active) return false
    const slotName = normalizeLocalityKey(slot.name ?? '')
    if (slotName === want) return true
    return pgMatchesLocality(pg, name)
  })
}

export function sortByPriorityOrder(rows: PgRow[], type: PgPriorityType): PgRow[] {
  return [...rows].sort((a, b) => getPriorityOrder(a, type) - getPriorityOrder(b, type))
}

export function filterApprovedPgs(rows: PgRow[]): PgRow[] {
  return rows.filter(isPgApproved)
}

export function buildDragPayload(
  priorityType: PgPriorityType,
  ordered: PgRow[],
  cityId?: string,
  localityName?: string,
) {
  const updatedProjects = ordered.map((pg, index) => {
    const _id = pgRowId(pg)
    const order = index + 1
    const active = { order, is_active: true as const }
    if (priorityType === 'location') {
      return { _id, priority: { location: { ...active, city: cityId } } }
    }
    if (priorityType === 'micro_location') {
      return {
        _id,
        priority: {
          micro_location: { ...active, city: cityId, name: localityName ?? pgLocalityLabel(pg) },
        },
      }
    }
    return { _id, priority: { overall: active } }
  })
  return { priorityType, virtual_priority: false as const, updatedProjects }
}

export function nextPriorityOrder(rows: PgRow[], type: PgPriorityType): number {
  if (!rows.length) return 1
  const max = Math.max(...rows.map((r) => getPriorityOrder(r, type)).filter((n) => n < 1000))
  return (Number.isFinite(max) ? max : 0) + 1
}
