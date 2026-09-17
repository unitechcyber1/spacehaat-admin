import type { ReactNode } from 'react'
import { cn } from '../../lib/ui'

export function BillingBadge({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  )
}
