import { Fragment, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ListPagination } from '../../components/ListPagination'
import { PageShell } from '../../components/PageShell'
import { cn } from '../../lib/ui'
import { pageRange } from '../../lib/pagination'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import {
  canCreateManualLead,
  getStoredUserInner,
  isStoredUserAdmin,
} from '../../services/auth/auth.service'
import {
  deleteLead,
  deleteManyLeads,
  exportLeads,
  getEnquiries,
  getListingSalesUsers,
  type EnquiryLead,
  type GroupedEnquiryRow,
  removeLeadAccess,
  updateLeadAccess,
} from '../../services/enquiry/enquiry.service'
import {
  BUDGET_FILTER_OPTIONS,
  DATE_PRESETS,
  ENQUIRY_PAGE_SIZE_DEFAULT,
  INTERESTED_IN_FILTER,
  LEAD_STAGES,
  SEAT_FILTER_OPTIONS,
  SPACE_TYPE_FILTER,
} from './enquiryConstants'
import { applyDatePreset } from './enquiryDateRange'
import { EnquiryLeadDrawer } from './EnquiryLeadDrawer'

const STAGE_PILLS = LEAD_STAGES.filter((s) => s.value !== 'all')

/**
 * The CRM has one search box because its API accepts a single `search` param.
 * This API takes discrete `name` / `email` / `phone_number` fields, so the typed
 * query is routed to whichever field it looks like, and the choice is surfaced
 * to the user as a badge inside the field.
 */
type SearchMode = 'name' | 'email' | 'phone'

/** Raw shape from `admin/userList`; the whole record is echoed back as `marketingUser`. */
type SalesUserRecord = {
  _id?: string
  id?: string
  name?: string
  isMarketing?: boolean
  lead_source?: string
}

function classifySearch(raw: string): SearchMode {
  const q = raw.trim()
  if (!q) return 'name'
  if (q.includes('@')) return 'email'
  if (/^\d{4,}$/.test(q.replace(/[\s\-+()]/g, ''))) return 'phone'
  return 'name'
}

const SEARCH_MODE_LABEL: Record<SearchMode, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
}

function stripDisplayPhone(p: string | undefined) {
  if (!p) return ''
  return p.replace(/^\+91-/, '')
}

function waMeHref(phone: string | undefined) {
  const d = stripDisplayPhone(phone ?? '').replace(/\D/g, '')
  if (d.length === 10) return `https://wa.me/91${d}`
  if (d.length) return `https://wa.me/${d}`
  return undefined
}

function convertSpace(space: string | undefined) {
  if (!space) return '—'
  if (space === 'Web Coworking') return 'CW'
  if (space === 'Web Coliving') return 'CL'
  if (space === 'Web Office Space') return 'OS'
  if (space === 'Web Virtual Office') return 'VO'
  if (space === 'Web Others') return 'OT'
  return space
}

