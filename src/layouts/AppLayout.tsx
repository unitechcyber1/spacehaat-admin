import { useNavigate } from 'react-router-dom'
import { useCallback, useMemo, useState } from 'react'
import { LayoutRouteGate } from '../components/LayoutRouteGate'
import { logout } from '../services/auth/auth.service'
import { isLayoutPathAllowed } from '../services/auth/routeAccess'
import { Sidebar, type SidebarItem, SIDEBAR_COLLAPSED_KEY } from '../components/Sidebar'
import { cn } from '../lib/ui'
import {
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
  PhotoIcon,
  QueueListIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  StarIcon,
  TicketIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const navItems: SidebarItem[] = [
  { to: '/layout/space-from-listing', label: 'Space listing', icon: Squares2X2Icon, section: 'Main' },
  { to: '/layout/enquiry', label: 'Enquiry', icon: TicketIcon, section: 'Main' },
  { to: '/layout/office-space', label: 'Office space', icon: BriefcaseIcon, section: 'Office space' },
  { to: '/layout/pg', label: 'PG listings', icon: HomeModernIcon, section: 'Office space' },
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
]

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const items = useMemo(() => navItems.filter((item) => isLayoutPathAllowed(item.to)), [])
  const navigate = useNavigate()

  const persistCollapsed = useCallback((next: boolean) => {
    setSidebarCollapsed(next)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="min-h-screen text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className={cn(
            'hidden shrink-0 overflow-hidden border-r border-slate-200/70 bg-white/60 backdrop-blur transition-[width] duration-200 ease-out md:sticky md:top-0 md:flex md:h-screen md:max-h-screen md:flex-col',
            sidebarCollapsed ? 'w-[88px]' : 'w-72',
          )}
        >
          <Sidebar
            items={items}
            collapsed={sidebarCollapsed}
            onCollapsedChange={persistCollapsed}
            enableCollapse
          />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white/75 shadow-2xl backdrop-blur">
              <Sidebar
                items={items}
                onNavigate={() => setMobileOpen(false)}
                enableCollapse={false}
              />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/60 backdrop-blur">
            <div className="flex w-full items-center justify-between gap-3 px-4 py-3 md:justify-end">
              <button
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/70 hover:ring-1 hover:ring-slate-200 md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                ☰ Menu
              </button>
              <button
                className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/70 hover:ring-1 hover:ring-slate-200"
                onClick={() => {
                  logout()
                  navigate('/auth/login', { replace: true })
                }}
              >
                Logout
              </button>
            </div>
          </header>
          <div className="p-4">
            <LayoutRouteGate />
          </div>
        </main>
      </div>
    </div>
  )
}
