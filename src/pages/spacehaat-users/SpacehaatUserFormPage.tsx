import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { PageShell } from '../../components/PageShell'
import { cn } from '../../lib/ui'
import {
  createSpacehaatAdminUser,
  getSpacehaatUserById,
  updateSpacehaatAdminUser,
} from '../../services/spacehaat-users/spacehaatUsers.service'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
const fieldClass =
  'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500'

export function SpacehaatUserFormPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(userId)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const detailQ = useQuery({
    queryKey: ['spacehaat-user', userId],
    queryFn: () => getSpacehaatUserById(userId!),
    enabled: isEdit,
  })

  const loaded = detailQ.data?.data as Record<string, unknown> | undefined

  useEffect(() => {
    if (!loaded) return
    setName(String(loaded.name ?? ''))
    setEmail(String(loaded.email ?? ''))
    setPhone(String(loaded.phone_number ?? ''))
    setPassword(String(loaded.password ?? ''))
  }, [loaded])

  const saveMut = useMutation({
    mutationFn: async () => {
      const base = {
        name: name.trim() || null,
        email: email.trim() || null,
        phone_number: phone.trim() || null,
        role: 'sales',
      }
      if (isEdit) {
        return updateSpacehaatAdminUser({
          ...base,
          password: password.trim() || null,
          id: userId,
        })
      }
      return createSpacehaatAdminUser({
        ...base,
        password: password.trim() || null,
      })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated' : 'User created')
      qc.invalidateQueries({ queryKey: ['spacehaat-users'] })
      navigate('/layout/spacehaat-users')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  const invalid =
    !name.trim() || !email.trim() || !phone.trim() || (!isEdit && !password.trim())

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (invalid) {
      toast.error('Please fill required fields')
      return
    }
    saveMut.mutate()
  }

  return (
    <PageShell
      title={isEdit ? 'Update user' : 'Create user'}
      description="Sales role accounts (admin/createAdmin · admin/updateUser)."
      actions={
        <Button type="button" variant="ghost" onClick={() => navigate('/layout/spacehaat-users')}>
          Back to list
        </Button>
      }
    >
      <div className="mx-auto max-w-lg rounded-2xl bg-white/70 p-6 ring-1 ring-slate-200/70">
        {isEdit && detailQ.isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {isEdit && detailQ.isError ? <p className="text-sm text-red-600">Could not load user.</p> : null}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>User name *</label>
            <input
              className={cn(fieldClass, submitted && !name.trim() && 'ring-red-300')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User name"
            />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input
              className={cn(fieldClass, submitted && !email.trim() && 'ring-red-300')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <input
              className={cn(fieldClass, submitted && !phone.trim() && 'ring-red-300')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>
          {!isEdit ? (
            <div>
              <label className={labelClass}>Password *</label>
              <input
                className={cn(fieldClass, submitted && !password.trim() && 'ring-red-300')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          ) : (
            <div>
              <label className={labelClass}>Password</label>
              <input
                className={fieldClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave as stored or change"
              />
              <p className="mt-1 text-xs text-slate-500">Use your forgot-password flow on the auth site if needed.</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/layout/spacehaat-users')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  )
}
