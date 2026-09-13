import { cn } from '../lib/ui'

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function Input({ className, invalid = false, ...props }: Props) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn('inp', invalid && 'invalid', className)}
    />
  )
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export function Select({ className, invalid = false, ...props }: SelectProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cn('inp', invalid && 'invalid', className)}
    />
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
}

export function Textarea({ className, invalid = false, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn('inp', invalid && 'invalid', className)}
    />
  )
}

/** Labelled form field wrapper matching the CRM `label.fld` pattern. */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn('fld', className)}>
      {label ? (
        <span className="lab">
          {label}
          {required ? <span className="text-expired"> *</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="fld-error">{error}</span>
      ) : hint ? (
        <span className="fld-hint">{hint}</span>
      ) : null}
    </label>
  )
}
