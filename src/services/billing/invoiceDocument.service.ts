import { apiClient, type ObjectResponse } from '../apiClient'
import type { GeneratePdfResult, Invoice, InvoicePreviewPayload } from '../../types/billing'
import { getBillingProfile } from './billing.service'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function injectAccountNameIntoHtml(html: string | undefined | null, accountName: string | undefined): string {
  const clean = (accountName ?? '').trim()
  if (!html || !clean) return html ?? ''
  const normalized = escapeHtml(clean)
  if (/Account Name\s*[:：]/i.test(html) || /account name\s*[:：]/i.test(html)) {
    return html
  }

  const block = `
    <div style="margin-top: 10px; font-size: 12px; line-height: 1.6; color: #374151;">
      <strong>Account Name:</strong> ${normalized}
    </div>
  `

  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${block}\n</body>`)
    : `${html}${block}`
}

export async function getInvoicePreview(invoiceId: string) {
  const [previewRes, profile] = await Promise.all([
    apiClient.get<ObjectResponse<InvoicePreviewPayload>>(`admin/invoices/${invoiceId}/preview`),
    getBillingProfile().catch(() => null),
  ])

  const payload = previewRes.data.data
  if (!payload) return payload
  const accountName = profile?.bank_details?.account_name
  payload.html = injectAccountNameIntoHtml(payload.html, accountName)
  if (payload.print_html) {
    payload.print_html = injectAccountNameIntoHtml(payload.print_html, accountName)
  }
  return payload
}

export async function getPrintHtml(invoiceId: string) {
  const [html, profile] = await Promise.all([
    apiClient.get<string>(`admin/invoices/${invoiceId}/html`, {
      params: { format: 'html', print: '1' },
      responseType: 'text',
    }),
    getBillingProfile().catch(() => null),
  ])
  return injectAccountNameIntoHtml(html.data, profile?.bank_details?.account_name)
}

export async function generatePdf(invoiceId: string) {
  const res = await apiClient.post<ObjectResponse<GeneratePdfResult>>(
    `admin/invoices/${invoiceId}/generate-pdf`,
    { store: true },
  )
  return res.data.data
}

export async function openPrintTab(invoiceId: string, printHtml?: string): Promise<void> {
  const html = printHtml ?? (await getPrintHtml(invoiceId))
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * The PDF always comes through the API: it makes the file again when the saved copy is from an older layout
 * (the SpaceHaat logo) or when no copy was saved, so a stale or missing S3 link never blocks viewing/downloading.
 * `pdfUrl` is accepted for older callers and ignored.
 */
export async function viewPdf(invoiceId: string, _pdfUrl?: string | null): Promise<void> {
  // Open the tab first (inside the click) so pop-up blockers allow it, then fill it once the PDF arrives.
  const tab = window.open('', '_blank')
  try {
    const { blob } = await fetchPdf(invoiceId)
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    tab?.close()
    throw e
  }
}

export async function downloadPdf(
  invoiceId: string,
  filenameHint?: string,
  _pdfUrl?: string | null,
): Promise<string> {
  const { blob, filename } = await fetchPdf(invoiceId, { download: true })
  const name = (filenameHint || filename || defaultFilename(invoiceId)).replace(/\//g, '-')
  triggerDownload(blob, name)
  return name
}

export async function regenerateAndDownload(invoiceId: string): Promise<GeneratePdfResult> {
  const data = await generatePdf(invoiceId)
  await downloadPdf(invoiceId, data?.filename)
  return data
}

export async function pollPdfUrl(
  invoiceId: string,
  attempts = 4,
  intervalMs = 1500,
): Promise<Invoice | null> {
  for (let i = 0; i < attempts; i += 1) {
    await new Promise((r) => setTimeout(r, intervalMs))
    const res = await apiClient.get<ObjectResponse<Invoice>>(`admin/invoices/${invoiceId}`)
    if (res.data.data?.pdf_url) return res.data.data
  }
  return null
}

async function fetchPdf(
  invoiceId: string,
  { download = false, regenerate = false }: { download?: boolean; regenerate?: boolean } = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const params: Record<string, string> = {}
  if (download) params.download = '1'
  if (regenerate) params.regenerate = '1'
  const res = await apiClient.get<Blob>(`admin/invoices/${invoiceId}/pdf`, {
    params,
    responseType: 'blob',
    timeout: 120_000,
  })
  const blob = res.data
  if (!blob || !blob.size) throw new Error('Empty PDF response')
  if (blob.type && !blob.type.includes('pdf')) throw new Error('Server did not return a PDF')
  const cd = res.headers['content-disposition'] as string | undefined
  return { blob, filename: parseContentDisposition(cd) }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking straight away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function parseContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header)
  return match?.[1]?.trim().replace(/"/g, '') ?? null
}

function defaultFilename(invoiceId: string): string {
  return `SpaceWallah-Invoice-${invoiceId}.pdf`
}
