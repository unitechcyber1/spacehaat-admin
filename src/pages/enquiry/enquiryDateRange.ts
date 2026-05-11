/** Date range helpers aligned with Angular `EnquiryComponent.applyDateFilter`. */

export type DateRange = { startDate: string; endDate: string }

function iso(d: Date) {
  return d.toISOString()
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1)
}

function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function startOfYesterday(ref: Date) {
  const y = new Date(ref)
  y.setDate(ref.getDate() - 1)
  return startOfDay(y)
}

function endOfYesterday(ref: Date) {
  const y = new Date(ref)
  y.setDate(ref.getDate() - 1)
  return endOfDay(y)
}

function startOfWeekMonday(ref: Date) {
  const dayOfWeek = ref.getDay()
  const diff = ref.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const start = new Date(ref)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

/** “Now” row matching Angular `getStartOfDay` for month/year presets (includes current time). */
function nowAsEnd(ref: Date) {
  return new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate(),
    ref.getHours(),
    ref.getMinutes(),
    ref.getSeconds(),
    ref.getMilliseconds(),
  )
}

export function defaultThisMonthRange(ref = new Date()): DateRange {
  return {
    startDate: iso(startOfMonth(ref)),
    endDate: iso(nowAsEnd(ref)),
  }
}

export function applyDatePreset(preset: string, ref = new Date()): DateRange | null {
  switch (preset) {
    case 'today':
      return { startDate: iso(startOfDay(ref)), endDate: iso(endOfDay(ref)) }
    case 'yesterday':
      return { startDate: iso(startOfYesterday(ref)), endDate: iso(endOfYesterday(ref)) }
    case 'thisWeek':
      return { startDate: iso(startOfWeekMonday(ref)), endDate: iso(endOfDay(ref)) }
    case 'lastWeek': {
      const thisMon = startOfWeekMonday(ref)
      const lastSun = new Date(thisMon)
      lastSun.setDate(thisMon.getDate() - 1)
      const lastMon = new Date(lastSun)
      lastMon.setDate(lastSun.getDate() - 6)
      return { startDate: iso(startOfDay(lastMon)), endDate: iso(endOfDay(lastSun)) }
    }
    case 'thisMonth':
      return defaultThisMonthRange(ref)
    case 'lastMonth': {
      const start = new Date(startOfMonth(ref))
      start.setMonth(start.getMonth() - 1)
      const end = new Date(endOfMonth(ref))
      end.setMonth(end.getMonth() - 1)
      return { startDate: iso(start), endDate: iso(end) }
    }
    case 'thisYear':
      return { startDate: iso(startOfYear(ref)), endDate: iso(nowAsEnd(ref)) }
    case 'lastYear': {
      const start = new Date(startOfYear(ref))
      start.setFullYear(start.getFullYear() - 1)
      const end = new Date(endOfYear(ref))
      end.setFullYear(end.getFullYear() - 1)
      return { startDate: iso(start), endDate: iso(end) }
    }
    case 'all':
      return { startDate: '', endDate: '' }
    case 'custom':
    default:
      return null
  }
}
