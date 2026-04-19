import { cn } from '../lib/ui'

export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className={cn('flex items-center gap-2')}>{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

