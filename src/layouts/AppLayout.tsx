import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  HomeModernIcon,
  MapIcon,
  MapPinIcon,
  MoonIcon,
  PhotoIcon,
  QueueListIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  StarIcon,
  SunIcon,
  TicketIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { LayoutRouteGate } from '../components/LayoutRouteGate'
import { getStoredUserInner, logout } from '../services/auth/auth.service'
import { isLayoutPathAllowed } from '../services/auth/routeAccess'
import { Sidebar, type SidebarItem } from '../components/Sidebar'
import { useTheme } from '../lib/themeContext'
import { cn } from '../lib/ui'

const navItems: SidebarItem[] = [
  { to: '/layout/enquiry', label: 'Enquiry', icon: TicketIcon, section: 'Main' },
  { to: '/layout/office-space', label: 'Office space', icon: BriefcaseIcon, section: 'Office space' },
  { to: '/layout/pg', label: 'PG listings', icon: HomeModernIcon, section: 'PG' },
  { to: '/layout/pg/priority', label: 'PG priority', icon: QueueListIcon, section: 'PG' },
  { to: '/layout/coworking/plans', label: 'Coworking plans', icon: Square3Stack3DIcon, section: 'Coworking' },
  { to: '/layout/coworking/spaces', label: 'Coworking spaces', icon: BuildingOffice2Icon, section: 'Coworking' },
  { to: '/layout/coworking/top-cities', label: 'Top coworking cities', icon: StarIcon, section: 'Coworking' },
  { to: '/layout/coworking/priority', label: 'Priority coworking', icon: QueueListIcon, section: 'Coworking' },
  { to: '/layout/brand', label: 'Brand', icon: CubeIcon, section: 'Content' },
  { to: '/layout/seo', label: 'SEO', icon: ChartBarSquareIcon, section: 'Content' },
  { to: '/layout/media', label: 'Media', icon: PhotoIcon, section: 'Content' },
  { to: '/layout/amenty', label: 'Amenities', icon: SparklesIcon, section: 'Content' },
  { to: '/layout/blog', label: 'Blog', icon: DocumentTextIcon, section: 'Content' },
  { to: '/layout/spacehaat-users', label: 'Spacehaat users', icon: UserGroupIcon, section: 'Records' },
  { to: '/layout/country', label: 'Countries', icon: GlobeAltIcon, section: 'Locations' },
  { to: '/layout/state', label: 'States', icon: MapIcon, section: 'Locations' },
  { to: '/layout/city', label: 'Cities', icon: MapPinIcon, section: 'Locations' },
  { to: '/layout/micro-location', label: 'Micro-locations', icon: ClipboardDocumentListIcon, section: 'Locations' },
  {
    to: '/layout/priority/microlocation',
    label: 'Micro-location priority',
    icon: QueueListIcon,
    section: 'Locations',
  },
]

function titleCase(segment: string) {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

/** Longest matching nav label for the current path, falling back to the last URL segment. */
function useBreadcrumb(items: SidebarItem[]) {
  const { pathname } = useLocation()
  return useMemo(() => {
    const current = pathname.replace(/\/+$/, '') || '/'
    let best: SidebarItem | undefined
    for (const item of items) {
      const base = item.to.replace(/\/+$/, '')
      if (current === base || current.startsWith(`${base}/`)) {
        if (!best || base.length > best.to.replace(/\/+$/, '').length) best = item
      }
    }

    const segments = current.split('/').filter(Boolean)
    const last = segments[segments.length - 1] ?? ''
    const isDetail =
      best && current !== best.to.replace(/\/+$/, '') && !/^[0-9a-f]{8,}$/i.test(last)

    if (best) {
      return { title: best.label, detail: isDetail ? titleCase(last) : '' }
    }
    return { title: last ? titleCase(last) : 'Dashboard', detail: '' }
  }, [pathname, items])
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'SA'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const items = useMemo(() => navItems.filter((item) => isLayoutPathAllowed(item.to)), [])
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const crumb = useBreadcrumb(items)

  const signOut = useCallback(() => {
    logout()
    navigate('/auth/login', { replace: true })
  }, [navigate])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Close the drawer whenever the route changes (adjust state during render
  // rather than in an effect, so the drawer never paints on the new page).
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    if (drawerOpen) setDrawerOpen(false)
  }

  // Escape closes the drawer; lock body scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  const user = getStoredUserInner()
  const name = String(user?.name ?? user?.email ?? 'Spacehaat Admin')
  const role = String(user?.role ?? 'admin')

  return (
    <div className="app">
      <Sidebar items={items} onLogout={signOut} />

      {drawerOpen ? (
        <>
          <div className="drawer-bg" onClick={closeDrawer} aria-hidden="true" />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              type="button"
              className="icon-btn plain absolute right-3 top-3 z-10"
              onClick={closeDrawer}
              aria-label="Close navigation"
            >
              <XMarkIcon />
            </button>
            <Sidebar
              items={items}
              onNavigate={closeDrawer}
              onLogout={signOut}
              className="border-r-0"
            />
          </div>
        </>
      ) : null}

      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn nav-toggle"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Bars3Icon />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <span className="crumb">{crumb.title}</span>
            {crumb.detail ? <span className="pill phone:hidden">{crumb.detail}</span> : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            <Menu as="div" className="relative">
              <MenuButton
                className="avatar h-[34px] w-[34px] cursor-pointer border border-line text-[12px]"
                aria-label="Account menu"
              >
                {initialsOf(name)}
              </MenuButton>
              <MenuItems
                anchor="bottom end"
                className={cn(
                  'z-[1400] mt-1 w-52 rounded-lg border border-line bg-surface p-1 shadow-xl',
                  'focus:outline-none',
                )}
              >
                <div className="border-b border-line-2 px-3 py-2">
                  <div className="truncate text-[12.5px] font-semibold">{name}</div>
                  <div className="truncate text-[11px] capitalize text-muted">{role}</div>
                </div>
                <MenuItem>
                  <button
                    type="button"
                    onClick={signOut}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-expired data-[focus]:bg-expired-soft"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Log out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </header>

        <main id="main">
          <LayoutRouteGate />
        </main>
      </div>
    </div>
  )
}
