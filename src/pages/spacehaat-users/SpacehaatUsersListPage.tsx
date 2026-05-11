import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  KeyIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  CheckIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Input } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import { Table, Td, Th, Tr } from '../../components/Table'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import {
  deleteSpacehaatUser,
  listSpacehaatUsers,
  updateSpacehaatUserAccess,
} from '../../services/spacehaat-users/spacehaatUsers.service'

const PAGE_SIZE_DEFAULT = 10

function stripParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

function userRowId(u: Record<string, unknown>) {
  return String(u._id ?? u.id ?? '')
}

function fmtDate(iso: unknown) {
  if (iso == null || iso === '') return '—'
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function SpacehaatUsersListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT)
  const [sortBy, setSortBy] = useState('')
  const [orderBy, setOrderBy] = useState('')

  const [nameIn, setNameIn] = useState(() => searchParams.get('name') ?? '')
  const [emailIn, setEmailIn] = useState('')
  const [phoneIn, setPhoneIn] = useState(() => searchParams.get('phone_number') ?? '')

  const debName = useDebouncedValue(nameIn, 800)
  const debEmail = useDebouncedValue(emailIn, 800)
  const debPhone = useDebouncedValue(phoneIn, 800)

  const listParams = useMemo(
    () =>
      stripParams({
        limit: pageSize,
        page,
        sortBy,
        orderBy,
        name: debName.trim().toLowerCase(),
        email: debEmail.trim().toLowerCase(),
        phone_number: debPhone.trim(),
        groupBy: 'user',
        roles: 'sales',
      }),
    [page, pageSize, sortBy, orderBy, debName, debEmail, debPhone],
  )

  const listQ = useQuery({
    queryKey: ['spacehaat-users', listParams],
    queryFn: () => listSpacehaatUsers(listParams),
    staleTime: 5_000,
  })

  const rows = (listQ.data?.data ?? []) as Record<string, unknown>[]
  const total = listQ.data?.totalRecords ?? 0

  const [confirmDelete, setConfirmDelete] = useState<Record<string, unknown> | null>(null)

  const delMut = useMutation({
    mutationFn: (id: string) => deleteSpacehaatUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['spacehaat-users'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Delete failed'),
  })

  const accessMut = useMutation({
    mutationFn: (payload: { id: string; is_active: boolean }) =>
      updateSpacehaatUserAccess({ id: payload.id, is_active: payload.is_active }),
    onSuccess: (_, v) => {
      toast.success(v.is_active ? 'User enabled' : 'User disabled')
      qc.invalidateQueries({ queryKey: ['spacehaat-users'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Update failed'),
  })

  function resetFilters() {
    setNameIn('')
    setEmailIn('')
    setPhoneIn('')
    setPage(1)
    setSortBy('')
    setOrderBy('')
    setSearchParams({}, { replace: true })
  }

  function syncNameQuery() {
    const n = debName.trim()
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (n) p.set('name', n)
        else p.delete('name')
        return p
      },
      { replace: true },
    )
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

  return (
    <PageShell
      title="Spacehaat users"
      description="Sales team accounts (legacy admin/userList + createAdmin/updateUser/updateAccess)."
      actions={
        <Button type="button" variant="primary" onClick={() => navigate('/layout/spacehaat-users/add')}>
          <UserPlusIcon className="mr-2 inline h-5 w-5" aria-hidden />
          Create user
        </Button>
      }
    >
      <div className="space-y-4 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/70 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
            <Input value={nameIn} onChange={(e) => setNameIn(e.target.value)} onBlur={syncNameQuery} placeholder="Search name" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <Input
              value={emailIn}
              onChange={(e) => setEmailIn(e.target.value)}
              placeholder="Search email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
            <Input value={phoneIn} onChange={(e) => setPhoneIn(e.target.value)} placeholder="Search phone" />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-slate-200/70">
        <Table>
          <thead>
            <Tr>
              <Th>
                <button type="button" className="font-semibold" onClick={() => toggleSort('name')}>
                  User name {sortBy === 'name' ? (orderBy === '1' ? '↑' : '↓') : ''}
                </button>
              </Th>
              <Th>
                <button type="button" className="font-semibold" onClick={() => toggleSort('email')}>
                  Email {sortBy === 'email' ? (orderBy === '1' ? '↑' : '↓') : ''}
                </button>
              </Th>
              <Th>Mobile</Th>
              <Th>Role</Th>
              <Th>Registered on</Th>
              <Th className="text-center">Access</Th>
              <Th className="text-center">Edit</Th>
              <Th className="text-center">Enable</Th>
              <Th className="text-center">Disable</Th>
              <Th className="text-center">Delete</Th>
            </Tr>
          </thead>
          <tbody>
            {listQ.isLoading ? (
              <Tr>
                <Td colSpan={10} className="py-10 text-center text-sm text-slate-500">
                  Loading users…
                </Td>
              </Tr>
            ) : null}
            {listQ.isError ? (
              <Tr>
                <Td colSpan={10} className="py-10 text-center text-sm text-red-600">
                  Failed to load users.
                </Td>
              </Tr>
            ) : null}
            {!listQ.isLoading && !rows.length ? (
              <Tr>
                <Td colSpan={10} className="py-10 text-center text-sm text-slate-500">
                  No users match these filters.
                </Td>
              </Tr>
            ) : null}
            {rows.map((u) => {
              const id = userRowId(u)
              const apiId = String(u.id ?? u._id ?? id)
              const active = u.is_active !== false
              return (
                <Tr key={id}>
                  <Td className="font-medium text-slate-900">
                    {String(u.name ?? '—')}
                    {!active ? <span className="ml-2 text-xs text-amber-700">(Inactive)</span> : null}
                  </Td>
                  <Td className="text-sm">{String(u.email ?? '—')}</Td>
                  <Td className="text-sm">{String(u.phone_number ?? '—')}</Td>
                  <Td className="text-sm">{String(u.role ?? '—')}</Td>
                  <Td className="text-sm">{fmtDate(u.added_on)}</Td>
                  <Td className="text-center">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-violet-700 hover:bg-violet-50"
                      title="Access"
                      onClick={() => navigate(`/layout/spacehaat-users/access/${id}`)}
                    >
                      <KeyIcon className="h-5 w-5" />
                    </button>
                  </Td>
                  <Td className="text-center">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                      title="Edit"
                      onClick={() => navigate(`/layout/spacehaat-users/${id}`)}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </Td>
                  <Td className="text-center">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                      title="Enable"
                      disabled={active}
                      onClick={() => accessMut.mutate({ id: apiId, is_active: true })}
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  </Td>
                  <Td className="text-center">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-amber-800 hover:bg-amber-50 disabled:opacity-40"
                      title="Disable"
                      disabled={!active}
                      onClick={() => accessMut.mutate({ id: apiId, is_active: false })}
                    >
                      <NoSymbolIcon className="h-5 w-5" />
                    </button>
                  </Td>
                  <Td className="text-center">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                      title="Delete"
                      onClick={() => setConfirmDelete(u)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {total} user{total === 1 ? '' : 's'} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">
            Rows
            <select
              className="ml-2 rounded-xl border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200"
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

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete user?"
        description={
          confirmDelete ? `Remove ${String(confirmDelete.name ?? 'this user')} permanently?` : undefined
        }
        danger
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) delMut.mutate(String(confirmDelete.id ?? confirmDelete._id ?? ''))
        }}
      />
    </PageShell>
  )
}
