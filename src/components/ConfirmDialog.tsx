import { Modal } from './Modal'
import { Button } from './Button'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className="max-w-lg">
      {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button onClick={onConfirm} type="button" variant={danger ? 'danger' : 'primary'}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}

