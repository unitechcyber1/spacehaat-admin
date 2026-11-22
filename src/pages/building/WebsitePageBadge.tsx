import type { BuildingRecord } from '../../services/building/building.service'

export function WebsitePageBadge({ row }: { row: Pick<BuildingRecord, 'has_page' | 'is_active' | 'live_centres'> }) {
  if (row.has_page) return <span className="text-sm font-medium text-emerald-700">Live page</span>
  const reason = row.is_active === false ? 'Building hidden' : `Needs 2+ live centres (has ${row.live_centres ?? 0})`
  return <span className="text-sm text-slate-500">No page · {reason}</span>
}
