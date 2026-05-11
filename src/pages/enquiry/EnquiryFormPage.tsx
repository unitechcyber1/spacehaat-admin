import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { PageShell } from '../../components/PageShell'
import { cn } from '../../lib/ui'
import { getStoredUserId } from '../../services/auth/auth.service'
import {
  addNoteToLead,
  createManualLead,
  deleteNoteInLead,
  getEnquiryById,
  type EnquiryLead,
  updateLeadFields,
  updateManualLead,
  updateNoteInLead,
} from '../../services/enquiry/enquiry.service'
import {
  FORM_BUDGET_OPTIONS,
  FORM_SEAT_OPTIONS,
  FORM_SPACE_TYPES,
  LEAD_SOURCE_OPTIONS,
  LEAD_STAGES,
} from './enquiryConstants'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const fieldClass =
  'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500'

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

function normalizePhone(phone: string) {
  const p = phone.trim()
  if (!p.startsWith('+') && /^[0-9]{10}$/.test(p)) return `+91-${p}`
  return p
}

function leadApiId(lead: EnquiryLead | undefined) {
  if (!lead) return ''
  return String(lead.id ?? lead._id ?? '')
}

function mongoId(lead: EnquiryLead | undefined) {
  if (!lead) return ''
  return String(lead._id ?? lead.id ?? '')
}

