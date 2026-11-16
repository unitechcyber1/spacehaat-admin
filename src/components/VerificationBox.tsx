import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from './Button'
import { setListingVerification, type VerificationMethod } from '../services/listings/verification.service'

const METHOD_LABEL: Record<VerificationMethod, string> = {
  call: 'Phone call with the operator',
  visit: 'Site visit by our team',
  documents: 'Documents from the operator',
}

type Value = { verified_at?: unknown; verified_by?: unknown; verified_method?: unknown }

/**
 * "Verified on <date>" badge control for a coworking space or PG. Saves immediately (separate from the
 * form's Save button), recording today's date and the logged-in admin.
 */
export function VerificationBox({
  kind,
  id,
  value,
  onChange,
}: {
  kind: 'workspace' | 'pg'
  id: string
  value: Value
  onChange: (v: { verified_at: string | null; verified_by: string; verified_method: string }) => void
}) {
  const [method, setMethod] = useState<VerificationMethod>(
    (['call', 'visit', 'documents'].includes(String(value.verified_method)) ? value.verified_method : 'call') as VerificationMethod,
  )
  const [busy, setBusy] = useState(false)
  const at = value.verified_at ? new Date(String(value.verified_at)) : null
  const valid = at && !Number.isNaN(at.getTime())

  async function save(body: { method: VerificationMethod } | { remove: true }) {
    setBusy(true)
    try {
      const v = await setListingVerification(kind, id, body)
      onChange({ verified_at: v.verified_at, verified_by: v.verified_by, verified_method: v.verified_method })
      toast.success('remove' in body ? 'Verification removed' : 'Marked as verified')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save verification')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-semibold text-slate-700">Verification (shown on the website)</p>
      {valid ? (
        <p className="mt-1 text-sm text-emerald-700">
          ✓ Verified on {at!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {value.verified_by ? ` by ${String(value.verified_by)}` : ''}
          {value.verified_method ? ` · ${METHOD_LABEL[value.verified_method as VerificationMethod] ?? ''}` : ''}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Not verified — no badge on the website.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
          value={method}
          onChange={(e) => setMethod(e.target.value as VerificationMethod)}
          disabled={busy}
        >
          {(Object.keys(METHOD_LABEL) as VerificationMethod[]).map((m) => (
            <option key={m} value={m}>
              {METHOD_LABEL[m]}
            </option>
          ))}
        </select>
        <Button type="button" variant="primary" className="text-sm" disabled={busy || !id} onClick={() => save({ method })}>
          {valid ? 'Verify again today' : 'Mark as verified'}
        </Button>
        {valid ? (
          <Button type="button" variant="secondary" className="text-sm" disabled={busy} onClick={() => save({ remove: true })}>
            Remove verification
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Only mark verified after confirming the address, prices and availability with the operator. The website shows
        “Verified on {'<date>'}”.
      </p>
    </div>
  )
}
