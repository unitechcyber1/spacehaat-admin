import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { IconTooltip, iconActionClass, type IconActionTone } from '../lib/listPageUi'

export function IconAction({
  label,
  tone = 'slate',
  children,
  className,
  ...props
}: {
  label: string
  tone?: IconActionTone
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <IconTooltip label={label}>
      <button
        type="button"
        className={className ?? iconActionClass(tone)}
        aria-label={label}
        {...props}
      >
        {children}
      </button>
    </IconTooltip>
  )
}
