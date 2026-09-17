import { useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { isStoredUserAdmin } from '../../services/auth/auth.service'
import { cn } from '../../lib/ui'
import { isBillingAdminOnlyPath } from './billingHelpers'
import './billing.css'

export type BillingTab = 'clients' | 'invoices' | 'settings' | 'state-gst' | 'catalog'

const TAB_ROUTES: Record<BillingTab, string> = {
  invoices: '/layout/billing/invoices',
  clients: '/layout/billing/clients',
  settings: '/layout/billing/settings',
  'state-gst': '/layout/billing/settings/state-gst',
  catalog: '/layout/billing/product-catalog',
}

function activeTabFromPath(pathname: string): BillingTab {
  if (pathname.includes('/billing/settings/state-gst')) return 'state-gst'
  if (pathname.includes('/billing/product-catalog')) return 'catalog'
  if (pathname.includes('/billing/settings')) return 'settings'
  if (pathname.includes('/billing/clients')) return 'clients'
  return 'invoices'
}

export function BillingLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isAdmin = isStoredUserAdmin()
  const activeTab = activeTabFromPath(pathname)

  useEffect(() => {
    if (!isAdmin && isBillingAdminOnlyPath(pathname)) {
      navigate('/layout/billing/invoices', { replace: true })
    }
  }, [isAdmin, navigate, pathname])

  const tabs = useMemo(() => {
    const base: { id: BillingTab; label: string; adminOnly?: boolean }[] = [
      { id: 'invoices', label: 'Invoices' },
      { id: 'clients', label: 'Clients' },
      { id: 'settings', label: 'Settings', adminOnly: true },
      { id: 'state-gst', label: 'State GST', adminOnly: true },
      { id: 'catalog', label: 'Catalog', adminOnly: true },
    ]
    return base.filter((t) => !t.adminOnly || isAdmin)
  }, [isAdmin])

  return (
    <div className="screen">
      <div className="page-head">
        <div className="min-w-0">
          <h1>Billing & Invoices</h1>
          <p className="sub">
            Manage tax and proforma invoices for Coworking, Office, PG, Coliving, and Virtual Office clients.
          </p>
        </div>
        <div className="actions">
          {activeTab === 'clients' ? (
            <Button variant="primary" onClick={() => navigate('/layout/billing/clients/new')}>
              <PlusIcon className="mr-1.5 h-4 w-4" aria-hidden />
              Add client
            </Button>
          ) : null}
          {activeTab === 'invoices' ? (
            <Button variant="primary" onClick={() => navigate('/layout/billing/invoices/new')}>
              <PlusIcon className="mr-1.5 h-4 w-4" aria-hidden />
              Create invoice
            </Button>
          ) : null}
        </div>
      </div>

      <nav className="mb-4 flex flex-wrap gap-1 border-b border-line pb-0" aria-label="Billing sections">
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={TAB_ROUTES[tab.id]}
            end={tab.id === 'invoices' || tab.id === 'clients'}
            className={({ isActive }) =>
              cn(
                'rounded-t-lg px-4 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'border border-b-0 border-line bg-surface text-ink shadow-sm'
                  : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="page-stack">
        <Outlet />
      </div>
    </div>
  )
}
