import { cn } from '../lib/ui'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'dangerSolid' | 'success' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

const VARIANTS: Record<NonNullable<Props['variant']>, string> = {
  primary: 'primary',
  secondary: '',
  danger: 'danger',
  dangerSolid: 'danger solid',
  success: 'success',
  ghost: 'ghost',
}

export function Button({
  className,
  variant = 'secondary',
  size = 'md',
  block = false,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        'btn',
        VARIANTS[variant],
        size === 'sm' && 'sm',
        size === 'lg' && 'lg',
        block && 'block',
        className,
      )}
    />
  )
}
