import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  PrinterIcon,
  ReceiptRefundIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Field, Input, Textarea } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { PageShell } from '../../components/PageShell'
import { Table, Td, Th, Tr } from '../../components/Table'
import {
  cancelInvoice,
  getInvoice,
  getInvoiceSendPrefill,
  issueInvoice,
  markPaid,
  sendInvoice,
} from '../../services/billing/billing.service'
import {
  downloadPdf,
  generatePdf,
  getInvoicePreview,
  openPrintTab,
} from '../../services/billing/invoiceDocument.service'
import type { InvoiceType } from '../../types/billing'
import { BillingBadge } from './BillingBadge'
import {
  canEditInvoice,
  formatEmailRecipientList,
  formatEmailSentAt,
  formatInr,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  invoiceTypeBadgeClass,
  invoiceTypeLabel,
  isDraft,
  sortEmailDeliveriesNewestFirst,
  spaceTypeChipClass,
  splitEmailTokens,
  validateInvoiceSendEmails,
} from './billingHelpers'

type EmailField = 'to' | 'cc' | 'bcc'

export function InvoicePreviewPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [amountPaid, setAmountPaid] = useState('')

  const pageQ = useQuery({
    queryKey: ['billing', 'invoice-preview', invoiceId],
    queryFn: async () => {
      const [invoice, preview] = await Promise.all([
        getInvoice(invoiceId!),
        getInvoicePreview(invoiceId!),
      ])
      return { invoice, preview }
    },
    enabled: Boolean(invoiceId),
  })

  const invoice = pageQ.data?.invoice
  const preview = pageQ.data?.preview

  useEffect(() => {
    if (!preview?.html) return
    const blob = new Blob([preview.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview?.html])

  const issueMut = useMutation({
    mutationFn: (type: InvoiceType) => issueInvoice(invoiceId!, { invoice_type: type }),
    onSuccess: () => {
      toast.success('Invoice issued')
      qc.invalidateQueries({ queryKey: ['billing', 'invoice-preview', invoiceId] })
      qc.invalidateQueries({ queryKey: ['billing', 'invoices'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to issue invoice')
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelInvoice(invoiceId!),
    onSuccess: () => {
      toast.success('Invoice cancelled')
      setCancelOpen(false)
      qc.invalidateQueries({ queryKey: ['billing', 'invoice-preview', invoiceId] })
      qc.invalidateQueries({ queryKey: ['billing', 'invoices'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to cancel invoice')
    },
  })

  const markPaidMut = useMutation({
    mutationFn: () =>
      markPaid(invoiceId!, {
        amount_paid: amountPaid ? Number(amountPaid) : undefined,
      }),
    onSuccess: () => {
      toast.success('Marked as paid')
      setMarkPaidOpen(false)
      qc.invalidateQueries({ queryKey: ['billing', 'invoice-preview', invoiceId] })
      qc.invalidateQueries({ queryKey: ['billing', 'invoices'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to mark paid')
    },
  })

  const [printing, setPrinting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const handlePrint = async () => {
    if (!preview) return
    setPrinting(true)
    try {
      await openPrintTab(invoiceId!, preview.print_html)
    } catch {
      toast.error('Could not open print page — try again')
    } finally {
      setPrinting(false)
    }
  }

  const handleDownload = async () => {
    if (!preview) return
    if (!preview.pdf_url) {
      await handleGenerate(true)
      return
    }
    setDownloading(true)
    try {
      await downloadPdf(invoiceId!, preview.filename, preview.pdf_url)
    } catch {
      toast.error('Could not load PDF — try again')
    } finally {
      setDownloading(false)
    }
  }

  const handleGenerate = async (andDownload = false) => {
    setRegenerating(!andDownload)
    try {
      const result = await generatePdf(invoiceId!)
      toast.success('PDF ready')
      qc.invalidateQueries({ queryKey: ['billing', 'invoice-preview', invoiceId] })
      if (andDownload && result?.pdf_url) {
        setDownloading(true)
        await downloadPdf(invoiceId!, result.filename, result.pdf_url)
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to generate PDF')
    } finally {
      setRegenerating(false)
      setDownloading(false)
    }
  }

  const canSendEmail = invoice?.status === 'issued' || invoice?.status === 'sent'
  const canMarkPaid =
    invoice?.status === 'issued' || invoice?.status === 'sent' || invoice?.status === 'overdue'
  const canCancel =
    invoice?.status === 'draft' ||
    invoice?.status === 'issued' ||
    invoice?.status === 'sent' ||
    invoice?.status === 'overdue'
  const emailDeliveries = sortEmailDeliveriesNewestFirst(invoice?.email_deliveries)

  if (pageQ.isLoading) {
    return (
      <PageShell title="Invoice preview" description="Loading…">
        <div className="list-empty py-16">Loading invoice preview…</div>
      </PageShell>
    )
  }

  if (pageQ.isError || !invoice || !preview) {
    return (
      <PageShell title="Invoice preview">
        <div className="list-empty py-16">Failed to load invoice preview.</div>
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title={invoice.invoice_number ?? 'Draft invoice'}
        description={`${invoiceTypeLabel(invoice.invoice_type)} · ${invoiceStatusLabel(invoice.status)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/layout/billing/invoices')}>
              <ArrowLeftIcon className="mr-1.5 h-4 w-4" aria-hidden />
              Back
            </Button>
            {canEditInvoice(invoice) ? (
              <Button variant="secondary" onClick={() => navigate(`/layout/billing/invoices/${invoiceId}/edit`)}>
                <PencilSquareIcon className="mr-1.5 h-4 w-4" aria-hidden />
                Edit
              </Button>
            ) : null}
            {isDraft(invoice) ? (
              <Button
                variant="primary"
                disabled={issueMut.isPending || (invoice.total ?? 0) <= 0}
                onClick={() => issueMut.mutate(invoice.invoice_type ?? 'client')}
              >
                Issue invoice
              </Button>
            ) : null}
            {canSendEmail ? (
              <Button variant="primary" onClick={() => setSendOpen(true)}>
                <EnvelopeIcon className="mr-1.5 h-4 w-4" aria-hidden />
                Send email
              </Button>
            ) : null}
            {canMarkPaid ? (
              <Button variant="success" onClick={() => {
                setAmountPaid(String(invoice.balance_due ?? invoice.total ?? ''))
                setMarkPaidOpen(true)
              }}>
                <BanknotesIcon className="mr-1.5 h-4 w-4" aria-hidden />
                Mark paid
              </Button>
            ) : null}
            {canCancel ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                <XCircleIcon className="mr-1.5 h-4 w-4" aria-hidden />
                Cancel
              </Button>
            ) : null}
            <Button variant="secondary" disabled={printing} onClick={() => void handlePrint()}>
              <PrinterIcon className="mr-1.5 h-4 w-4" aria-hidden />
              {printing ? 'Opening…' : 'Print'}
            </Button>
            <Button variant="secondary" disabled={downloading} onClick={() => void handleDownload()}>
              <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" aria-hidden />
              {downloading ? 'Downloading…' : 'Download PDF'}
            </Button>
            <Button variant="ghost" disabled={regenerating} onClick={() => void handleGenerate(false)}>
              <ArrowPathIcon className="mr-1.5 h-4 w-4" aria-hidden />
              {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <BillingBadge className={invoiceTypeBadgeClass(invoice.invoice_type)}>
            {invoiceTypeLabel(invoice.invoice_type)}
          </BillingBadge>
          <BillingBadge className={invoiceStatusBadgeClass(invoice.status)}>
            {invoiceStatusLabel(invoice.status)}
          </BillingBadge>
          {invoice.space_type ? (
            <BillingBadge className={spaceTypeChipClass(invoice.space_type)}>
              {invoice.space_type}
            </BillingBadge>
          ) : null}
          <span className="ml-auto text-xl font-bold tnum">{formatInr(invoice.total)}</span>
        </div>

        {!preview.pdf_url ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <ReceiptRefundIcon className="h-5 w-5 shrink-0" aria-hidden />
            <span>PDF is being prepared. You can generate it now or use Print / Download.</span>
            <Button variant="secondary" size="sm" disabled={regenerating} onClick={() => void handleGenerate(false)}>
              Generate PDF
            </Button>
          </div>
        ) : null}

        {emailDeliveries.length > 0 ? (
          <div className="form-section mb-4">
            <header className="form-section-head">
              <h2 className="form-section-title">Email delivery history</h2>
              {invoice.email_sent_at ? (
                <p className="form-section-desc">Last sent {formatEmailSentAt(invoice.email_sent_at)}</p>
              ) : null}
            </header>
            <Table>
              <thead className="bg-surface-2">
                <tr>
                  <Th>Sent at</Th>
                  <Th>Status</Th>
                  <Th>To</Th>
                  <Th>Cc</Th>
                  <Th>Subject</Th>
                  <Th>PDF</Th>
                </tr>
              </thead>
              <tbody>
                {emailDeliveries.map((row, i) => (
                  <Tr key={row._id ?? i}>
                    <Td>{formatEmailSentAt(row.sent_at)}</Td>
                    <Td>{row.status ?? 'sent'}</Td>
                    <Td className="max-w-[12rem] truncate">{formatEmailRecipientList(row.to)}</Td>
                    <Td className="max-w-[10rem] truncate">{formatEmailRecipientList(row.cc)}</Td>
                    <Td className="max-w-[14rem] truncate">{row.subject ?? '—'}</Td>
                    <Td>{row.attach_pdf ? 'Yes' : 'No'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {previewUrl ? (
            <iframe
              title="Invoice preview"
              src={previewUrl}
              className="h-[min(80vh,900px)] w-full border-0"
              sandbox="allow-same-origin allow-popups"
            />
          ) : (
            <div className="list-empty py-16">No preview available</div>
          )}
        </div>
      </PageShell>

      <SendEmailModal
        open={sendOpen}
        invoiceId={invoiceId!}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          setSendOpen(false)
          qc.invalidateQueries({ queryKey: ['billing', 'invoice-preview', invoiceId] })
        }}
      />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel invoice?"
        description="This will cancel the invoice. This action may not be reversible."
        confirmText={cancelMut.isPending ? 'Cancelling…' : 'Cancel invoice'}
        danger
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => cancelMut.mutate()}
      />

      <Modal
        open={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        title="Mark invoice as paid"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarkPaidOpen(false)}>Close</Button>
            <Button variant="success" disabled={markPaidMut.isPending} onClick={() => markPaidMut.mutate()}>
              {markPaidMut.isPending ? 'Saving…' : 'Confirm paid'}
            </Button>
          </>
        }
      >
        <Field label="Amount paid (₹)">
          <Input
            type="number"
            min={0}
            step="any"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  )
}

function SendEmailModal({
  open,
  invoiceId,
  onClose,
  onSent,
}: {
  open: boolean
  invoiceId: string
  onClose: () => void
  onSent: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [toEmails, setToEmails] = useState<string[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [bccEmails, setBccEmails] = useState<string[]>([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [bccInput, setBccInput] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachPdf, setAttachPdf] = useState(true)
  const [includePaymentLink, setIncludePaymentLink] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void getInvoiceSendPrefill(invoiceId)
      .then((data) => {
        const s = data.suggested
        setToEmails([...(s.to ?? [])])
        setCcEmails([...(s.cc ?? [])])
        setBccEmails([...(s.bcc ?? [])])
        setReplyTo(s.reply_to ?? '')
        setSubject(s.subject ?? '')
        setMessage(s.message ?? '')
        setAttachPdf(s.attach_pdf !== false)
        setIncludePaymentLink(s.include_payment_link !== false)
      })
      .catch(() => toast.error('Failed to load send form'))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const commitEmailInput = (field: EmailField) => {
    const map = { to: [toInput, setToInput, setToEmails], cc: [ccInput, setCcInput, setCcEmails], bcc: [bccInput, setBccInput, setBccEmails] } as const
    const [raw, setRaw, setList] = map[field]
    const tokens = splitEmailTokens(raw)
    if (!tokens.length) return
    setList((prev) => [...prev, ...tokens])
    setRaw('')
  }

  const handleSend = async () => {
    const err = validateInvoiceSendEmails({
      to: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      reply_to: replyTo,
      pendingTo: toInput,
      pendingCc: ccInput,
      pendingBcc: bccInput,
    })
    if (err) {
      toast.error(err)
      return
    }
    setSending(true)
    try {
      await sendInvoice(invoiceId, {
        to: toEmails,
        cc: ccEmails.length ? ccEmails : undefined,
        bcc: bccEmails.length ? bccEmails : undefined,
        reply_to: replyTo || undefined,
        subject,
        message,
        attach_pdf: attachPdf,
        include_payment_link: includePaymentLink,
      })
      toast.success('Invoice sent')
      onSent()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  const EmailChipList = ({
    emails,
    onRemove,
  }: {
    emails: string[]
    onRemove: (email: string) => void
  }) => (
    <div className="mb-2 flex flex-wrap gap-1">
      {emails.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800 ring-1 ring-violet-200"
        >
          {email}
          <button type="button" className="hover:text-violet-950" onClick={() => onRemove(email)} aria-label={`Remove ${email}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send invoice email"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={loading || sending} onClick={() => void handleSend()}>
            {sending ? 'Sending…' : 'Send email'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="py-8 text-center text-muted">Loading…</div>
      ) : (
        <div className="space-y-4">
          <Field label="To">
            <EmailChipList emails={toEmails} onRemove={(e) => setToEmails((xs) => xs.filter((x) => x !== e))} />
            <Input
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  commitEmailInput('to')
                }
              }}
              onBlur={() => commitEmailInput('to')}
              placeholder="Add recipient and press Enter"
            />
          </Field>
          <Field label="Cc">
            <EmailChipList emails={ccEmails} onRemove={(e) => setCcEmails((xs) => xs.filter((x) => x !== e))} />
            <Input
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  commitEmailInput('cc')
                }
              }}
              onBlur={() => commitEmailInput('cc')}
            />
          </Field>
          <Field label="Bcc">
            <EmailChipList emails={bccEmails} onRemove={(e) => setBccEmails((xs) => xs.filter((x) => x !== e))} />
            <Input
              value={bccInput}
              onChange={(e) => setBccInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  commitEmailInput('bcc')
                }
              }}
              onBlur={() => commitEmailInput('bcc')}
            />
          </Field>
          <Field label="Reply-to">
            <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
          </Field>
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Message">
            <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} />
              Attach PDF
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includePaymentLink} onChange={(e) => setIncludePaymentLink(e.target.checked)} />
              Include payment link
            </label>
          </div>
        </div>
      )}
    </Modal>
  )
}
