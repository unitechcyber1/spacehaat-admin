import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { cn } from '../lib/ui'

export type ModalSize = 'sm' | 'md' | 'lg' | 'wide' | 'xl'

const SIZES: Record<ModalSize, string> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: '',
  wide: 'modal-wide',
  xl: 'modal-xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: ModalSize
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[1300]">
      <div className="modal-bg">
        <DialogPanel className={cn('modal', SIZES[size], size === 'lg' && 'w-[720px]', className)}>
          <div className="modal-head">
            <div className="min-w-0">
              <DialogTitle as="h3">{title}</DialogTitle>
              {description ? (
                <p className="mt-0.5 text-[12px] text-muted">{description}</p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="x" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-foot">{footer}</div> : null}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
