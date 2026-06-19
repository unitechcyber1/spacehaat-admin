import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { RichTextEditor } from '../../components/RichTextEditor/RichTextEditor'

export function BlogFormPage() {
  const { blogId } = useParams<{ blogId: string }>()
  const navigate = useNavigate()
  const isNew = !blogId

  const [heading, setHeading] = useState('')
  const [content, setContent] = useState('')

  function onPublish() {
    toast.success(isNew ? 'Blog draft ready (wire save API when backend is connected)' : 'Blog updated')
    // TODO: connect admin/blog API when available
  }

  return (
    <PageShell
      title={isNew ? 'Add blog post' : 'Edit blog post'}
      description="Create and edit blog content."
      actions={
        <Button type="button" variant="secondary" onClick={() => navigate('/layout/blog')}>
          Back to list
        </Button>
      }
    >
      <form
        className="max-w-6xl space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          onPublish()
        }}
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Heading</label>
          <Input
            className="mt-1 rounded-xl"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="Post heading"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content</label>
          <RichTextEditor
            className="mt-1"
            mode="full"
            value={content}
            onChange={setContent}
            placeholder="Write your post…"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/blog')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
