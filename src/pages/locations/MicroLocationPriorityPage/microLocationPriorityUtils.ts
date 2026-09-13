import type {
  MicroLocationPriorityRow,
  MicroLocationSpaceType,
} from '../../../services/locations/microLocation.service'

/** Default country filter used by the legacy Angular admin for city lookups. */
export const INDIA_COUNTRY_ID = '6231ae062a52af3ddaa73a39'

export const SPACE_TYPE_OPTIONS: { value: MicroLocationSpaceType; label: string }[] = [
  { value: 'for_coworking', label: 'Co-working' },
  { value: 'for_coliving', label: 'Co-living' },
  { value: 'for_office', label: 'Office' },
]

export type MicroLocationPriorityScope = 'location'

export const PRIORITY_SCOPE_OPTIONS: { value: MicroLocationPriorityScope; label: string }[] = [
  { value: 'location', label: 'City' },
]

export function microLocationRowId(row: MicroLocationPriorityRow): string {
  return String(row.id ?? row._id ?? '')
}

export function microLocationCityName(row: MicroLocationPriorityRow): string {
  const c = row.city
  if (!c) return 'No city'
  if (typeof c === 'string') return c
  return c.name ?? 'No city'
}

export function getSpaceTypeOrder(row: MicroLocationPriorityRow, spaceType: MicroLocationSpaceType) {
  const slot = row.priority?.[spaceType]
  if (slot?.order != null && Number.isFinite(Number(slot.order))) return Number(slot.order)
  return 1000
}

export function sortBySpaceTypeOrder(
  rows: MicroLocationPriorityRow[],
  spaceType: MicroLocationSpaceType,
): MicroLocationPriorityRow[] {
  return [...rows].sort((a, b) => getSpaceTypeOrder(a, spaceType) - getSpaceTypeOrder(b, spaceType))
}

export function applySelectedFlags(
  rows: MicroLocationPriorityRow[],
  priorityRows: MicroLocationPriorityRow[],
): MicroLocationPriorityRow[] {
  const ids = new Set(priorityRows.map(microLocationRowId).filter(Boolean))
  return rows.map((row) => ({
    ...row,
    isSelected: ids.has(microLocationRowId(row)),
  }))
}

export function spaceTypeQueryParams(spaceType: MicroLocationSpaceType) {
  const params: Record<string, unknown> = { country_id: INDIA_COUNTRY_ID }
  if (spaceType === 'for_coworking') params.for_coworking = true
  if (spaceType === 'for_coliving') params.for_coliving = true
  if (spaceType === 'for_office') params.for_office = true
  return params
}

type ListTotalResponse = {
  totalRecords?: number
  totleRecords?: number
  data?: unknown[]
}

/** Legacy APIs sometimes return `totleRecords` (typo) instead of `totalRecords`. */
export function resolveListTotal(response?: ListTotalResponse, fallbackLength = 0): number {
  if (!response) return fallbackLength
  if (typeof response.totalRecords === 'number' && response.totalRecords >= 0) {
    return response.totalRecords
  }
  if (typeof response.totleRecords === 'number' && response.totleRecords >= 0) {
    return response.totleRecords
  }
  return Array.isArray(response.data) ? response.data.length : fallbackLength
}

/** Match Angular drag save: each row must carry updated `priority[spaceType].order`. */
export function buildMicrolocationDragPayload(
  spaceType: MicroLocationSpaceType,
  ordered: MicroLocationPriorityRow[],
  cityId?: string,
) {
  const updatedLocations = ordered.map((row, index) => {
    const order = index + 1
    const id = microLocationRowId(row)
    const existingSlot = row.priority?.[spaceType] ?? {}
    return {
      ...row,
      id: row.id ?? id,
      priority: {
        ...(row.priority ?? {}),
        [spaceType]: {
          ...existingSlot,
          order,
          is_active: existingSlot.is_active ?? true,
          ...(cityId ? { city: cityId } : {}),
        },
      },
    }
  })
  return { updatedLocations, spaceType }
}
