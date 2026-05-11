import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { getStoredUserId } from '../../services/auth/auth.service'
import {
  addNoteToLead,
  deleteNoteInLead,
  getEnquiryById,
  type EnquiryLead,
  updateLeadFields,
  updateNoteInLead,
} from '../../services/enquiry/enquiry.service'
import { LEAD_STAGES } from './enquiryConstants'

function leadId(lead: EnquiryLead | undefined) {
  if (!lead) return ''
  return String(lead.id ?? lead._id ?? '')
}

function otherInfo(lead: EnquiryLead | undefined) {
  return (lead?.other_info as Record<string, string> | undefined) ?? {}
}

function fmtWhen(iso: string | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type NoteRow = {
  _id?: string
  note?: string
  added_on?: string
  updated_on?: string
  user?: { name?: string } | string
}

function noteAuthor(n: NoteRow): string {
  const u = n.user
  if (u && typeof u === 'object' && 'name' in u) return String((u as { name?: string }).name ?? '')
  if (typeof u === 'string') return u
  return '—'
}

type Props = {
  open: boolean
  leadIdParam: string | null
  onClose: () => void
}

export function EnquiryLeadDrawer({ open, leadIdParam, onClose }: Props) {
  const qc = useQueryClient()
  const actorId = getStoredUserId()
  const [draftNote, setDraftNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const detailQ = useQuery({
    queryKey: ['enquiry', 'detail', leadIdParam],
    queryFn: () => getEnquiryById(leadIdParam!),
    enabled: open && Boolean(leadIdParam),
  })

  const data = detailQ.data?.data as EnquiryLead | undefined
  const notes = ((data?.notes as NoteRow[] | undefined) ?? []).slice().sort((a, b) => {
    const ta = new Date(a.added_on ?? 0).getTime()
    const tb = new Date(b.added_on ?? 0).getTime()
    return tb - ta
  })

  useEffect(() => {
    if (!open) {
      setDraftNote('')
      setEditingId(null)
      setEditText('')
    }
  }, [open])

  const stageMut = useMutation({
    mutationFn: (lead_stage: string) => updateLeadFields({ lead_stage, id: leadId(data) }),
    onSuccess: () => {
      toast.success('Stage updated')
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadIdParam] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  const addNoteMut = useMutation({
    mutationFn: () =>
      addNoteToLead({
        id: leadId(data),
        noteContent: draftNote.trim(),
        user: actorId,
      }),
    onSuccess: () => {
      toast.success('Note added')
      setDraftNote('')
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadIdParam] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to add note'),
  })

  const delNoteMut = useMutation({
    mutationFn: (noteId: string) =>
      deleteNoteInLead({ leadId: String(data?._id ?? data?.id ?? ''), noteId }),
    onSuccess: () => {
      toast.success('Note removed')
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadIdParam] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const updNoteMut = useMutation({
    mutationFn: (payload: { noteId: string; updatedContent: string }) =>
      updateNoteInLead({
        leadId: String(data?._id ?? data?.id ?? ''),
        noteId: payload.noteId,
        updatedContent: payload.updatedContent.trim(),
        user: actorId || undefined,
      }),
    onSuccess: () => {
      toast.success('Note updated')
      setEditingId(null)
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadIdParam] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  if (!open) return null

  const oi = otherInfo(data)
  const lid = leadId(data)

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className="relative z-[81] flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Lead details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {detailQ.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {detailQ.isError && (
            <p className="text-sm text-red-600">Could not load this lead. Try again or open edit from the list.</p>
          )}
          {data && (
            <>
              <div className="mb-4 flex flex-col gap-3">
                <div>
                  <p className="text-xl font-semibold text-slate-900">{oi.name ?? '—'}</p>
                  <label className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lead stage
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={String(data.lead_stage ?? '')}
                    disabled={stageMut.isPending || !lid}
                    onChange={(e) => stageMut.mutate(e.target.value)}
                  >
                    {LEAD_STAGES.filter((s) => s.value !== 'all').map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                {data.interested_in ? (
                  <p className="text-sm text-violet-700">{String(data.interested_in)}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                  {data.no_of_seats ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">{String(data.no_of_seats)} seats</span>
                  ) : null}
                  {data.budget ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">{String(data.budget)}</span>
                  ) : null}
                  {data.booking_date ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">
                      Visit: {fmtWhen(String(data.booking_date))}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium text-slate-600">Phone:</span>{' '}
                    <button
                      type="button"
                      className="text-violet-700 underline"
                      onClick={() => oi.phone_number && navigator.clipboard.writeText(oi.phone_number)}
                    >
                      {oi.phone_number ?? '—'}
                    </button>
                  </p>
                  <p>
                    <span className="font-medium text-slate-600">Email:</span>{' '}
                    <button
                      type="button"
                      className="text-violet-700 underline"
                      onClick={() => oi.email && navigator.clipboard.writeText(oi.email)}
                    >
                      {oi.email ?? '—'}
                    </button>
                  </p>
                  <p>
                    <span className="font-medium text-slate-600">City:</span> {String(data.city ?? '—')}
                    {data.microlocation ? <span> · {String(data.microlocation)}</span> : null}
                  </p>
                  <p className="text-slate-500">
                    Added {fmtWhen(String(data.added_on ?? ''))}
                  </p>
                  {data.page_url ? (
                    <a
                      href={String(data.page_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-violet-600 underline"
                    >
                      {String(data.page_url)}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Notes <span className="text-slate-500">({notes.length})</span>
                </h3>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
                  <textarea
                    className="min-h-[88px] w-full resize-y rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Type your note…"
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setDraftNote('')}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={!draftNote.trim() || addNoteMut.isPending || !actorId}
                      onClick={() => addNoteMut.mutate()}
                    >
                      Add note
                    </Button>
                  </div>
                  {!actorId ? (
                    <p className="mt-2 text-xs text-amber-700">Sign in again if notes fail (missing user id).</p>
                  ) : null}
                </div>

                <ul className="mt-4 space-y-3">
                  {notes.map((n) => {
                    const nid = String(n._id ?? '')
                    const isEd = editingId === nid
                    return (
                      <li key={nid || Math.random()} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-800">{noteAuthor(n)}</p>
                            <p className="text-xs text-slate-500">
                              {fmtWhen(String(n.updated_on ?? n.added_on ?? ''))}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {isEd ? (
                              <>
                                <button
                                  type="button"
                                  className="text-xs text-violet-700"
                                  onClick={() => {
                                    if (editText.trim()) updNoteMut.mutate({ noteId: nid, updatedContent: editText })
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-slate-500"
                                  onClick={() => {
                                    setEditingId(null)
                                    setEditText('')
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="text-xs text-violet-700"
                                  onClick={() => {
                                    setEditingId(nid)
                                    setEditText(n.note ?? '')
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-red-600"
                                  onClick={() => nid && delNoteMut.mutate(nid)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isEd ? (
                          <textarea
                            className="mt-2 w-full rounded-lg border-0 bg-slate-50 px-2 py-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-slate-700">{n.note ?? ''}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
