import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { login, isAuthenticated } from '../../../services/auth/auth.service'
import { resolveSafeReturnUrl } from '../../../services/auth/routeAccess'
import { cn } from '../../../lib/ui'

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

  const mut = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: () => {
      toast.success('Signed in')
      navigate(resolveSafeReturnUrl(returnUrlParam), { replace: true })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Login failed'),
  })

  if (isAuthenticated()) {
    return <Navigate to={resolveSafeReturnUrl(returnUrlParam)} replace />
  }

  return (
    <div className="min-h-screen">
      <div className="relative min-h-screen bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 opacity-80 [background-image:radial-gradient(900px_300px_at_20%_15%,rgba(139,92,246,0.42),transparent),radial-gradient(800px_280px_at_85%_25%,rgba(59,130,246,0.35),transparent),radial-gradient(900px_320px_at_55%_90%,rgba(16,185,129,0.22),transparent)]" />

        <div className="relative mx-auto flex min-h-screen max-w-[1440px] items-stretch">
          <div className="hidden w-1/2 flex-col justify-center px-10 py-12 text-white lg:flex">
            <div className="max-w-xl">
              <div className="text-2xl font-semibold tracking-wide">
                <span className="inline-block">SPACEHAAT</span>
              </div>
              <div className="mt-6 text-6xl font-extrabold leading-[0.95] tracking-tight">
                EXPLORE
                <br />
                HORIZONS
              </div>
              <div className="mt-8 text-lg font-medium text-white/90">
                Where your admin workflows become effortless.
              </div>
              <div className="mt-3 max-w-md text-sm leading-6 text-white/75">
                Sign in to manage locations, inventory, and content with a fast, modern panel.
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2 lg:px-10">
            <div className="relative w-full max-w-lg">
              <div className="pointer-events-none absolute -inset-2 rounded-[36px] bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-sky-500/25 blur-xl" />
              <div
                className={cn(
                  'relative w-full rounded-[28px] border border-white/15',
                  'bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8',
                )}
              >
              <div className="mb-6 text-center lg:hidden">
                <div className="text-sm font-semibold tracking-wide text-white/90">SPACEHAAT</div>
                <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
                  Explore Horizons
                </div>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  mut.mutate()
                }}
              >
                <div>
                  <label className="text-xs font-semibold text-white/85">Email</label>
                  <div className="mt-1">
                    <input
                      className={cn(
                        'w-full rounded-xl bg-white/90 px-4 py-3 text-sm text-slate-900',
                        'placeholder:text-slate-400',
                        'ring-1 ring-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      )}
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/85">Password</label>
                    <Link
                      to="/auth/forgot"
                      className="text-xs font-medium text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="mt-1 relative">
                    <input
                      className={cn(
                        'w-full rounded-xl bg-white/90 px-4 py-3 pr-12 text-sm text-slate-900',
                        'placeholder:text-slate-400',
                        'ring-1 ring-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      )}
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {showPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={mut.isPending}
                  className={cn(
                    'mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white',
                    'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600',
                    'shadow-lg shadow-violet-600/20 hover:brightness-105 active:brightness-95',
                    'disabled:opacity-70',
                  )}
                >
                  {mut.isPending ? 'Signing in…' : 'SIGN IN'}
                </button>

                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-white/20" />
                  <div className="text-xs font-medium text-white/70">or</div>
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                <button
                  type="button"
                  className={cn(
                    'w-full rounded-xl bg-white/12 py-3 text-sm font-semibold text-white',
                    'ring-1 ring-white/20 hover:bg-white/18',
                  )}
                  onClick={() => toast('Google sign-in not wired yet')}
                >
                  Sign in with Google
                </button>

                <div className="pt-2 text-center text-xs text-white/75">
                  Are you new?{' '}
                  <Link
                    to="/auth/register"
                    className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:text-white"
                  >
                    Create an Account
                  </Link>
                </div>
              </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

