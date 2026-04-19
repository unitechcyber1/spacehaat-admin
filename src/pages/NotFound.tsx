import { Link, useLocation } from 'react-router-dom'

export function NotFound() {
  const location = useLocation()
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-600">
        No route matches <span className="font-mono">{location.pathname}</span>
      </p>
      <div className="mt-4">
        <Link
          to="/layout/space-from-listing"
          className="inline-flex items-center rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

