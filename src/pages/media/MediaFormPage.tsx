import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { getMediaByIdScan, saveMedia } from '../../services/media/media.service'
import type { MediaItem } from '../../services/media/types'
import { uploadAdminFile } from '../../services/upload/upload.service'

function mediaRowId(m: MediaItem): string {
  return String(m.id ?? m._id ?? '')
}

export function MediaFormPage() {
  const { brandAdsId } = useParams<{ brandAdsId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(brandAdsId)

  const existingQ = useQuery({
    queryKey: ['media', 'one', brandAdsId],
    queryFn: async () => {
      const row = await getMediaByIdScan(brandAdsId!)
      if (!row) throw new Error('Not found')
      return row
    },
    enabled: isEdit,
    staleTime: 0,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  /** Uploaded / existing file id — sent as `image` (string) on save, not as an object. */
  const [imageId, setImageId] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    const row = existingQ.data
    if (!row) return
    setName(row.name ?? '')
    setDescription(row.description ?? '')
    const img = row.image
    if (img && typeof img === 'object' && img.id) {
      setImageId(String(img.id))
      setPreviewUrl(img.s3_link ?? '')
    } else if (typeof img === 'string' && img) {
      setImageId(img)
      setPreviewUrl('')
    } else {
      setImageId('')
      setPreviewUrl('')
    }
  }, [existingQ.data])

  const saveMut = useMutation({
    mutationFn: (payload: MediaItem) => saveMedia(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Media updated' : 'Media created')
      qc.invalidateQueries({ queryKey: ['medias'] })
      navigate('/layout/media')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  async function onPickFile(f: File) {
    const up = await uploadAdminFile(f) as { id?: string; s3_link?: string }
    const id = up?.id != null ? String(up.id) : ''
    if (!id) {
      toast.error('Upload response missing file id.')
      return
    }
    setImageId(id)
    setPreviewUrl(up.s3_link ?? '')
    toast.success('Image uploaded')
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required.')
      return
    }
    let saveImageId = imageId.trim()
    if (!saveImageId && isEdit && existingQ.data) {
      const img = existingQ.data.image
      if (img && typeof img === 'object' && img.id) saveImageId = String(img.id)
      else if (typeof img === 'string') saveImageId = img
    }
    if (!saveImageId) {
      toast.error('Please upload an image.')
      return
    }

    const base: MediaItem = {
      name: name.trim(),
      description: description.trim(),
      image: saveImageId,
    }
    if (isEdit && existingQ.data) {
      const id = mediaRowId(existingQ.data)
      if (!id) {
        toast.error('Missing media id.')
        return
      }
      base.id = id
    }
    saveMut.mutate(base)
  }

  const title = isEdit ? 'Edit media' : 'Add media'
  const showLoading = isEdit && existingQ.isLoading
  const showError = isEdit && existingQ.isError
  const showForm = !isEdit || existingQ.isSuccess

  return (
    <PageShell
      title={title}
      description="Name, description, and image upload — same flow as the legacy Angular dialog."
      actions={
        <Button type="button" variant="secondary" onClick={() => navigate('/layout/media')}>
          Back to list
        </Button>
      }
    >
      {showLoading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : showError ? (
        <p className="text-sm text-rose-600">
          {(existingQ.error as Error)?.message === 'Not found'
            ? 'Media not found.'
            : 'Could not load this media. Try again from the list.'}
        </p>
      ) : showForm ? (
        <form onSubmit={onSubmit} className="max-w-xl space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="media-name">
              Name
            </label>
            <Input id="media-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-xl" required />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              htmlFor="media-description"
            >
              Description
            </label>
            <Input
              id="media-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="rounded-xl"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Image</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-700"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onPickFile(f)
              }}
            />
            {previewUrl ? (
              <div className="mt-3">
                <img src={previewUrl} alt="" className="h-24 w-auto max-w-full rounded-lg border border-slate-200 object-contain" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={saveMut.isPending}>
              {isEdit ? 'Save' : 'Add'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/layout/media')}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </PageShell>
  )
}
