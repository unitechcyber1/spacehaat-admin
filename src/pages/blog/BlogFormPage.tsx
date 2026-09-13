import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { RichTextEditor } from '../../components/RichTextEditor/RichTextEditor'
import { env } from '../../lib/env'
import { getBlogById, saveBlog, updateBlogSlug } from '../../services/blog/blog.service'
import { BLOG_SEO_STATUSES, BLOG_TYPES, type BlogDetail, type BlogFile, type BlogRecord } from '../../services/blog/types'
import type { SeoRecord, SeoSocial, SeoSocialImage } from '../../services/seo/types'
import { uploadAdminFile } from '../../services/upload/upload.service'

function emptySocial(): SeoSocial {
  return { title: '', description: '', image: undefined }
}

function emptyDetail(): BlogDetail {
  return { news_image: undefined, should_show_on_home: false, url: '' }
}

function emptySeo(): SeoRecord {
  return {
    title: '',
    description: '',
    robots: 'index, follow',
    keywords: '',
    url: '',
    status: true,
    twitter: emptySocial(),
    open_graph: emptySocial(),
  }
}

function emptyBlog(): BlogRecord {
  return {
    heading: '',
    description: '',
    slug: '',
    blog_type: '',
    cover_picture: undefined,
    seo: emptySeo(),
    detail: emptyDetail(),
  }
}

function socialImageId(img: SeoSocialImage | undefined): string | undefined {
  if (img == null) return undefined
  if (typeof img === 'string') return img
  return img.id != null ? String(img.id) : undefined
}

function filePreview(img: SeoSocialImage | BlogFile | undefined): string {
  if (!img) return ''
  if (typeof img === 'string') return img
  return img.s3_link ?? ''
}

