import { cn } from '../lib/ui'
import {
  workflowStatusLabel,
  workflowStatusPillClass,
  type WorkflowStatus,
} from '../lib/listPageUi'

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: WorkflowStatus
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        workflowStatusPillClass(status),
        className,
      )}
    >
      {label ?? workflowStatusLabel(status)}
    </span>
  )
}

export function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }: { value?: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        value ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200',
      )}
    >
      {value ? trueLabel : falseLabel}
    </span>
  )
}
