import { cn } from '../lib/ui'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-slate-900',
        className,
      )}
    />
  )
}