function cleanHtmlContent(content: string): string {
  return content.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Match Angular `_setSeoForServer`: twitter/OG images sent as file id only. */
function normalizeBlogForSave(blog: BlogRecord): BlogRecord {
  const id = blog.id ?? blog._id
  const twId = socialImageId(blog.seo?.twitter?.image)
  const ogId = socialImageId(blog.seo?.open_graph?.image)
  const payload: BlogRecord = {
    ...blog,
    description: cleanHtmlContent(blog.description ?? ''),
    seo: {
      ...blog.seo,
      twitter: blog.seo?.twitter
        ? {
            title: blog.seo.twitter.title,
            description: blog.seo.twitter.description,
            ...(twId !== undefined ? { image: twId } : {}),
          }
        : undefined,
      open_graph: blog.seo?.open_graph
        ? {
            title: blog.seo.open_graph.title,
            description: blog.seo.open_graph.description,
            ...(ogId !== undefined ? { image: ogId } : {}),
          }
        : undefined,
    },
  }
  if (id) payload.id = String(id)
  return payload
}

function blogPreviewUrl(slug: string): string | null {
  const base = (env.websitePath || '').replace(/\/+$/, '')
  if (!base || !slug) return null
  return `${base}/blog/${slug}`
}

const fieldClass =
  'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/90 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

const fileInputClass =
  'mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-on-brand hover:file:bg-violet-700'

export function BlogFormPage() {
  const { blogId } = useParams<{ blogId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(blogId)

  const existingQ = useQuery({
    queryKey: ['blog', 'one', blogId],
    queryFn: () => getBlogById(blogId!),
    enabled: isEdit,
  })

  const [blog, setBlog] = useState<BlogRecord>(emptyBlog)

  useEffect(() => {
    if (!isEdit) setBlog(emptyBlog())
  }, [isEdit])

  useEffect(() => {
    if (!isEdit) return
    if (existingQ.isSuccess && !existingQ.data) {
      toast.error('Blog not found')
      navigate('/layout/blog', { replace: true })
    }
  }, [isEdit, existingQ.isSuccess, existingQ.data, navigate])

  useEffect(() => {
    if (!isEdit) return
    const row = existingQ.data
    if (!row) return
    setBlog({
      ...emptyBlog(),
      ...row,
      seo: {
        ...emptySeo(),
        ...row.seo,
        twitter: { ...emptySocial(), ...row.seo?.twitter },
        open_graph: { ...emptySocial(), ...row.seo?.open_graph },
      },
      detail: { ...emptyDetail(), ...row.detail },
    })
  }, [isEdit, existingQ.data])

  const saveMut = useMutation({
    mutationFn: (payload: BlogRecord) => saveBlog(normalizeBlogForSave(payload)),
    onSuccess: (res) => {
      toast.success('Blog saved successfully')
      qc.invalidateQueries({ queryKey: ['blogs'] })
      const saved = res.data
      const id = String(saved?.id ?? saved?._id ?? blog.id ?? blog._id ?? '')
      if (id && !isEdit) {
        navigate(`/layout/blog/detail/${id}`, { replace: true })
        return
      }
      if (saved) {
        setBlog((prev) => ({
          ...prev,
          ...saved,
          seo: {
            ...emptySeo(),
            ...prev.seo,
            ...saved.seo,
            twitter: { ...emptySocial(), ...prev.seo?.twitter, ...saved.seo?.twitter },
            open_graph: { ...emptySocial(), ...prev.seo?.open_graph, ...saved.seo?.open_graph },
          },
          detail: { ...emptyDetail(), ...prev.detail, ...saved.detail },
        }))
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const slugMut = useMutation({
    mutationFn: () =>
      updateBlogSlug({
        id: String(blog.id ?? blog._id ?? ''),
        slug: String(blog.slug ?? ''),
      }),
    onSuccess: () => toast.success('Slug updated successfully'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Slug update failed'),
  })

  function patchBlog(partial: Partial<BlogRecord>) {
    setBlog((prev) => ({ ...prev, ...partial }))
  }

  function patchSeo(partial: Partial<SeoRecord>) {
    setBlog((prev) => ({ ...prev, seo: { ...emptySeo(), ...prev.seo, ...partial } }))
  }

  function patchTwitter(partial: Partial<SeoSocial>) {
    setBlog((prev) => ({
      ...prev,
      seo: {
        ...emptySeo(),
        ...prev.seo,
        twitter: { ...emptySocial(), ...prev.seo?.twitter, ...partial },
      },
    }))
  }

  function patchOg(partial: Partial<SeoSocial>) {
    setBlog((prev) => ({
      ...prev,
      seo: {
        ...emptySeo(),
        ...prev.seo,
        open_graph: { ...emptySocial(), ...prev.seo?.open_graph, ...partial },
      },
    }))
  }

  function patchDetail(partial: Partial<BlogDetail>) {
    setBlog((prev) => ({ ...prev, detail: { ...emptyDetail(), ...prev.detail, ...partial } }))
  }

  async function onUpload(file: File, kind: 'twitter' | 'open_graph' | 'cover_picture' | 'news_image') {
    try {
      const up = (await uploadAdminFile(file)) as { id?: string; s3_link?: string }
      if (!up?.id) {
        toast.error('Upload missing file id.')
        return
      }
      const image: BlogFile = { id: String(up.id), s3_link: up.s3_link }
      if (kind === 'twitter') patchTwitter({ image })
      else if (kind === 'open_graph') patchOg({ image })
      else if (kind === 'cover_picture') patchBlog({ cover_picture: image })
      else patchDetail({ news_image: image })
      toast.success('Image uploaded')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Upload failed')
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!blog.heading?.trim()) {
      toast.error('Heading is required.')
      return
    }
    if (!blog.blog_type) {
      toast.error('Blog type is required.')
      return
    }
    saveMut.mutate(blog)
  }

  function onPreview() {
    const id = blog.id ?? blog._id
    if (!id) {
      toast.error('Please save before preview')
      return
    }
    const url = blogPreviewUrl(blog.slug ?? '')
    if (!url) {
      toast.error('Set VITE_WEBSITE_URL and a slug to preview.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const title = isEdit ? 'Edit blog' : 'Add blog'
  const showLoading = isEdit && existingQ.isLoading
  const showError = isEdit && existingQ.isError
  const showForm = !isEdit || existingQ.isSuccess
  const savedId = blog.id ?? blog._id

  return (
    <PageShell
      title={title}
      description="Heading, content, slug, SEO, social, type, news, and cover — aligned with the Angular blog detail form."
      actions={
        <Button type="button" variant="secondary" onClick={() => navigate('/layout/blog')}>
          Back to list
        </Button>
      }
    >
      {showLoading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : showError ? (
        <p className="text-sm text-rose-600">Could not load blog.</p>
      ) : showForm ? (
        <form onSubmit={onSubmit} className="max-w-6xl space-y-8">
          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Content</h3>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="blog-heading">
                Heading <span className="text-rose-600">*</span>
              </label>
              <Input
                id="blog-heading"
                value={blog.heading ?? ''}
                onChange={(e) => patchBlog({ heading: e.target.value })}
                className="mt-1 rounded-xl"
                placeholder="Heading"
                required
              />
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
              <RichTextEditor
                className="mt-1"
                mode="full"
                value={blog.description ?? ''}
                onChange={(html) => patchBlog({ description: html })}
                placeholder="Write the blog post…"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Slug update</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="blog-slug">
                  Slug
                </label>
                <Input
                  id="blog-slug"
                  value={blog.slug ?? ''}
                  onChange={(e) => patchBlog({ slug: e.target.value })}
                  className="mt-1 rounded-xl"
                  placeholder="Slug"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!savedId || slugMut.isPending}
                onClick={() => slugMut.mutate()}
              >
                {slugMut.isPending ? 'Updating…' : 'Update slug'}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">SEO details</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.title ?? ''}
                  onChange={(e) => patchSeo({ title: e.target.value })}
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.description ?? ''}
                  onChange={(e) => patchSeo({ description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Robots</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.robots ?? ''}
                  onChange={(e) => patchSeo({ robots: e.target.value })}
                  placeholder="Robots"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keywords</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.keywords ?? ''}
                  onChange={(e) => patchSeo({ keywords: e.target.value })}
                  placeholder="Keywords"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">URL</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.url ?? ''}
                  onChange={(e) => patchSeo({ url: e.target.value })}
                  placeholder="URL"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="blog-seo-status">
                  Status
                </label>
                <select
                  id="blog-seo-status"
                  className={fieldClass}
                  value={blog.seo?.status === false ? 'false' : 'true'}
                  onChange={(e) => patchSeo({ status: e.target.value === 'true' })}
                >
                  {BLOG_SEO_STATUSES.map((s) => (
                    <option key={String(s.value)} value={String(s.value)}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Twitter</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twitter title</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.twitter?.title ?? ''}
                  onChange={(e) => patchTwitter({ title: e.target.value })}
                  placeholder="Twitter title"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twitter description</label>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={blog.seo?.twitter?.description ?? ''}
                  onChange={(e) => patchTwitter({ description: e.target.value })}
                  placeholder="Twitter description"
                />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Twitter image</span>
              <input
                type="file"
                accept="image/*"
                className={fileInputClass}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onUpload(f, 'twitter')
                  e.target.value = ''
                }}
              />
              {filePreview(blog.seo?.twitter?.image) ? (
                <img
                  src={filePreview(blog.seo?.twitter?.image)}
                  alt=""
                  className="mt-2 h-14 w-auto max-w-[100px] rounded border border-slate-200 object-contain"
                />
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Open Graph</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph title</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.seo?.open_graph?.title ?? ''}
                  onChange={(e) => patchOg({ title: e.target.value })}
                  placeholder="Open Graph title"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph description</label>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={blog.seo?.open_graph?.description ?? ''}
                  onChange={(e) => patchOg({ description: e.target.value })}
                  placeholder="Open Graph description"
                />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Graph image</span>
              <input
                type="file"
                accept="image/*"
                className={fileInputClass}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onUpload(f, 'open_graph')
                  e.target.value = ''
                }}
              />
              {filePreview(blog.seo?.open_graph?.image) ? (
                <img
                  src={filePreview(blog.seo?.open_graph?.image)}
                  alt=""
                  className="mt-2 h-14 w-auto max-w-[100px] rounded border border-slate-200 object-contain"
                />
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Select blog type</h3>
            <div className="max-w-sm">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="blog-type">
                Blog type <span className="text-rose-600">*</span>
              </label>
              <select
                id="blog-type"
                className={fieldClass}
                value={blog.blog_type ?? ''}
                onChange={(e) => patchBlog({ blog_type: e.target.value })}
                required
              >
                <option value="">Select a blog type</option>
                {BLOG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">News section</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={Boolean(blog.detail?.should_show_on_home)}
                  onChange={(e) => patchDetail({ should_show_on_home: e.target.checked })}
                />
                Should show on home?
              </label>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Image URL</label>
                <Input
                  className="mt-1 rounded-xl"
                  value={blog.detail?.url ?? ''}
                  onChange={(e) => patchDetail({ url: e.target.value })}
                  placeholder="Image URL"
                />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">News image</span>
                <input
                  type="file"
                  accept="image/*"
                  className={fileInputClass}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void onUpload(f, 'news_image')
                    e.target.value = ''
                  }}
                />
                {filePreview(blog.detail?.news_image) ? (
                  <img
                    src={filePreview(blog.detail?.news_image)}
                    alt=""
                    className="mt-2 h-14 w-auto max-w-[100px] rounded border border-slate-200 object-contain"
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-surface p-5 shadow-sm ring-1 ring-slate-200/50">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Cover picture</h3>
            <input
              type="file"
              accept="image/*"
              className={fileInputClass}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onUpload(f, 'cover_picture')
                e.target.value = ''
              }}
            />
            {filePreview(blog.cover_picture) ? (
              <img
                src={filePreview(blog.cover_picture)}
                alt=""
                className="mt-2 h-14 w-auto max-w-[100px] rounded border border-slate-200 object-contain"
              />
            ) : null}
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" onClick={onPreview}>
              Preview
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/layout/blog')}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </PageShell>
  )
}
