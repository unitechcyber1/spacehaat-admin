import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { cn } from '../lib/ui'

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          className={cn(
            'w-full max-w-2xl rounded-3xl bg-white/80 shadow-2xl ring-1 ring-slate-200/70 backdrop-blur-xl',
            'max-h-[85vh] overflow-auto',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4">
            <div>
              <DialogTitle as="h2" className="text-base font-semibold text-slate-900">
                {title}
              </DialogTitle>
              <p className="mt-1 text-sm text-slate-500">Changes are saved to the server.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-white/70 hover:text-slate-700 hover:ring-1 hover:ring-slate-200"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

