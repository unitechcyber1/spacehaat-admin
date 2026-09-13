/** Pagination helpers ported from the CRM (`web/src/utils/pagination.js`). */

export const PAGE_SIZE_OPTIONS = [10, 20, 40, 60]

export const DEFAULT_PAGE_SIZE = 20

/** Page buttons with ellipses: always first, last, and a window around the current page. */
export function buildPageItems(currentPage: number, pageCount: number): (number | '…')[] {
  const pages: (number | '…')[] = []
  for (let i = 1; i <= pageCount; i += 1) {
    if (i === 1 || i === pageCount || Math.abs(i - currentPage) <= 1) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return pages
}

export function pageRange(currentPage: number, pageSize: number, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(currentPage, 1), pageCount)
  return {
    currentPage: safePage,
    pageCount,
    rangeStart: total ? (safePage - 1) * pageSize + 1 : 0,
    rangeEnd: Math.min(safePage * pageSize, total),
  }
}
