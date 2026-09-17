import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ClipboardDocumentIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from './Button'
import { cn } from '../lib/ui'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function copyText(label: string, value: string) {
  if (!value || value === '—') return
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error(`Could not copy ${label.toLowerCase()}`),
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof EnvelopeIcon
  label: string
  value: string
  href?: string
}) {
  const display = value.trim() || '—'
  const hasValue = display !== '—'

  return (
    <div className="detail-row">
      <div className="detail-row-icon" aria-hidden>
        <Icon className="h-5 w-5" />
      </div>
      <div className="detail-row-body min-w-0">
        <div className="detail-row-label">{label}</div>
        {hasValue && href ? (
          <a href={href} className="detail-row-value link truncate" title={display}>
            {display}
          </a>
        ) : (
          <div className="detail-row-value truncate">{display}</div>
        )}
      </div>
      {hasValue ? (
        <button
          type="button"
          className="detail-row-copy"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => copyText(label, display)}
        >
          <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/** Portals to `document.body` so it is not clipped by the Headless UI portal root. */
export function UserDetailsModal({
  open,
  onClose,
  name,
  email,
  phone,
  role = 'User',
}: {
  open: boolean
  onClose: () => void
  name?: string
  email?: string
  phone?: string
  role?: 'Admin' | 'User'
}) {
  const displayName = name?.trim() || 'Unknown user'
  const isAdmin = role === 'Admin'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="modal-bg" onClick={onClose} role="presentation">
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="min-w-0">
            <h3 id="user-details-title">User details</h3>
            <p className="mt-0.5 text-[12px] text-muted">Contact information for the listing owner.</p>
          </div>
          <button type="button" onClick={onClose} className="x" aria-label="Close">
            <XMarkIcon className="h-[17px] w-[17px]" aria-hidden />
          </button>
        </div>

        <div className="modal-body">
          <div className="user-detail-hero">
            <div
              className={cn(
                'user-detail-avatar',
                isAdmin ? 'user-detail-avatar-admin' : 'user-detail-avatar-user',
              )}
              aria-hidden
            >
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-ink">{displayName}</p>
              <span className={cn('chip mt-1.5', isAdmin ? 'brand' : 'info')}>
                <UserCircleIcon className="h-3.5 w-3.5" aria-hidden />
                {role}
              </span>
            </div>
          </div>

          <div className="detail-rows">
            <ContactRow
              icon={EnvelopeIcon}
              label="Email"
              value={email ?? ''}
              href={email?.trim() ? `mailto:${email.trim()}` : undefined}
            />
            <ContactRow
              icon={PhoneIcon}
              label="Phone"
              value={phone ?? ''}
              href={phone?.trim() ? `tel:${phone.trim()}` : undefined}
            />
          </div>
        </div>

        <div className="modal-foot">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
