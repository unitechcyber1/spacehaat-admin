import type { HTMLAttributes } from 'react'
import { cn } from '../lib/ui'

export function Table({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="tbl-wrap">
        <table className="tbl">{children}</table>
      </div>
    </div>
  )
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
