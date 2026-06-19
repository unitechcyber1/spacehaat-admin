import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { PageShell } from '../../components/PageShell'

export function BlogListPage() {
  const navigate = useNavigate()
  return (
    <PageShell
      title="Blog"
      description="Manage blog posts with the content studio editor."
      actions={
        <Button variant="primary" onClick={() => navigate('/layout/blog/add')}>
          Add post
        </Button>
      }
    >
      <p className="text-sm text-slate-600">
        Blog list API integration is pending. Use <strong>Add post</strong> to open the content studio editor.
      </p>
    </PageShell>
  )
}
