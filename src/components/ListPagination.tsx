import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { buildPageItems, PAGE_SIZE_OPTIONS } from '../lib/pagination'
import { cn } from '../lib/ui'

/** Numbered pagination with a per-page selector, ported from the CRM. */
export function ListPagination({
  currentPage,
  pageCount,
  total,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  loading = false,
  className,
}: {
  currentPage: number
  pageCount: number
  total: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  loading?: boolean
  className?: string
}) {
  if (!total) return null

  const rangeStart = (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, total)
  const pageItems = buildPageItems(currentPage, pageCount)

  return (
    <div className={cn('inv-pagination', className)}>
      <div className="pg-left">
        <span className="pg-info">
          Showing <b className="tnum">{rangeStart}</b>–<b className="tnum">{rangeEnd}</b> of{' '}
          <b className="tnum">{total}</b>
        </span>
        <label className="pg-size">
          <span>Per page</span>
          <select
            className="inp"
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Items per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pageCount > 1 ? (
        <div className="pg-controls">
          <button
            type="button"
            className="pg-btn"
            disabled={currentPage === 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </button>
          {pageItems.map((it, i) =>
            it === '…' ? (
              <span key={`gap-${i}`} className="pg-gap">
                …
              </span>
            ) : (
              <button
                type="button"
                key={it}
                className={cn('pg-num', it === currentPage && 'on')}
                onClick={() => onPageChange(it)}
                disabled={loading}
                aria-current={it === currentPage ? 'page' : undefined}
              >
                {it}
              </button>
            ),
          )}
          <button
            type="button"
            className="pg-btn"
            disabled={currentPage === pageCount || loading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </button>
        </div>
      ) : null}
    </div>
  )
}
