import { cn } from '../lib/ui'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export function Button({ className, variant = 'secondary', ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-60',
        variant === 'primary' &&
          'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 text-white shadow-md shadow-violet-600/15 hover:brightness-105 active:brightness-95',
        variant === 'secondary' &&
          'bg-white/80 text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-white',
        variant === 'danger' &&
          'bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-md shadow-rose-600/15 hover:brightness-105 active:brightness-95',
        variant === 'ghost' &&
          'bg-transparent text-slate-700 hover:bg-white/70 hover:ring-1 hover:ring-slate-200',
        className,
      )}
    />
  )
}

