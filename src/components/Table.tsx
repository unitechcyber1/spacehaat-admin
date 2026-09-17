import type { HTMLAttributes } from 'react'
import { cn } from '../lib/ui'

export function Table({
  children,
  className,
  bare = false,
}: {
  children: React.ReactNode
  className?: string
  /** Skip outer card wrapper when the table sits inside another panel. */
  bare?: boolean
}) {
  const table = (
    <div className="tbl-wrap">
      <table className="tbl">{children}</table>
    </div>
  )
  if (bare) {
    return <div className={cn('overflow-hidden', className)}>{table}</div>
  }
  return <div className={cn('card overflow-hidden', className)}>{table}</div>
}

export function Th({ children, className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...props} className={className}>
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...props} className={className}>
      {children}
    </td>
  )
}

export function Tr({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr {...props} className={className}>
      {children}
    </tr>
  )
}
