import type { ReactNode } from 'react'
import { cn } from '../lib/ui'

/** Standard filter panel used on list pages. */
export function ListFilterCard({
  title = 'Filters',
  description,
  onReset,
  resetLabel = 'Reset filters',
  children,
  className,
}: {
  title?: string
  description?: string
  onReset?: () => void
  resetLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('filter-card', className)}>
      <div className="filter-card-inner">
        <div className="filter-card-head">
          <div className="min-w-0">
            <h2 className="filter-card-title">{title}</h2>
            {description ? <p className="filter-card-desc">{description}</p> : null}
          </div>
          {onReset ? (
            <button type="button" className="btn sm secondary filter-card-reset" onClick={onReset}>
              {resetLabel}
            </button>
          ) : null}
        </div>
        <div className="filter-card-body">{children}</div>
      </div>
    </div>
  )
}
