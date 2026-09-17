import { cn } from '../lib/ui'

export function ListPageMeta({
  loading,
  loadingLabel = 'Loading…',
  total,
  noun = 'record',
  error,
  className,
}: {
  loading?: boolean
  loadingLabel?: string
  total: number
  noun?: string
  error?: string | null
  className?: string
}) {
  const plural = total === 1 ? noun : `${noun}s`

  return (
    <div className={cn('list-meta', className)}>
      {loading ? (
        <span className="list-meta-loading">
          <span className="list-meta-dot" aria-hidden />
          {loadingLabel}
        </span>
      ) : (
        <>
          <span className="list-meta-count tnum">{total}</span>
          <span className="list-meta-label">{plural}</span>
        </>
      )}
      {error ? <span className="list-meta-error">{error}</span> : null}
    </div>
  )
}
