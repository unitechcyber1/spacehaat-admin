import { useParams } from 'react-router-dom'

export function PlaceholderPage({ title }: { title: string }) {
  const params = useParams()
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            This route is scaffolded in React. Replace this page with the migrated
            implementation.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          placeholder
        </span>
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Route params
        </div>
        <pre className="mt-2 overflow-auto rounded bg-slate-950 p-4 text-xs text-slate-50">
          {JSON.stringify(params, null, 2)}
        </pre>
      </div>
    </div>
  )
}

