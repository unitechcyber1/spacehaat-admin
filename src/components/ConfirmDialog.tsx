import { Modal } from './Modal'
import { Button } from './Button'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onCancel} variant="ghost" disabled={busy}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant={danger ? 'dangerSolid' : 'primary'}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmText}
          </Button>
        </>
      }
    >
      {description ? <p className="text-[13px] leading-relaxed text-muted">{description}</p> : null}
    </Modal>
  )
}
