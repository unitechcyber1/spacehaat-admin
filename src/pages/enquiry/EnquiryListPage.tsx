import { Fragment, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { Table, Td, Th, Tr } from '../../components/Table'
import { cn } from '../../lib/ui'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { canCreateManualLead, getStoredUserInner, isStoredUserAdmin } from '../../services/auth/auth.service'
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
import { applyDatePreset, defaultThisMonthRange } from './enquiryDateRange'
import { EnquiryLeadDrawer } from './EnquiryLeadDrawer'

const filterSelectClass =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 transition focus:outline-none focus:ring-2 focus:ring-violet-500'

const filterLabelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'

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

function useScopeDefaults() {
  return useMemo(() => {
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
  }, [])
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

  const [spaceType, setSpaceType] = useState('')
  const [leadStage, setLeadStage] = useState('all')
  const [interestedIn, setInterestedIn] = useState('all')
  const [seatBucket, setSeatBucket] = useState('all')
  const [budgetPick, setBudgetPick] = useState('all')
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [nameIn, setNameIn] = useState('')
  const [emailIn, setEmailIn] = useState('')
  const [phoneIn, setPhoneIn] = useState('')
  const [cityIn, setCityIn] = useState('')
  const [locationIn, setLocationIn] = useState('')
  const [addressIn, setAddressIn] = useState('')

  const debName = useDebouncedValue(nameIn, 800)
  const debEmail = useDebouncedValue(emailIn, 800)
  const debPhone = useDebouncedValue(phoneIn, 800)
  const debCity = useDebouncedValue(cityIn, 800)
  const debLoc = useDebouncedValue(locationIn, 800)
  const debAddr = useDebouncedValue(addressIn, 800)

  const initialRange = useMemo(() => defaultThisMonthRange(), [])
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)

  const [adminUserJson, setAdminUserJson] = useState('')
  const [adminMarketingJson, setAdminMarketingJson] = useState('')
  const [salesFilterUserId, setSalesFilterUserId] = useState('')

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
    const rows = (usersQ.data?.data ?? []) as { _id?: string; id?: string; name?: string; isMarketing?: boolean; lead_source?: string }[]
    return rows.map((u) => ({
      id: String(u.id ?? u._id ?? ''),
      name: String(u.name ?? ''),
      isMarketing: Boolean(u.isMarketing),
      lead_source: u.lead_source,
    }))
  }, [usersQ.data?.data])

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

    const lead_stage =
      leadStage === 'all' ? '' : leadStage.trim().toLocaleLowerCase()

    const interested_in =
      interestedIn === 'all' ? '' : interestedIn.trim().toLocaleLowerCase()

    let noOfSeats = ''
    if (seatBucket && seatBucket !== 'all') {
      noOfSeats = encodeURIComponent(JSON.stringify([seatBucket]))
    }

    const budget =
      budgetPick === 'all' || !budgetPick ? [] : [budgetPick]

    const user = isAdmin ? adminUserJson || '' : scope.userJson
    const marketingUser = isAdmin ? adminMarketingJson || '' : scope.marketingJson

    const p: Record<string, unknown> = {
      limit: pageSize,
      page,
      groupBy: 'user',
      sortBy,
      orderBy,
      name: debName.trim().toLowerCase(),
      email: debEmail.trim().toLowerCase(),
      phone_number: debPhone.trim(),
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
    debName,
    debEmail,
    debPhone,
    debCity,
    debLoc,
    debAddr,
    isAdmin,
    adminUserJson,
    adminMarketingJson,
    scope.userJson,
    scope.marketingJson,
  ])

  const listQ = useQuery({
    queryKey: ['enquiries', listParams],
    queryFn: () => getEnquiries(listParams),
    staleTime: 5_000,
  })

  const rows = (listQ.data?.data ?? []) as GroupedEnquiryRow[]
  const total = listQ.data?.totalRecords ?? 0

  const delMut = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success('Lead deleted')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const bulkDelMut = useMutation({
    mutationFn: () => deleteManyLeads({ leads: selectedIds }),
    onSuccess: () => {
      toast.success('Selected leads deleted')
      setConfirmBulkDelete(false)
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Bulk delete failed'),
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Export failed'),
  })

  const grantMut = useMutation({
    mutationFn: () => updateLeadAccess({ leads: selectedIds, users: grantUserIds }),
    onSuccess: () => {
      toast.success('Access updated')
      setGrantUserIds([])
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Grant failed'),
  })

  const removeMut = useMutation({
    mutationFn: () => removeLeadAccess({ leads: selectedIds, users: grantUserIds }),
    onSuccess: () => {
      toast.success('Access removed')
      setGrantUserIds([])
      setSelectedIds([])
      qc.invalidateQueries({ queryKey: ['enquiries'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Remove failed'),
  })

  function resetFilters() {
    setPage(1)
    setSpaceType('')
    setLeadStage('all')
    setInterestedIn('all')
    setSeatBucket('all')
    setBudgetPick('all')
    setDatePreset('thisMonth')
    const r = defaultThisMonthRange()
    setStartDate(r.startDate)
    setEndDate(r.endDate)
    setNameIn('')
    setEmailIn('')
    setPhoneIn('')
    setCityIn('')
    setLocationIn('')
    setAddressIn('')
    setAdminUserJson('')
    setAdminMarketingJson('')
    setSalesFilterUserId('')
    setSortBy('')
    setOrderBy('')
  }

  function onDatePresetChange(preset: string) {
    setDatePreset(preset)
    const r = applyDatePreset(preset)
    if (r) {
      setStartDate(r.startDate)
      setEndDate(r.endDate)
      setPage(1)
    }
  }

  function applyCustomRange() {
    if (!customStart || !customEnd) {
      toast.error('Pick start and end dates')
      return
    }
    const a = new Date(customStart)
    const b = new Date(customEnd)
    if (a > b) {
      toast.error('Start must be before end')
      return
    }
    setStartDate(a.toISOString())
    setEndDate(b.toISOString())
    setPage(1)
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
    setPage(1)
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
      setPage(1)
      return
    }
    const full = (usersQ.data?.data ?? []).find((x: any) => String(x.id ?? x._id) === uid) as
      | { _id?: string; id?: string; isMarketing?: boolean; lead_source?: string }
      | undefined
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
      setAdminUserJson(
        JSON.stringify({ _id: full._id ?? full.id, lead_source: full.lead_source }),
      )
    }
    setPage(1)
  }

  const allSelected = rows.length > 0 && selectedIds.length === rows.length
  const colCount = isAdmin ? 14 : 13

  return (
    <PageShell
      title="Enquiries"
      description="Grouped leads (by user), filters, drawer notes, and bulk actions for admins."
      actions={
        <div className="flex flex-wrap gap-2">
          {showAdd ? (
            <Button type="button" variant="primary" onClick={() => navigate('/layout/enquiry/add')}>
              Add lead
            </Button>
          ) : null}
          {isAdmin ? (
            <>
              <Button type="button" variant="secondary" disabled={exportMut.isPending} onClick={() => exportMut.mutate()}>
                <ArrowDownTrayIcon className="mr-1 inline h-4 w-4" aria-hidden />
                Export CSV
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <label className={filterLabelClass}>Space type</label>
            <select
              className={filterSelectClass}
              value={spaceType}
              onChange={(e) => {
                setSpaceType(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              {SPACE_TYPE_FILTER.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={filterLabelClass}>City</label>
            <Input value={cityIn} onChange={(e) => setCityIn(e.target.value)} placeholder="City" />
          </div>
          <div>
            <label className={filterLabelClass}>Location</label>
            <Input value={locationIn} onChange={(e) => setLocationIn(e.target.value)} placeholder="Location" />
          </div>
          <div>
            <label className={filterLabelClass}>Lead stage</label>
            <select
              className={filterSelectClass}
              value={leadStage}
              onChange={(e) => {
                setLeadStage(e.target.value)
                setPage(1)
              }}
            >
              {LEAD_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={filterLabelClass}>Seats</label>
            <select
              className={filterSelectClass}
              value={seatBucket}
              onChange={(e) => {
                setSeatBucket(e.target.value)
                setPage(1)
              }}
            >
              {SEAT_FILTER_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={filterLabelClass}>Budget</label>
            <select
              className={filterSelectClass}
              value={budgetPick}
              onChange={(e) => {
                setBudgetPick(e.target.value)
                setPage(1)
              }}
            >
              {BUDGET_FILTER_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <label className={filterLabelClass}>Date range</label>
            <select
              className={filterSelectClass}
              value={datePreset}
              onChange={(e) => onDatePresetChange(e.target.value)}
            >
              {DATE_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {datePreset === 'custom' ? (
            <>
              <div>
                <label className={filterLabelClass}>Start</label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div>
                <label className={filterLabelClass}>End</label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={applyCustomRange}>
                  Apply dates
                </Button>
              </div>
            </>
          ) : null}
          {isAdmin ? (
            <div>
              <label className={filterLabelClass}>Filter by sales user</label>
              <select
                className={filterSelectClass}
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
            </div>
          ) : null}
          <div>
            <label className={filterLabelClass}>Interested in</label>
            <select
              className={filterSelectClass}
              value={interestedIn}
              onChange={(e) => {
                setInterestedIn(e.target.value)
                setPage(1)
              }}
            >
              {INTERESTED_IN_FILTER.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={filterLabelClass}>Name</label>
            <Input value={nameIn} onChange={(e) => setNameIn(e.target.value)} placeholder="Search name" />
          </div>
          <div>
            <label className={filterLabelClass}>Phone</label>
            <Input value={phoneIn} onChange={(e) => setPhoneIn(e.target.value)} placeholder="Search phone" />
          </div>
          <div>
            <label className={filterLabelClass}>Email</label>
            <Input value={emailIn} onChange={(e) => setEmailIn(e.target.value)} placeholder="Search email" />
          </div>
        </div>

        <div>
          <label className={filterLabelClass}>Address</label>
          <Input value={addressIn} onChange={(e) => setAddressIn(e.target.value)} placeholder="Search address" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>

        {isAdmin && selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
            <div className="min-w-[200px] flex-1">
              <label className={filterLabelClass}>Grant / remove access for users</label>
              <select
                multiple
                className={cn(filterSelectClass, 'min-h-[96px]')}
                value={grantUserIds}
                onChange={(e) => {
                  const opts = [...e.target.selectedOptions].map((o) => o.value)
                  setGrantUserIds(opts)
                }}
              >
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="secondary" disabled={!grantUserIds.length || grantMut.isPending} onClick={() => grantMut.mutate()}>
              Grant access
            </Button>
            <Button type="button" variant="secondary" disabled={!grantUserIds.length || removeMut.isPending} onClick={() => removeMut.mutate()}>
              Remove access
            </Button>
            <Button type="button" variant="danger" onClick={() => setConfirmBulkDelete(true)}>
              Delete selected
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-slate-200/70">
        <Table>
          <thead>
            <Tr>
              {isAdmin ? (
                <Th className="w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all" />
                </Th>
              ) : null}
              <Th>
                <button type="button" className="font-semibold" onClick={() => toggleSort('added_on')}>
                  Date {sortBy === 'added_on' ? (orderBy === '1' ? '↑' : '↓') : ''}
                </button>
              </Th>
              <Th>Space</Th>
              <Th>Interested</Th>
              <Th>City</Th>
              <Th>Location</Th>
              <Th>Seats</Th>
              <Th>Name</Th>
              <Th>Stage</Th>
              <Th>Note</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Budget</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr>
                <Td colSpan={colCount} className="py-10 text-center text-sm text-slate-500">
                  Loading enquiries…
                </Td>
              </Tr>
            ) : null}
            {listQ.isError ? (
              <Tr>
                <Td colSpan={colCount} className="py-10 text-center text-sm text-red-600">
                  Failed to load enquiries.
                </Td>
              </Tr>
            ) : null}
            {!listQ.isLoading && !rows.length ? (
              <Tr>
                <Td colSpan={colCount} className="py-10 text-center text-sm text-slate-500">
                  No enquiries match these filters.
                </Td>
              </Tr>
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
                  <Tr className="align-top">
                    {isAdmin ? (
                      <Td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select ${other(lead).name}`}
                        />
                      </Td>
                    ) : null}
                    <Td className="whitespace-nowrap text-sm">{fmtDate(String(lead.added_on ?? ''))}</Td>
                    <Td>
                      <button
                        type="button"
                        className={cn('flex items-center gap-1 text-left text-sm font-medium text-violet-800', multi && 'cursor-pointer')}
                        onClick={() => {
                          if (multi) setExpandedKey(exp ? null : id)
                        }}
                      >
                        {multi ? exp ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" /> : null}
                        <span>{convertSpace(String(lead.space_type ?? ''))}</span>
                        {multi ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">{all.length}</span>
                        ) : null}
                      </button>
                    </Td>
                    <Td className="max-w-[140px] truncate text-sm">{String(lead.interested_in ?? '—')}</Td>
                    <Td className="text-sm">{String(lead.city ?? '—')}</Td>
                    <Td className="max-w-[120px] truncate text-sm">{String(lead.microlocation ?? '—')}</Td>
                    <Td className="text-sm">{String(lead.no_of_seats ?? '—')}</Td>
                    <Td className="max-w-[120px]">
                      <button
                        type="button"
                        className="truncate text-left text-sm font-medium text-violet-800"
                        onClick={() => setDrawerLeadId(id)}
                      >
                        {other(lead).name ?? '—'}
                      </button>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        className="text-sm text-violet-800"
                        onClick={() => setDrawerLeadId(id)}
                      >
                        {String(lead.lead_stage ?? '—')}
                      </button>
                    </Td>
                    <Td className="max-w-[180px]">
                      <button type="button" className="text-left text-xs text-slate-700" onClick={() => setDrawerLeadId(id)}>
                        {np.text || '—'}
                        {np.count > 1 ? <span className="text-slate-500"> ({np.count})</span> : null}
                        {np.author ? <span className="mt-1 block text-[10px] text-slate-500">{np.author}</span> : null}
                      </button>
                    </Td>
                    <Td className="text-sm">
                      {waMeHref(other(lead).phone_number) ? (
                        <a
                          className="text-violet-700 underline"
                          href={waMeHref(other(lead).phone_number)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {stripDisplayPhone(other(lead).phone_number) || '—'}
                        </a>
                      ) : (
                        <span>{stripDisplayPhone(other(lead).phone_number) || '—'}</span>
                      )}
                    </Td>
                    <Td className="max-w-[140px] truncate text-sm">{other(lead).email ?? '—'}</Td>
                    <Td className="text-sm">{String(lead.budget ?? '—')}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                          title="Edit"
                          onClick={() => navigate(`/layout/enquiry/detail/${id}`)}
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Delete"
                          onClick={() => setConfirmDelete(lead)}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                  {multi && exp
                    ? all
                        .filter((l) => leadRowId(l) !== id)
                        .map((sub) => {
                          const sid = leadRowId(sub)
                          const sn = latestNotePreview(sub)
                          return (
                            <Tr key={`${id}-${sid}`} className="bg-slate-50/80">
                              {isAdmin ? (
                                <Td>
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(sid)}
                                    onChange={() => toggleOne(sid)}
                                  />
                                </Td>
                              ) : null}
                              <Td className="whitespace-nowrap text-sm">{fmtDate(String(sub.added_on ?? ''))}</Td>
                              <Td className="text-sm">{convertSpace(String(sub.space_type ?? ''))}</Td>
                              <Td className="max-w-[140px] truncate text-sm">{String(sub.interested_in ?? '—')}</Td>
                              <Td className="text-sm">{String(sub.city ?? '—')}</Td>
                              <Td className="max-w-[120px] truncate text-sm">{String(sub.microlocation ?? '—')}</Td>
                              <Td className="text-sm">{String(sub.no_of_seats ?? '—')}</Td>
                              <Td className="truncate text-sm">{other(sub).name ?? '—'}</Td>
                              <Td className="text-sm">{String(sub.lead_stage ?? '—')}</Td>
                              <Td className="max-w-[180px] text-xs text-slate-600">{sn.text || '—'}</Td>
                              <Td className="text-sm">{stripDisplayPhone(other(sub).phone_number) || '—'}</Td>
                              <Td className="max-w-[140px] truncate text-sm">{other(sub).email ?? '—'}</Td>
                              <Td className="text-sm">{String(sub.budget ?? '—')}</Td>
                              <Td className="text-right text-xs text-slate-500">Earlier enquiry</Td>
                            </Tr>
                          )
                        })
                    : null}
                </Fragment>
              )
            })}
          </tbody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {total} record{total === 1 ? '' : 's'} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">
            Rows
            <select
              className={cn(filterSelectClass, 'ml-2 inline-block w-24 py-2')}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[5, 10, 25, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <EnquiryLeadDrawer open={Boolean(drawerLeadId)} leadIdParam={drawerLeadId} onClose={() => setDrawerLeadId(null)} />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete lead?"
        description={confirmDelete ? `Remove ${other(confirmDelete).name ?? 'this lead'} permanently?` : undefined}
        danger
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && delMut.mutate(leadRowId(confirmDelete))}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected leads?"
        description={`This will delete ${selectedIds.length} lead(s).`}
        danger
        confirmText="Delete all"
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => bulkDelMut.mutate()}
      />
    </PageShell>
  )
}
