import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { RichTextEditor } from '../../components/RichTextEditor/RichTextEditor'
import { getSeoById, saveSeo } from '../../services/seo/seo.service'
import type { SeoFaq, SeoRecord, SeoReview, SeoSocial, SeoSocialImage } from '../../services/seo/types'
import { uploadAdminFile } from '../../services/upload/upload.service'

function emptySocial(): SeoSocial {
  return { title: '', description: '', image: undefined }
}

function emptyReview(): SeoReview {
  return { name: '', review: '', rating: null, company_name: '', designation: '' }
}

function emptySeo(): SeoRecord {
  return {
    page_title: '',
    path: '',
    title: '',
    description: '',
    keywords: '',
    robots: 'index, follow',
    script: '',
    footer_title: '',
    footer_description: '',
    twitter: emptySocial(),
    open_graph: emptySocial(),
    faqs: [],
    reviews: [],
  }
}

function socialImageId(img: SeoSocialImage | undefined): string | undefined {
  if (img == null) return undefined
  if (typeof img === 'string') return img
  return img.id != null ? String(img.id) : undefined
}

/** Match Angular `saveSeo`: `twitter.image` / `open_graph.image` sent as file id only. */
function normalizeSeoForSave(seo: SeoRecord): SeoRecord {
  const id = seo.id ?? seo._id
  const twId = socialImageId(seo.twitter?.image)
  const ogId = socialImageId(seo.open_graph?.image)
  const base: SeoRecord = {
    ...seo,
    twitter: seo.twitter
      ? {
          title: seo.twitter.title,
          description: seo.twitter.description,
          ...(twId !== undefined ? { image: twId } : {}),
        }
      : undefined,
    open_graph: seo.open_graph
      ? {
          title: seo.open_graph.title,
          description: seo.open_graph.description,
          ...(ogId !== undefined ? { image: ogId } : {}),
        }
      : undefined,
  }
  if (id) base.id = String(id)
  return base
}

