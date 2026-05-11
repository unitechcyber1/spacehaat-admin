import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { PageShell } from '../components/PageShell'
import { logout } from '../services/auth/auth.service'
import { getUserAccessPaths } from '../services/auth/routeAccess'

export function NoAccessPage() {
  const navigate = useNavigate()
  const paths = getUserAccessPaths()

  return (
    <PageShell
      title="No access"
      description={
        paths.length === 0
          ? 'Your account has no menu permissions assigned. Ask an administrator to grant access in Spacehaat users → Access.'
          : 'You opened a URL that is not in your assigned menu. Use the sidebar or go to your default page.'
      }
    >
      <div className="rounded-2xl bg-amber-50/80 p-6 ring-1 ring-amber-200/80">
        {paths.length > 0 ? (
          <div className="text-sm text-slate-800">
            <p className="font-medium text-slate-900">Allowed paths</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700">
              {paths.map((p) => (
                <li key={p}>
                  <code className="text-xs">{p}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={() => navigate('/layout', { replace: true })}>
            Go to default page
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              logout()
              navigate('/auth/login', { replace: true })
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
