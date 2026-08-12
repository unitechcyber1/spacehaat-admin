import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Input } from '../Input'
import { cn } from '../../lib/ui'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const fieldClass =
  'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/90 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

export type LinkValue = {
  href: string
  text: string
  newTab: boolean
  nofollow: boolean
  sponsored: boolean
}

export function LinkDialog({
  open,
  initial,
  hasSelection,
  canRemove,
  onCancel,
  onSubmit,
  onRemove,
}: {
  open: boolean
  initial: LinkValue
  hasSelection: boolean
  canRemove: boolean
  onCancel: () => void
  onSubmit: (value: LinkValue) => void
  onRemove: () => void
}) {
  const [value, setValue] = useState<LinkValue>(initial)
  const [wasOpen, setWasOpen] = useState(open)

  /** Resync from `initial` on open — adjusting state during render avoids a cascading effect. */
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setValue(initial)
  }

  function patch(partial: Partial<LinkValue>) {
    setValue((prev) => ({ ...prev, ...partial }))
  }

  return (
    <Modal open={open} onClose={onCancel} title="Insert link" className="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="rte-link-url">
            URL
          </label>
          <Input
            id="rte-link-url"
            autoFocus
            className="mt-1 rounded-xl"
            value={value.href}
            onChange={(e) => patch({ href: e.target.value })}
            placeholder="https://example.com/page"
          />
        </div>

        {!hasSelection ? (
          <div>
            <label className={labelClass} htmlFor="rte-link-text">
              Anchor text
            </label>
            <Input
              id="rte-link-text"
              className="mt-1 rounded-xl"
              value={value.text}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="Descriptive anchor text"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use descriptive anchor text — avoid “click here”.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={value.newTab}
              onChange={(e) => patch({ newTab: e.target.checked })}
            />
            Open in new tab
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={value.nofollow}
              onChange={(e) => patch({ nofollow: e.target.checked })}
            />
            Nofollow
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              checked={value.sponsored}
              onChange={(e) => patch({ sponsored: e.target.checked })}
            />
            Sponsored
          </label>
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            className={cn('text-rose-700', !canRemove && 'invisible')}
            onClick={onRemove}
          >
            Remove link
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!value.href.trim()}
              onClick={() => onSubmit(value)}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export type ImageValue = {
  src: string
  alt: string
  title: string
  width: string
  align: 'left' | 'center' | 'right' | ''
}

export function ImageDialog({
  open,
  initial,
  uploading,
  onCancel,
  onUpload,
  onSubmit,
}: {
  open: boolean
  initial: ImageValue
  uploading: boolean
  onCancel: () => void
  onUpload: (file: File) => Promise<string | null>
  onSubmit: (value: ImageValue) => void
}) {
  const [value, setValue] = useState<ImageValue>(initial)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setValue(initial)
  }

  function patch(partial: Partial<ImageValue>) {
    setValue((prev) => ({ ...prev, ...partial }))
  }

  async function handleFile(file: File) {
    const src = await onUpload(file)
    if (src) {
      patch({
        src,
        alt: value.alt || file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '),
      })
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title="Insert image" className="max-w-xl">
      <div className="space-y-4">
        <div>
          <span className={labelClass}>Upload</span>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-700 disabled:opacity-60"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
          {uploading ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
        </div>

        <div>
          <label className={labelClass} htmlFor="rte-image-src">
            Image URL
          </label>
          <Input
            id="rte-image-src"
            className="mt-1 rounded-xl"
            value={value.src}
            onChange={(e) => patch({ src: e.target.value })}
            placeholder="https://cdn.example.com/photo.webp"
          />
        </div>

        {value.src ? (
          <img
            src={value.src}
            alt=""
            className="max-h-40 w-auto rounded-lg border border-slate-200 object-contain"
          />
        ) : null}

        <div>
          <label className={labelClass} htmlFor="rte-image-alt">
            Alt text
          </label>
          <Input
            id="rte-image-alt"
            className="mt-1 rounded-xl"
            value={value.alt}
            onChange={(e) => patch({ alt: e.target.value })}
            placeholder="Describe the image for search engines and screen readers"
          />
          {!value.alt.trim() ? (
            <p className="mt-1 text-xs text-amber-700">
              Alt text is missing — images without alt text hurt accessibility and image SEO.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="rte-image-title">
              Title (optional)
            </label>
            <Input
              id="rte-image-title"
              className="mt-1 rounded-xl"
              value={value.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Tooltip text"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rte-image-width">
              Width
            </label>
            <Input
              id="rte-image-width"
              className="mt-1 rounded-xl"
              value={value.width}
              onChange={(e) => patch({ width: e.target.value })}
              placeholder="e.g. 640 or 100%"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rte-image-align">
              Alignment
            </label>
            <select
              id="rte-image-align"
              className={fieldClass}
              value={value.align}
              onChange={(e) => patch({ align: e.target.value as ImageValue['align'] })}
            >
              <option value="">Default</option>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!value.src.trim()}
            onClick={() => onSubmit(value)}
          >
            Insert
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function TableDialog({
  open,
  onCancel,
  onSubmit,
}: {
  open: boolean
  onCancel: () => void
  onSubmit: (rows: number, cols: number, withHeaderRow: boolean) => void
}) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [withHeaderRow, setWithHeaderRow] = useState(true)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setRows(3)
      setCols(3)
      setWithHeaderRow(true)
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title="Insert table" className="max-w-md">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rte-table-rows">
              Rows
            </label>
            <Input
              id="rte-table-rows"
              type="number"
              min={1}
              max={50}
              className="mt-1 rounded-xl"
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rte-table-cols">
              Columns
            </label>
            <Input
              id="rte-table-cols"
              type="number"
              min={1}
              max={20}
              className="mt-1 rounded-xl"
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            checked={withHeaderRow}
            onChange={(e) => setWithHeaderRow(e.target.checked)}
          />
          Include header row
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={() => onSubmit(rows, cols, withHeaderRow)}>
            Insert
          </Button>
        </div>
      </div>
    </Modal>
  )
}
