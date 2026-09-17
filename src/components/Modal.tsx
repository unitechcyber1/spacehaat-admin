import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
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
  const openedAtRef = useRef(0)

  useEffect(() => {
    if (open) openedAtRef.current = Date.now()
  }, [open])

  const handleClose = () => {
    // Headless UI can treat the same click that opened the dialog as an outside dismiss.
    if (Date.now() - openedAtRef.current < 200) return
    onClose()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <Dialog open={open} onClose={handleClose} className="relative z-[1300]">
      <DialogBackdrop className="modal-backdrop" />
      <div className="modal-shell">
        <DialogPanel className={cn('modal', SIZES[size], size === 'lg' && 'w-[720px]', className)}>
          <div className="modal-head">
            <div className="min-w-0">
              <DialogTitle as="h3">{title}</DialogTitle>
              {description ? (
                <p className="mt-0.5 text-[12px] text-muted">{description}</p>
              ) : null}
            </div>
            <button type="button" onClick={handleClose} className="x" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer ? <div className="modal-foot">{footer}</div> : null}
        </DialogPanel>
      </div>
    </Dialog>,
    document.body,
  )
}
