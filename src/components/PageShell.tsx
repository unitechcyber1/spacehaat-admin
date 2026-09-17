import { cn } from '../lib/ui'

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('screen', className)}>
      <div className="page-head">
        <div className="min-w-0">
          <h1>{title}</h1>
          {description ? <p className="sub">{description}</p> : null}
        </div>
        {actions ? <div className="actions">{actions}</div> : null}
      </div>
      <div className="page-stack">{children}</div>
    </div>
  )
}
