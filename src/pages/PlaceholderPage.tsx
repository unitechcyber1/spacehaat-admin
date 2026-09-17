import { useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function PlaceholderPage({ title }: { title: string }) {
  const params = useParams()
  return (
    <PageShell title={title} description="This section is scaffolded and awaiting full migration.">
      <div className="card pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              Replace this page with the migrated implementation when the feature is ready.
            </p>
          </div>
          <span className="chip stale">Placeholder</span>
        </div>
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-faint">Route params</div>
          <pre className="mt-2 overflow-auto rounded-lg bg-surface-2 p-4 text-xs text-ink ring-1 ring-line">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>
      </div>
    </PageShell>
  )
}
