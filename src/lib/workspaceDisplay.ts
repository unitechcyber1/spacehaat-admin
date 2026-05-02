import type { WorkspaceListItem } from '../services/coworking/types'

/** List/detail rows may use `id` or Mongo `_id` only — normalize for keys and API payloads. */
export function workspaceRowId(w: { id?: string; _id?: string }): string {
  const raw = w.id ?? w._id
  if (raw == null || raw === '') return ''
  return String(raw)
}

/** City label for workspace list/detail rows. */
export function workspaceCityLabel(w: WorkspaceListItem): string {
  const c = w.location?.city
  if (c == null) return '—'
  if (typeof c === 'string') return c
  return c.name ?? '—'
}

/**
 * Micro-location line: populated microlocation(s), then `micro_location_string`, then venue `location.name`.
 */
export function workspaceMicroLocationLabel(w: WorkspaceListItem): string {
  const loc = w.location
  if (!loc) return '—'
  const ml = loc.micro_location
  if (ml != null) {
    if (Array.isArray(ml)) {
      const parts = ml
        .map((x) => {
          if (typeof x === 'string') return x.trim()
          if (x && typeof x === 'object' && 'name' in x) return String((x as { name?: string }).name ?? '').trim()
          return ''
        })
        .filter(Boolean)
      if (parts.length) return parts.join(', ')
    }
    if (typeof ml === 'string' && ml.trim()) return ml.trim()
    if (typeof ml === 'object' && ml !== null) {
      const n = (ml as { name?: string }).name
      if (n?.trim()) return n.trim()
    }
  }
  const mls = loc.micro_location_string?.trim()
  if (mls) return mls
  const venue = loc.name?.trim()
  if (venue) return venue
  return '—'
}
