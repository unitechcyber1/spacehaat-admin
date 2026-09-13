import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { EnvelopeIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { login, isAuthenticated } from '../../../services/auth/auth.service'
import { resolveSafeReturnUrl } from '../../../services/auth/routeAccess'

function loginErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const apiMessage = (e as { response?: { data?: { message?: unknown } } }).response?.data
      ?.message
    if (typeof apiMessage === 'string' && apiMessage) return apiMessage
    const message = (e as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Login failed'
}

function useQueryParam(name: string) {
  const location = useLocation()
  return useMemo(() => new URLSearchParams(location.search).get(name), [location.search, name])
}

export function LoginPage() {
  const navigate = useNavigate()
  const returnUrlParam = useQueryParam('returnUrl')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: () => {
      toast.success('Signed in')
      navigate(resolveSafeReturnUrl(returnUrlParam), { replace: true })
    },
    onError: (e: unknown) => {
      const message = loginErrorMessage(e)
      setError(message)
      toast.error(message)
    },
  })

  if (isAuthenticated()) {
    return <Navigate to={resolveSafeReturnUrl(returnUrlParam)} replace />
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            S
          </div>
          <div className="min-w-0">
            <div className="login-name">Spacehaat</div>
            <div className="login-sub">Admin console</div>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-lead">Sign in to manage listings, enquiries, and content.</p>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            mut.mutate()
          }}
        >
          {error ? (
            <div className="login-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="fld">
            <span className="lab">Email</span>
            <div className="login-input">
              <EnvelopeIcon />
              <input
                type="email"
                placeholder="you@spacehaat.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={mut.isPending}
                required
              />
            </div>
          </label>

          <label className="fld">
            <span className="lab">Password</span>
            <div className="login-input">
              <LockClosedIcon />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={mut.isPending}
                required
              />
              <button
                type="button"
                className="reveal"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button type="submit" className="btn primary lg block" disabled={mut.isPending}>
            {mut.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-foot">
          <ShieldCheckIcon />
          Secure admin access
        </div>
      </div>
    </div>
  )
}