function fmtDate(iso: string | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function other(lead: EnquiryLead | undefined) {
  return (lead?.other_info as Record<string, string> | undefined) ?? {}
}

function leadRowId(lead: EnquiryLead) {
  return String(lead._id ?? lead.id ?? '')
}

function latestNotePreview(lead: EnquiryLead) {
  const notes = (lead.notes as { note?: string; user?: { name?: string } }[] | undefined) ?? []
  if (!notes.length) return { text: '', count: 0, author: '' }
  const last = notes[notes.length - 1]
  const raw = last?.note ?? ''
  const text = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw
  const author = last?.user && typeof last.user === 'object' ? String(last.user.name ?? '') : ''
  return { text, count: notes.length, author }
}

function apiErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'object' && e !== null) {
    const apiMessage = (e as { response?: { data?: { message?: unknown } } }).response?.data
      ?.message
    if (typeof apiMessage === 'string' && apiMessage) return apiMessage
    const message = (e as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

/** Reads the stored profile once at mount; `useState` initialiser keeps it out of render. */
function useScopeDefaults() {
  const [scope] = useState(() => {
    const inner = getStoredUserInner()
    if (!inner) {
      return { userJson: '', marketingJson: '', isAdmin: false }
    }
    if (inner.role === 'admin') {
      return { userJson: '', marketingJson: '', isAdmin: true }
    }
    if (inner.role === 'sales') {
      if (!inner.isMarketing && inner.enquiry) {
        return {
          userJson: JSON.stringify({ _id: inner._id, lead_source: inner.lead_source }),
          marketingJson: '',
          isAdmin: false,
        }
      }
      return { userJson: '', marketingJson: JSON.stringify(inner), isAdmin: false }
    }
    return { userJson: '', marketingJson: '', isAdmin: false }
  })
  return scope
}

export function EnquiryListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const scope = useScopeDefaults()
  const isAdmin = isStoredUserAdmin()
  const showAdd = canCreateManualLead()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ENQUIRY_PAGE_SIZE_DEFAULT)
  const [sortBy, setSortBy] = useState('')
  const [orderBy, setOrderBy] = useState('')

  const [searchIn, setSearchIn] = useState('')
  const [spaceType, setSpaceType] = useState('')
  const [leadStage, setLeadStage] = useState('all')
  const [interestedIn, setInterestedIn] = useState('all')
  const [seatBucket, setSeatBucket] = useState('all')
  const [budgetPick, setBudgetPick] = useState('all')
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [cityIn, setCityIn] = useState('')
  const [locationIn, setLocationIn] = useState('')
  const [addressIn, setAddressIn] = useState('')
  const [salesFilterUserId, setSalesFilterUserId] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const debSearch = useDebouncedValue(searchIn, 400)
  const debCity = useDebouncedValue(cityIn, 500)
  const debLoc = useDebouncedValue(locationIn, 500)
  const debAddr = useDebouncedValue(addressIn, 500)

  const liveSearchMode = classifySearch(searchIn)
  const searchMode = classifySearch(debSearch)

  const [adminUserJson, setAdminUserJson] = useState('')
  const [adminMarketingJson, setAdminMarketingJson] = useState('')

  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [grantUserIds, setGrantUserIds] = useState<string[]>([])

  const [confirmDelete, setConfirmDelete] = useState<EnquiryLead | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const usersQ = useQuery({
    queryKey: ['admin', 'userList', 'sales'],
    queryFn: () => getListingSalesUsers({ page: 1, limit: 100 }),
    staleTime: 60_000,
  })

  const salesUsers = useMemo(() => {
    const rows = (usersQ.data?.data ?? []) as SalesUserRecord[]
    return rows.map((u) => ({
      id: String(u.id ?? u._id ?? ''),
      name: String(u.name ?? ''),
      isMarketing: Boolean(u.isMarketing),
      lead_source: u.lead_source,
    }))
  }, [usersQ.data?.data])

  /** Date range is derived, so custom dates apply as soon as they are picked. */
  const { startDate, endDate } = useMemo(() => {
    if (datePreset === 'custom') {
      const s = customStart ? new Date(`${customStart}T00:00:00`) : null
      const e = customEnd ? new Date(`${customEnd}T23:59:59.999`) : null
      if (s && e && s > e) return { startDate: '', endDate: '' }
      return {
        startDate: s ? s.toISOString() : '',
        endDate: e ? e.toISOString() : '',
      }
    }
    return applyDatePreset(datePreset) ?? { startDate: '', endDate: '' }
  }, [datePreset, customStart, customEnd])

  const listParams = useMemo(() => {
    let space_type = ''
    let site_visit = ''
    if (spaceType === 'All' || spaceType === '') {
      space_type = ''
    } else if (spaceType === 'Site Visit') {
      site_visit = 'true'
    } else {
      space_type = spaceType.trim().toLowerCase()
    }

    const lead_stage = leadStage === 'all' ? '' : leadStage.trim().toLocaleLowerCase()
    const interested_in = interestedIn === 'all' ? '' : interestedIn.trim().toLocaleLowerCase()

    let noOfSeats = ''
    if (seatBucket && seatBucket !== 'all') {
      noOfSeats = encodeURIComponent(JSON.stringify([seatBucket]))
    }

    const budget = budgetPick === 'all' || !budgetPick ? [] : [budgetPick]

    const user = isAdmin ? adminUserJson || '' : scope.userJson
    const marketingUser = isAdmin ? adminMarketingJson || '' : scope.marketingJson

    const q = debSearch.trim()

    const p: Record<string, unknown> = {
      limit: pageSize,
      page,
      groupBy: 'user',
      sortBy,
      orderBy,
      name: searchMode === 'name' ? q.toLowerCase() : '',
      email: searchMode === 'email' ? q.toLowerCase() : '',
      phone_number: searchMode === 'phone' ? q : '',
      city: debCity.trim(),
      location: debLoc.trim(),
      address: debAddr.trim(),
      startDate,
      endDate,
      lead_stage,
      interested_in,
      space_type,
      site_visit,
      noOfSeats,
      budget,
      user,
      marketingUser,
      for_coworking: '',
      for_office: '',
      for_coliving: '',
      for_flat: '',
      for_buildings: '',
      roles: '',
    }
    return p
  }, [
    page,
    pageSize,
    sortBy,
    orderBy,
    spaceType,
    leadStage,
    interestedIn,
    seatBucket,
    budgetPick,
    startDate,
    endDate,
    debSearch,
    searchMode,
    debCity,
    debLoc,
    debAddr,
    isAdmin,
    adminUserJson,
    adminMarketingJson,
    scope.userJson,
    scope.marketingJson,
  ])

  /**
   * Reset to page 1 whenever the result set changes. Adjusting state during
   * render (rather than in an effect) avoids a wasted fetch on the stale page.
   */
  const filterKey = JSON.stringify({ ...listParams, page: 0 })
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    if (page !== 1) setPage(1)
  }

  const listQ = useQuery({
    queryKey: ['enquiries', listParams],
    queryFn: () => getEnquiries(listParams),
    staleTime: 5_000,
  })

  const rows = (listQ.data?.data ?? []) as GroupedEnquiryRow[]
  const total = listQ.data?.totalRecords ?? 0
  const { currentPage, pageCount, rangeStart, rangeEnd } = pageRange(page, pageSize, total)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success('Lead deleted')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Delete failed')),
  })

  const bulkDelMut = useMutation({
    mutationFn: () => deleteManyLeads({ leads: selectedIds }),
    onSuccess: () => {
      toast.success('Selected leads deleted')
      setConfirmBulkDelete(false)
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Bulk delete failed')),
  })

  const exportMut = useMutation({
    mutationFn: () => exportLeads({ ...listParams, limit: '' }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'enquiries-export.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export started')
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Export failed')),
  })

  const grantMut = useMutation({
    mutationFn: () => updateLeadAccess({ leads: selectedIds, users: grantUserIds }),
    onSuccess: () => {
      toast.success('Access updated')
      setGrantUserIds([])
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Grant failed')),
  })

  const removeMut = useMutation({
    mutationFn: () => removeLeadAccess({ leads: selectedIds, users: grantUserIds }),
    onSuccess: () => {
      toast.success('Access removed')
      setGrantUserIds([])
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Remove failed')),
  })

  const advancedActiveCount = [
    interestedIn !== 'all',
    seatBucket !== 'all',
    budgetPick !== 'all',
    Boolean(cityIn),
    Boolean(locationIn),
    Boolean(addressIn),
  ].filter(Boolean).length

  const hasActiveFilters =
    Boolean(searchIn) ||
    Boolean(spaceType) ||
    leadStage !== 'all' ||
    datePreset !== 'thisMonth' ||
    Boolean(salesFilterUserId) ||
    advancedActiveCount > 0

  function resetFilters() {
    setSearchIn('')
    setSpaceType('')
    setLeadStage('all')
    setInterestedIn('all')
    setSeatBucket('all')
    setBudgetPick('all')
    setDatePreset('thisMonth')
    setCustomStart('')
    setCustomEnd('')
    setCityIn('')
    setLocationIn('')
    setAddressIn('')
    setAdminUserJson('')
    setAdminMarketingJson('')
    setSalesFilterUserId('')
    setSortBy('')
    setOrderBy('')
    setShowAdvanced(false)
    setPage(1)
  }

  function toggleStage(value: string) {
    setLeadStage((prev) => (prev === value ? 'all' : value))
  }

  function toggleSort(col: string) {
    if (sortBy !== col) {
      setSortBy(col)
      setOrderBy('1')
    } else if (orderBy === '1') {
      setOrderBy('-1')
    } else {
      setSortBy('')
      setOrderBy('')
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === rows.length && rows.length > 0) {
      setSelectedIds([])
      return
    }
    setSelectedIds(rows.map((g) => leadRowId(g.latestLead)))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function onPickSalesUser(uid: string) {
    setSalesFilterUserId(uid)
    if (!uid) {
      setAdminUserJson('')
      setAdminMarketingJson('')
      return
    }
    const rawUsers = (usersQ.data?.data ?? []) as SalesUserRecord[]
    const full = rawUsers.find((x) => String(x.id ?? x._id) === uid)
    if (!full) {
      setAdminUserJson('')
      setAdminMarketingJson('')
      return
    }
    if (full.isMarketing) {
      setAdminUserJson('')
      setAdminMarketingJson(JSON.stringify(full))
    } else {
      setAdminMarketingJson('')
      setAdminUserJson(JSON.stringify({ _id: full._id ?? full.id, lead_source: full.lead_source }))
    }
  }

  const allSelected = rows.length > 0 && selectedIds.length === rows.length
  const colCount = isAdmin ? 14 : 13
  const dateLabel = DATE_PRESETS.find((d) => d.value === datePreset)?.label ?? 'This Month'

  return (
    <PageShell
      title="Enquiries"
      description="Grouped leads (by user), filters, drawer notes, and bulk actions for admins."
      actions={
        <>
          {showAdd ? (
            <Button variant="primary" onClick={() => navigate('/layout/enquiry/add')}>
              Add lead
            </Button>
          ) : null}
          {isAdmin ? (
            <Button disabled={exportMut.isPending} onClick={() => exportMut.mutate()}>
              <ArrowDownTrayIcon />
              Export CSV
            </Button>
          ) : null}
        </>
      }
    >
      {/* ---------- summary strip with stage pills ---------- */}
      <div className="card leads-summary">
        <div className="leads-stat">
          <b className="tnum">{listQ.isLoading ? '—' : total}</b>
          <span>{hasActiveFilters ? 'Matching leads' : 'Total leads'}</span>
        </div>
        <div className="leads-stat">
          <b className="!text-[15px]">{dateLabel}</b>
          <span>Date range</span>
        </div>
        <div className="leads-stage-pills">
          {STAGE_PILLS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={cn('lead-stage-pill', leadStage === s.value && 'on')}
              onClick={() => toggleStage(s.value)}
              aria-pressed={leadStage === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- search + filters ---------- */}
      <div className="card leads-filter-card">
        <div className="filter-card-head">
          <div className="min-w-0">
            <h2 className="filter-card-title">Filters</h2>
            <p className="filter-card-desc">
              Search by name, email, or phone; narrow by date, space type, stage, and more.
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={resetFilters}>
            <ArrowPathIcon />
            Reset filters
          </Button>
        </div>

        <div className="leads-search-wrap">
          <MagnifyingGlassIcon />
          <input
            type="search"
            className="leads-search-input"
            placeholder="Search by name, email, or phone…"
            value={searchIn}
            onChange={(e) => setSearchIn(e.target.value)}
            aria-label="Search enquiries"
          />
          <div className="leads-search-tools">
            {searchIn ? (
              <>
                <span className="leads-search-mode">{SEARCH_MODE_LABEL[liveSearchMode]}</span>
                <button
                  type="button"
                  className="leads-search-clear"
                  onClick={() => setSearchIn('')}
                  aria-label="Clear search"
                >
                  <XMarkIcon />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="leads-filter-row">
          <label className="leads-filter-field">
            <span>
              <CalendarDaysIcon /> Date
            </span>
            <select
              className="inp"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              {DATE_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          {datePreset === 'custom' ? (
            <>
              <label className="leads-filter-field">
                <span>From</span>
                <input
                  type="date"
                  className="inp"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </label>
              <label className="leads-filter-field">
                <span>To</span>
                <input
                  type="date"
                  className="inp"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </label>
            </>
          ) : null}

          <label className="leads-filter-field">
            <span>
              <Squares2X2Icon /> Space type
            </span>
            <select className="inp" value={spaceType} onChange={(e) => setSpaceType(e.target.value)}>
              <option value="">All</option>
              {SPACE_TYPE_FILTER.filter((s) => s.value !== 'All').map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {isAdmin ? (
            <label className="leads-filter-field">
              <span>
                <UserCircleIcon /> Sales user
              </span>
              <select
                className="inp"
                value={salesFilterUserId}
                onChange={(e) => onPickSalesUser(e.target.value)}
              >
                <option value="">All users</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="leads-filter-actions">
            <Button
              size="sm"
              variant={showAdvanced ? 'primary' : 'secondary'}
              onClick={() => setShowAdvanced((s) => !s)}
              aria-expanded={showAdvanced}
            >
              <AdjustmentsHorizontalIcon />
              More filters
              {advancedActiveCount ? ` (${advancedActiveCount})` : ''}
            </Button>
          </div>
        </div>

        {showAdvanced ? (
          <div className="leads-filter-row">
            <label className="leads-filter-field">
              <span>
                <FunnelIcon /> Interested in
              </span>
              <select
                className="inp"
                value={interestedIn}
                onChange={(e) => setInterestedIn(e.target.value)}
              >
                {INTERESTED_IN_FILTER.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="leads-filter-field">
              <span>Seats</span>
              <select
                className="inp"
                value={seatBucket}
                onChange={(e) => setSeatBucket(e.target.value)}
              >
                {SEAT_FILTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="leads-filter-field">
              <span>Budget</span>
              <select
                className="inp"
                value={budgetPick}
                onChange={(e) => setBudgetPick(e.target.value)}
              >
                {BUDGET_FILTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="leads-filter-field">
              <span>City</span>
              <input
                className="inp"
                value={cityIn}
                onChange={(e) => setCityIn(e.target.value)}
                placeholder="Any city"
              />
            </label>
            <label className="leads-filter-field">
              <span>Location</span>
              <input
                className="inp"
                value={locationIn}
                onChange={(e) => setLocationIn(e.target.value)}
                placeholder="Any micro-location"
              />
            </label>
            <label className="leads-filter-field">
              <span>Address</span>
              <input
                className="inp"
                value={addressIn}
                onChange={(e) => setAddressIn(e.target.value)}
                placeholder="Any address"
              />
            </label>
          </div>
        ) : null}

        {isAdmin && selectedIds.length > 0 ? (
          <div className="leads-bulkbar">
            <label className="leads-filter-field !max-w-[240px]">
              <span>Grant / remove access</span>
              <select
                multiple
                className="inp !h-auto min-h-[88px]"
                value={grantUserIds}
                onChange={(e) => setGrantUserIds([...e.target.selectedOptions].map((o) => o.value))}
              >
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              disabled={!grantUserIds.length || grantMut.isPending}
              onClick={() => grantMut.mutate()}
            >
              Grant access
            </Button>
            <Button
              size="sm"
              disabled={!grantUserIds.length || removeMut.isPending}
              onClick={() => removeMut.mutate()}
            >
              Remove access
            </Button>
            <Button size="sm" variant="danger" onClick={() => setConfirmBulkDelete(true)}>
              Delete selected ({selectedIds.length})
            </Button>
          </div>
        ) : null}
      </div>

      {/* ---------- results ---------- */}
      <div className="card leads-table-card">
        <div className="leads-table-meta">
          <span className="leads-result-count">
            {listQ.isLoading ? (
              'Loading…'
            ) : total ? (
              <>
                Showing <b className="tnum">{rangeStart}</b>–<b className="tnum">{rangeEnd}</b> of{' '}
                <b className="tnum">{total}</b>
              </>
            ) : (
              'No results'
            )}
          </span>
          {isAdmin && selectedIds.length ? (
            <span className="chip brand">{selectedIds.length} selected</span>
          ) : null}
        </div>

        <div className="leads-tbl-scroll">
          <table className="tbl leads-tbl">
            <thead>
              <tr>
                {isAdmin ? (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                ) : null}
                <th>
                  <button
                    type="button"
                    className="font-semibold uppercase tracking-[0.04em]"
                    onClick={() => toggleSort('added_on')}
                  >
                    Date {sortBy === 'added_on' ? (orderBy === '1' ? '↑' : '↓') : '↕'}
                  </button>
                </th>
                <th>Space</th>
                <th>Interested</th>
                <th>City</th>
                <th>Location</th>
                <th>Seats</th>
                <th>Name</th>
                <th>Stage</th>
                <th>Note</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Budget</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading ? (
                <tr>
                  <td colSpan={colCount} className="leads-loading">
                    Loading enquiries…
                  </td>
                </tr>
              ) : listQ.isError ? (
                <tr>
                  <td colSpan={colCount} className="leads-empty text-expired">
                    Failed to load enquiries.
                  </td>
                </tr>
              ) : !rows.length ? (
                <tr>
                  <td colSpan={colCount} className="leads-empty">
                    <div className="leads-empty-inner">
                      <MagnifyingGlassIcon />
                      <strong>No enquiries found</strong>
                      <p>
                        {hasActiveFilters
                          ? 'Try adjusting your search, date range, or stage filters.'
                          : 'New enquiries will appear here as they come in.'}
                      </p>
                      {hasActiveFilters ? (
                        <Button size="sm" variant="secondary" onClick={resetFilters}>
                          <ArrowPathIcon />
                          Reset filters
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : null}

              {rows.map((group) => {
                const lead = group.latestLead
                const id = leadRowId(lead)
                const all = group.allLeads ?? [lead]
                const multi = all.length > 1
                const exp = expandedKey === id
                const np = latestNotePreview(lead)
                return (
                  <Fragment key={id}>
                    <tr className="align-top">
                      {isAdmin ? (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() => toggleOne(id)}
                            aria-label={`Select ${other(lead).name}`}
                          />
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap text-muted">
                        {fmtDate(String(lead.added_on ?? ''))}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={cn(
                            'flex items-center gap-1 text-left font-semibold text-brand-ink',
                            multi && 'cursor-pointer',
                          )}
                          onClick={() => {
                            if (multi) setExpandedKey(exp ? null : id)
                          }}
                        >
                          {multi ? (
                            exp ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )
                          ) : null}
                          <span>{convertSpace(String(lead.space_type ?? ''))}</span>
                          {multi ? <span className="chip brand">{all.length}</span> : null}
                        </button>
                      </td>
                      <td className="max-w-[140px] truncate">{String(lead.interested_in ?? '—')}</td>
                      <td>{String(lead.city ?? '—')}</td>
                      <td className="max-w-[120px] truncate">{String(lead.microlocation ?? '—')}</td>
                      <td>{String(lead.no_of_seats ?? '—')}</td>
                      <td className="max-w-[140px]">
                        <button
                          type="button"
                          className="block w-full truncate text-left font-semibold text-brand-ink"
                          onClick={() => setDrawerLeadId(id)}
                        >
                          {other(lead).name ?? '—'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="chip"
                          onClick={() => setDrawerLeadId(id)}
                        >
                          {String(lead.lead_stage ?? '—')}
                        </button>
                      </td>
                      <td className="max-w-[180px]">
                        <button
                          type="button"
                          className="text-left text-[12px] text-muted"
                          onClick={() => setDrawerLeadId(id)}
                        >
                          {np.text || '—'}
                          {np.count > 1 ? <span> ({np.count})</span> : null}
                          {np.author ? (
                            <span className="mt-1 block text-[10px] text-faint">{np.author}</span>
                          ) : null}
                        </button>
                      </td>
                      <td>
                        {waMeHref(other(lead).phone_number) ? (
                          <a
                            className="text-brand-ink underline"
                            href={waMeHref(other(lead).phone_number)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {stripDisplayPhone(other(lead).phone_number) || '—'}
                          </a>
                        ) : (
                          <span>{stripDisplayPhone(other(lead).phone_number) || '—'}</span>
                        )}
                      </td>
                      <td className="max-w-[160px] truncate">{other(lead).email ?? '—'}</td>
                      <td>{String(lead.budget ?? '—')}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="icon-btn plain"
                            title="Edit"
                            onClick={() => navigate(`/layout/enquiry/detail/${id}`)}
                          >
                            <PencilSquareIcon />
                          </button>
                          <button
                            type="button"
                            className="icon-btn plain text-expired"
                            title="Delete"
                            onClick={() => setConfirmDelete(lead)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {multi && exp
                      ? all
                          .filter((l) => leadRowId(l) !== id)
                          .map((sub) => {
                            const sid = leadRowId(sub)
                            const sn = latestNotePreview(sub)
                            return (
                              <tr key={`${id}-${sid}`} className="bg-surface-2">
                                {isAdmin ? (
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(sid)}
                                      onChange={() => toggleOne(sid)}
                                    />
                                  </td>
                                ) : null}
                                <td className="whitespace-nowrap text-muted">
                                  {fmtDate(String(sub.added_on ?? ''))}
                                </td>
                                <td>{convertSpace(String(sub.space_type ?? ''))}</td>
                                <td className="max-w-[140px] truncate">
                                  {String(sub.interested_in ?? '—')}
                                </td>
                                <td>{String(sub.city ?? '—')}</td>
                                <td className="max-w-[120px] truncate">
                                  {String(sub.microlocation ?? '—')}
                                </td>
                                <td>{String(sub.no_of_seats ?? '—')}</td>
                                <td className="truncate">{other(sub).name ?? '—'}</td>
                                <td>{String(sub.lead_stage ?? '—')}</td>
                                <td className="max-w-[180px] text-[12px] text-muted">
                                  {sn.text || '—'}
                                </td>
                                <td>{stripDisplayPhone(other(sub).phone_number) || '—'}</td>
                                <td className="max-w-[160px] truncate">
                                  {other(sub).email ?? '—'}
                                </td>
                                <td>{String(sub.budget ?? '—')}</td>
                                <td className="text-right text-[11px] text-faint">
                                  Earlier enquiry
                                </td>
                              </tr>
                            )
                          })
                      : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <ListPagination
          currentPage={currentPage}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          loading={listQ.isLoading}
        />
      </div>

      <EnquiryLeadDrawer
        open={Boolean(drawerLeadId)}
        leadIdParam={drawerLeadId}
        onClose={() => setDrawerLeadId(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete lead?"
        description={
          confirmDelete ? `Remove ${other(confirmDelete).name ?? 'this lead'} permanently?` : undefined
        }
        danger
        busy={delMut.isPending}
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && delMut.mutate(leadRowId(confirmDelete))}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected leads?"
        description={`This will delete ${selectedIds.length} lead(s).`}
        danger
        busy={bulkDelMut.isPending}
        confirmText="Delete all"
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => bulkDelMut.mutate()}
      />
    </PageShell>
  )
}
