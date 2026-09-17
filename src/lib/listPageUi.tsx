import type { ReactNode } from 'react'
import { cn } from './ui'

/** Shared filter field label — use inside `ListFilterCard`. */
export const filterLabelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted'

/** Shared filter select/input ring style. */
export const filterSelectClass =
  'w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-sm text-ink shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

export type WorkflowStatus = 'approve' | 'reject' | 'pending' | 'inprogress' | string | undefined

export function workflowStatusLabel(status: WorkflowStatus): string {
  if (status === 'approve') return 'Enabled'
  if (status === 'reject') return 'Disabled'
  if (status === 'pending') return 'Pending'
  if (status === 'inprogress') return 'In progress'
  if (status?.toLowerCase() === 'active') return 'Active'
  if (status?.toLowerCase() === 'inactive') return 'Inactive'
  return status ? String(status) : '—'
}

export function workflowStatusTone(status: WorkflowStatus): 'fresh' | 'expired' | 'stale' | 'info' | 'muted' {
  if (status === 'approve' || status?.toLowerCase() === 'active') return 'fresh'
  if (status === 'reject' || status?.toLowerCase() === 'inactive') return 'expired'
  if (status === 'pending') return 'stale'
  if (status === 'inprogress') return 'info'
  return 'muted'
}

export function workflowStatusPillClass(status: WorkflowStatus): string {
  const tone = workflowStatusTone(status)
  if (tone === 'fresh') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (tone === 'expired') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (tone === 'stale') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (tone === 'info') return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

export type IconActionTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'

export function iconActionClass(tone: IconActionTone = 'slate'): string {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
      : tone === 'amber'
        ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-900'
        : tone === 'rose'
          ? 'text-rose-700 hover:bg-rose-50 hover:text-rose-900'
          : tone === 'violet'
            ? 'text-violet-700 hover:bg-violet-50 hover:text-violet-900'
            : tone === 'sky'
              ? 'text-sky-700 hover:bg-sky-50 hover:text-sky-900'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'

  return cn(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-slate-200/80 transition',
    'focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40',
    toneClass,
  )
}

export function IconTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap',
          'rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg',
          'opacity-0 transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function sortIndicator(active: boolean, orderBy: '1' | '-1' | ''): string {
  if (!active) return '↕'
  return orderBy === '-1' ? '↓' : '↑'
}

export function resolveListTotal(
  response?: { totalRecords?: number; totleRecords?: number; data?: unknown[] },
  fallbackLength = 0,
): number {
  if (!response) return fallbackLength
  if (typeof response.totalRecords === 'number' && response.totalRecords >= 0) {
    return response.totalRecords
  }
  if (typeof response.totleRecords === 'number' && response.totleRecords >= 0) {
    return response.totleRecords
  }
  return Array.isArray(response.data) ? response.data.length : fallbackLength
}