export function EnquiryFormPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(leadId)
  const actorId = getStoredUserId()

  const [space_type, setSpaceType] = useState('Web Coworking')
  const [leadSource, setLeadSource] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone_number, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [interested_in, setInterestedIn] = useState('')
  const [no_of_seats, setNoOfSeats] = useState('')
  const [budget, setBudget] = useState('')
  const [city, setCity] = useState('')
  const [microlocation, setMicrolocation] = useState('')
  const [address, setAddress] = useState('')
  const [tenure, setTenure] = useState('')
  const [note, setNote] = useState('')

  const [draftNote, setDraftNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteText, setEditNoteText] = useState('')

  const detailQ = useQuery({
    queryKey: ['enquiry', 'detail', leadId],
    queryFn: () => getEnquiryById(leadId!),
    enabled: isEdit,
  })

  const loaded = detailQ.data?.data as EnquiryLead | undefined

  useEffect(() => {
    if (!loaded) return
    const oi = (loaded.other_info as Record<string, string> | undefined) ?? {}
    setSpaceType(String(loaded.space_type ?? 'Web Coworking'))
    setLeadSource(String(loaded.leadSource ?? ''))
    setName(oi.name ?? '')
    setEmail(oi.email ?? '')
    setPhone(oi.phone_number ?? '')
    setCompanyName(String(loaded.companyName ?? ''))
    setInterestedIn(String(loaded.interested_in ?? ''))
    setNoOfSeats(String(loaded.no_of_seats ?? ''))
    setBudget(String(loaded.budget ?? ''))
    setCity(String(loaded.city ?? ''))
    setMicrolocation(String(loaded.microlocation ?? ''))
    setAddress(String(loaded.address ?? ''))
    setTenure(String(loaded.tenure ?? ''))
    setNote(String(loaded.note ?? ''))
  }, [loaded])

  const saveMut = useMutation({
    mutationFn: async () => {
      const phone = normalizePhone(phone_number)
      const body: Record<string, unknown> = {
        space_type,
        leadSource: leadSource || undefined,
        name,
        email,
        phone_number: phone,
        companyName: companyName || undefined,
        interested_in: interested_in || undefined,
        no_of_seats: space_type === 'Web Coworking' ? no_of_seats || undefined : undefined,
        budget: space_type === 'Web Coliving' ? budget || undefined : undefined,
        city: city || undefined,
        microlocation: microlocation || undefined,
        address: address || undefined,
        tenure: tenure || undefined,
        note: note || undefined,
      }
      if (isEdit) {
        return updateManualLead({ ...body, id: leadId })
      }
      return createManualLead(body)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Lead updated' : 'Lead created')
      qc.invalidateQueries({ queryKey: ['enquiries'] })
      if (!isEdit) navigate('/layout/enquiry')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const notes = useMemo(() => {
    const raw = (loaded?.notes as NoteRow[] | undefined) ?? []
    return raw.slice().sort((a, b) => {
      const ta = new Date(a.added_on ?? 0).getTime()
      const tb = new Date(b.added_on ?? 0).getTime()
      return tb - ta
    })
  }, [loaded?.notes])

  const addNoteMut = useMutation({
    mutationFn: () =>
      addNoteToLead({
        id: leadApiId(loaded),
        noteContent: draftNote.trim(),
        user: actorId,
      }),
    onSuccess: () => {
      toast.success('Note added')
      setDraftNote('')
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadId] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed'),
  })

  const delNoteMut = useMutation({
    mutationFn: (noteId: string) =>
      deleteNoteInLead({ leadId: mongoId(loaded), noteId }),
    onSuccess: () => {
      toast.success('Note removed')
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadId] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const stageMut = useMutation({
    mutationFn: (lead_stage: string) => updateLeadFields({ lead_stage, id: leadId! }),
    onSuccess: () => {
      toast.success('Stage saved')
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadId] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed'),
  })

  const updNoteMut = useMutation({
    mutationFn: (payload: { noteId: string; updatedContent: string }) =>
      updateNoteInLead({
        leadId: mongoId(loaded),
        noteId: payload.noteId,
        updatedContent: payload.updatedContent.trim(),
        user: actorId || undefined,
      }),
    onSuccess: () => {
      toast.success('Note updated')
      setEditingNoteId(null)
      qc.invalidateQueries({ queryKey: ['enquiry', 'detail', leadId] })
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  const invalid = !name.trim() || !email.trim() || !phone_number.trim()

  return (
    <PageShell
      title={isEdit ? 'Update lead' : 'Create lead'}
      description="Manual enquiry entry aligned with legacy admin lead fields."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/layout/enquiry')}>
            Back to list
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="space-y-4 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70">
          {isEdit && detailQ.isLoading ? (
            <p className="text-sm text-slate-500">Loading lead…</p>
          ) : null}
          {isEdit && detailQ.isError ? (
            <p className="text-sm text-red-600">Could not load this lead.</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Space type</label>
              <select className={fieldClass} value={space_type} onChange={(e) => setSpaceType(e.target.value)}>
                {FORM_SPACE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Lead source</label>
              <select className={fieldClass} value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
                <option value="">—</option>
                {LEAD_SOURCE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Name *</label>
              <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone *</label>
              <input className={fieldClass} type="tel" value={phone_number} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Company name</label>
              <input className={fieldClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Interested in</label>
              <input className={fieldClass} value={interested_in} onChange={(e) => setInterestedIn(e.target.value)} />
            </div>
            {space_type === 'Web Coworking' ? (
              <div>
                <label className={labelClass}>Number of seats</label>
                <select className={fieldClass} value={no_of_seats} onChange={(e) => setNoOfSeats(e.target.value)}>
                  <option value="">—</option>
                  {FORM_SEAT_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {space_type === 'Web Coliving' ? (
              <div>
                <label className={labelClass}>Budget</label>
                <select className={fieldClass} value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option value="">—</option>
                  {FORM_BUDGET_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City</label>
              <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Micro location</label>
              <input
                className={fieldClass}
                value={microlocation}
                onChange={(e) => setMicrolocation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <textarea className={cn(fieldClass, 'min-h-[88px] resize-y')} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Tenure</label>
            <input className={fieldClass} value={tenure} onChange={(e) => setTenure(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Note</label>
            <textarea className={cn(fieldClass, 'min-h-[88px] resize-y')} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/layout/enquiry')}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={invalid || saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? 'Saving…' : isEdit ? 'Update lead' : 'Create lead'}
            </Button>
          </div>
        </section>

        {isEdit && loaded ? (
          <section className="space-y-4 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Lead stage</h3>
              <select
                className={cn(fieldClass, 'max-w-xs')}
                value={String(loaded.lead_stage ?? '')}
                disabled={stageMut.isPending}
                onChange={(e) => stageMut.mutate(e.target.value)}
              >
                {LEAD_STAGES.filter((s) => s.value !== 'all').map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Stage changes use the same update endpoint as the enquiry list drawer.
            </p>
          </section>
        ) : null}

        {isEdit && loaded ? (
          <section className="space-y-4 rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70">
            <h3 className="text-lg font-semibold text-slate-900">
              Notes <span className="text-slate-500">({notes.length})</span>
            </h3>
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
              <textarea
                className={cn(fieldClass, 'min-h-[88px] bg-white')}
                placeholder="Add a follow-up note…"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraftNote('')}>
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!draftNote.trim() || !actorId || addNoteMut.isPending}
                  onClick={() => addNoteMut.mutate()}
                >
                  Add note
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {notes.map((n) => {
                const nid = String(n._id ?? '')
                const isEd = editingNoteId === nid
                return (
                  <li key={nid} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800">{noteAuthor(n)}</p>
                        <p className="text-xs text-slate-500">{fmtWhen(String(n.updated_on ?? n.added_on ?? ''))}</p>
                      </div>
                      <div className="flex gap-1">
                        {isEd ? (
                          <>
                            <button
                              type="button"
                              className="text-xs text-violet-700"
                              onClick={() => {
                                if (editNoteText.trim()) updNoteMut.mutate({ noteId: nid, updatedContent: editNoteText })
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="text-xs text-slate-500"
                              onClick={() => {
                                setEditingNoteId(null)
                                setEditNoteText('')
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
                                setEditingNoteId(nid)
                                setEditNoteText(n.note ?? '')
                              }}
                            >
                              Edit
                            </button>
                            <button type="button" className="text-xs text-red-600" onClick={() => delNoteMut.mutate(nid)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEd ? (
                      <textarea
                        className={cn(fieldClass, 'mt-2 bg-slate-50')}
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                      />
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-slate-700">{n.note ?? ''}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </PageShell>
  )
}