export function SeoFormPage() {
  const { seoId } = useParams<{ seoId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(seoId)

  const existingQ = useQuery({
    queryKey: ['seo', 'one', seoId],
    queryFn: () => getSeoById(seoId!),
    enabled: isEdit,
  })

  const [seo, setSeo] = useState<SeoRecord>(emptySeo)
  const [indexFlag, setIndexFlag] = useState(true)

  /** Only when switching to “add” — do not depend on `existingQ.data` or TanStack will re-run and wipe the form. */
  useEffect(() => {
    if (!isEdit) {
      setSeo(emptySeo())
      setIndexFlag(true)
    }
  }, [isEdit])

  /** Load row when editing (including when `seoId` or API data changes). */
  useEffect(() => {
    if (!isEdit) return
    const row = existingQ.data
    if (!row) return
    const r = row as Record<string, unknown>
    /** API may use snake_case or camelCase (Mongo / JSON). */
    const footerRaw = r.footer_description ?? r.footerDescription
    const footer_description =
      typeof footerRaw === 'string' ? footerRaw : (row.footer_description ?? '')

    setSeo({
      ...emptySeo(),
      ...row,
      footer_description,
      twitter: { ...emptySocial(), ...row.twitter },
      open_graph: { ...emptySocial(), ...row.open_graph },
      faqs: Array.isArray(row.faqs) ? row.faqs : [],
      reviews: Array.isArray(row.reviews) ? row.reviews : [],
    })
    setIndexFlag(row.robots === 'index, follow')
  }, [isEdit, existingQ.data])

  const saveMut = useMutation({
    mutationFn: (payload: SeoRecord) => saveSeo(normalizeSeoForSave(payload)),
    onSuccess: () => {
      toast.success(isEdit ? 'SEO updated' : 'SEO created')
      qc.invalidateQueries({ queryKey: ['seo-list'] })
      navigate('/layout/seo')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  function patchSeo(partial: Partial<SeoRecord>) {
    setSeo((prev) => ({ ...prev, ...partial }))
  }

  function patchTwitter(partial: Partial<SeoSocial>) {
    setSeo((prev) => ({ ...prev, twitter: { ...emptySocial(), ...prev.twitter, ...partial } }))
  }

  function patchOg(partial: Partial<SeoSocial>) {
    setSeo((prev) => ({ ...prev, open_graph: { ...emptySocial(), ...prev.open_graph, ...partial } }))
  }

  function addFaq() {
    setSeo((prev) => ({ ...prev, faqs: [...(prev.faqs ?? []), { question: '', answer: '' }] }))
  }

  function removeFaq(index: number) {
    setSeo((prev) => ({ ...prev, faqs: (prev.faqs ?? []).filter((_, i) => i !== index) }))
  }

  function patchFaq(index: number, partial: Partial<SeoFaq>) {
    setSeo((prev) => ({
      ...prev,
      faqs: (prev.faqs ?? []).map((faq, i) => (i === index ? { ...faq, ...partial } : faq)),
    }))
  }

  function addReview() {
    setSeo((prev) => ({ ...prev, reviews: [...(prev.reviews ?? []), emptyReview()] }))
  }

  function removeReview(index: number) {
    setSeo((prev) => ({ ...prev, reviews: (prev.reviews ?? []).filter((_, i) => i !== index) }))
  }

  function patchReview(index: number, partial: Partial<SeoReview>) {
    setSeo((prev) => ({
      ...prev,
      reviews: (prev.reviews ?? []).map((r, i) => (i === index ? { ...r, ...partial } : r)),
    }))
  }

  async function onUploadTwitter(f: File) {
    const up = await uploadAdminFile(f) as { id?: string; s3_link?: string }
    if (!up?.id) {
      toast.error('Upload missing file id.')
      return
    }
    patchTwitter({ image: { id: String(up.id), s3_link: up.s3_link } })
    toast.success('Twitter image uploaded')
  }

  async function onUploadOg(f: File) {
    const up = await uploadAdminFile(f) as { id?: string; s3_link?: string }
    if (!up?.id) {
      toast.error('Upload missing file id.')
      return
    }
    patchOg({ image: { id: String(up.id), s3_link: up.s3_link } })
    toast.success('Open Graph image uploaded')
  }

  function twitterPreview(): string {
    const img = seo.twitter?.image
    if (!img) return ''
    return typeof img === 'object' ? img.s3_link ?? '' : ''
  }

  function ogPreview(): string {
    const img = seo.open_graph?.image
    if (!img) return ''
    return typeof img === 'object' ? img.s3_link ?? '' : ''
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!seo.path?.trim()) {
      toast.error('Path is required.')
      return
    }
    if (!seo.title?.trim()) {
      toast.error('Meta title is required.')
      return
    }
    if (!seo.description?.trim()) {
      toast.error('Meta description is required.')
      return
    }
    const payload: SeoRecord = {
      ...seo,
      robots: indexFlag ? 'index, follow' : 'noindex, nofollow',
    }
    saveMut.mutate(payload)
  }

  const title = isEdit ? 'Edit SEO' : 'Add SEO'
  const showLoading = isEdit && existingQ.isLoading
  const showError = isEdit && existingQ.isError
  const showForm = !isEdit || existingQ.isSuccess

  const fieldClass = 'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/90 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

  return (
    <PageShell
      title={title}
      description="Page details, meta, Twitter / Open Graph, scripts, FAQs, reviews, and footer — aligned with the Angular SEO detail form."
      actions={
        <Button type="button" variant="secondary" onClick={() => navigate('/layout/seo')}>
          Back to list
        </Button>
      }
    >
      {showLoading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : showError ? (
        <p className="text-sm text-rose-600">Could not load SEO entry.</p>
      ) : showForm ? (
        <form onSubmit={onSubmit} className="max-w-6xl space-y-8">
          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Page details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-page-title">
                  Page heading
                </label>
                <Input
                  id="seo-page-title"
                  value={seo.page_title ?? ''}
                  onChange={(e) => patchSeo({ page_title: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="Page heading"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-path">
                  Path <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="seo-path"
                  value={seo.path ?? ''}
                  onChange={(e) => patchSeo({ path: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="Path"
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">SEO details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-meta-title">
                  Meta title <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="seo-meta-title"
                  value={seo.title ?? ''}
                  onChange={(e) => patchSeo({ title: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="Meta title"
                  required
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={indexFlag}
                    onChange={(e) => {
                      setIndexFlag(e.target.checked)
                    }}
                  />
                  For indexing
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-desc">
                Meta description <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="seo-desc"
                value={seo.description ?? ''}
                onChange={(e) => patchSeo({ description: e.target.value })}
                className={fieldClass}
                rows={4}
                placeholder="Meta description"
                required
              />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-keywords">
                Keywords
              </label>
              <Input
                id="seo-keywords"
                value={seo.keywords ?? ''}
                onChange={(e) => patchSeo({ keywords: e.target.value })}
                className="mt-1 rounded-xl"
                placeholder="Keywords"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Twitter</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twitter title</label>
                <Input
                  value={seo.twitter?.title ?? ''}
                  onChange={(e) => patchTwitter({ title: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="Twitter title"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twitter description</label>
                <textarea
                  value={seo.twitter?.description ?? ''}
                  onChange={(e) => patchTwitter({ description: e.target.value })}
                  className={fieldClass}
                  rows={3}
                  placeholder="Twitter description"
                />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twitter image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-on-brand hover:file:bg-violet-700"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onUploadTwitter(f)
                  }}
                />
                {twitterPreview() ? (
                  <img src={twitterPreview()} alt="" className="mt-2 h-14 w-auto max-w-[100px] rounded border border-slate-200 object-contain" />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Open Graph</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph title</label>
                <Input
                  value={seo.open_graph?.title ?? ''}
                  onChange={(e) => patchOg({ title: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="Open Graph title"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph description</label>
                <textarea
                  value={seo.open_graph?.description ?? ''}
                  onChange={(e) => patchOg({ description: e.target.value })}
                  className={fieldClass}
                  rows={3}
                  placeholder="Open Graph description"
                />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-on-brand hover:file:bg-violet-700"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onUploadOg(f)
                  }}
                />
                {ogPreview() ? (
                  <img src={ogPreview()} alt="" className="mt-2 h-14 w-auto max-w-[100px] rounded border border-slate-200 object-contain" />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Script</h3>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-script">
              Script (without script tags)
            </label>
            <textarea
              id="seo-script"
              value={seo.script ?? ''}
              onChange={(e) => patchSeo({ script: e.target.value })}
              className={fieldClass}
              rows={12}
              placeholder="Script paste here"
            />
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">FAQs</h3>
              <Button type="button" variant="secondary" onClick={addFaq}>
                Add FAQ
              </Button>
            </div>
            {(seo.faqs ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No FAQs added yet.</p>
            ) : (
              <div className="space-y-4">
                {(seo.faqs ?? []).map((faq, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 ring-1 ring-slate-200/40"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">FAQ {i + 1}</span>
                      <Button type="button" variant="secondary" onClick={() => removeFaq(i)}>
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Question
                        </label>
                        <Input
                          value={faq.question}
                          onChange={(e) => patchFaq(i, { question: e.target.value })}
                          className="mt-1 rounded-xl"
                          placeholder="Question"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Answer
                        </label>
                        <textarea
                          value={faq.answer}
                          onChange={(e) => patchFaq(i, { answer: e.target.value })}
                          className={fieldClass}
                          rows={2}
                          placeholder="Answer"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Reviews</h3>
              <Button type="button" variant="secondary" onClick={addReview}>
                Add review
              </Button>
            </div>
            {(seo.reviews ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No reviews added yet.</p>
            ) : (
              <div className="space-y-4">
                {(seo.reviews ?? []).map((r, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 ring-1 ring-slate-200/40"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">Review {i + 1}</span>
                      <Button type="button" variant="secondary" onClick={() => removeReview(i)}>
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                        <Input
                          value={r.name}
                          onChange={(e) => patchReview(i, { name: e.target.value })}
                          className="mt-1 rounded-xl"
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Company name
                        </label>
                        <Input
                          value={r.company_name}
                          onChange={(e) => patchReview(i, { company_name: e.target.value })}
                          className="mt-1 rounded-xl"
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Designation
                        </label>
                        <Input
                          value={r.designation}
                          onChange={(e) => patchReview(i, { designation: e.target.value })}
                          className="mt-1 rounded-xl"
                          placeholder="Designation"
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,8rem)_1fr]">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Rating (1–5)
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={r.rating ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            patchReview(i, { rating: v === '' ? null : Number(v) })
                          }}
                          className="mt-1 rounded-xl"
                          placeholder="1–5"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review</label>
                        <textarea
                          value={r.review}
                          onChange={(e) => patchReview(i, { review: e.target.value })}
                          className={fieldClass}
                          rows={2}
                          placeholder="Review"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Footer</h3>
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="seo-footer-title">
                Footer title
              </label>
              <Input
                id="seo-footer-title"
                value={seo.footer_title ?? ''}
                onChange={(e) => patchSeo({ footer_title: e.target.value })}
                className="mt-1 rounded-xl"
                placeholder="Footer title"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Footer description
              </div>
              <RichTextEditor
                mode="full"
                value={seo.footer_description ?? ''}
                onChange={(html) => patchSeo({ footer_description: html })}
                placeholder="Footer description…"
              />
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={saveMut.isPending}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/layout/seo')}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </PageShell>
  )
}
