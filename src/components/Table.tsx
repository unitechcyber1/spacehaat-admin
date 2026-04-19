import { cn } from '../lib/ui'

export function Table({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white/70 shadow-sm ring-1 ring-slate-200/70 backdrop-blur',
        className,
      )}
    >
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">{children}</table>
      </div>
    </div>
  )
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
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
    <td {...props} className={cn('px-4 py-3 text-slate-700', className)}>
      {children}
    </td>
  )
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-slate-100/80 hover:bg-slate-50/60">{children}</tr>
}

