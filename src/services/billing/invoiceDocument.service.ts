import { apiClient, type ObjectResponse } from '../apiClient'
import type { GeneratePdfResult, Invoice, InvoicePreviewPayload } from '../../types/billing'

export async function getInvoicePreview(invoiceId: string) {
  const res = await apiClient.get<ObjectResponse<InvoicePreviewPayload>>(
    `admin/invoices/${invoiceId}/preview`,
  )
  return res.data.data
}

export async function getPrintHtml(invoiceId: string) {
  const res = await apiClient.get<string>(`admin/invoices/${invoiceId}/html`, {
    params: { format: 'html', print: '1' },
    responseType: 'text',
  })
  return res.data
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

export async function viewPdf(invoiceId: string, pdfUrl?: string | null): Promise<void> {
  if (pdfUrl) {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    return
  }
  const blob = await fetchPdfBlob(invoiceId)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadPdf(
  invoiceId: string,
  filenameHint?: string,
  pdfUrl?: string | null,
): Promise<string> {
  if (pdfUrl) {
    try {
      const res = await fetch(pdfUrl)
      if (!res.ok) throw new Error('S3 fetch failed')
      const blob = await res.blob()
      const name = filenameHint ?? defaultFilename(invoiceId)
      triggerDownload(blob, name)
      return name
    } catch {
      // fall through to API
    }
  }

  const res = await apiClient.get<Blob>(`admin/invoices/${invoiceId}/pdf`, {
    params: { download: '1' },
    responseType: 'blob',
  })
  const blob = res.data
  if (!blob) throw new Error('Empty PDF response')
  const cd = res.headers['content-disposition'] as string | undefined
  const name = filenameHint ?? parseContentDisposition(cd) ?? defaultFilename(invoiceId)
  triggerDownload(blob, name)
  return name
}

export async function regenerateAndDownload(invoiceId: string): Promise<GeneratePdfResult> {
  const data = await generatePdf(invoiceId)
  if (data?.pdf_url) {
    await downloadPdf(invoiceId, data.filename, data.pdf_url)
  }
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

async function fetchPdfBlob(invoiceId: string, regenerate = false): Promise<Blob> {
  const params: Record<string, string> = {}
  if (regenerate) params.regenerate = '1'
  const res = await apiClient.get<Blob>(`admin/invoices/${invoiceId}/pdf`, {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  if (!blob) throw new Error('Empty PDF response')
  return blob
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header)
  return match?.[1]?.trim().replace(/"/g, '') ?? null
}

function defaultFilename(invoiceId: string): string {
  return `SpaceHaat-Invoice-${invoiceId}.pdf`
}
