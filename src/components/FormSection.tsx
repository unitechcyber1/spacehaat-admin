import type { ReactNode } from 'react'
import { cn } from '../lib/ui'

/** Standard section card for detail / form pages. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('form-section', className)}>
      {title ? (
        <header className="form-section-head">
          <h2 className="form-section-title">{title}</h2>
          {description ? <p className="form-section-desc">{description}</p> : null}
        </header>
      ) : null}
      <div className="form-section-body">{children}</div>
    </section>
  )
}
