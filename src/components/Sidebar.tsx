import { Fragment, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  MapIcon,
  MapPinIcon,
  PhotoIcon,
  QueueListIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  HomeModernIcon,
  Squares2X2Icon,
  StarIcon,
  TicketIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { cn } from '../lib/ui'
import { getStoredUserInner } from '../services/auth/auth.service'

export type SidebarItem = {
  to: string
  label: string
  icon:
    | typeof GlobeAltIcon
    | typeof MapIcon
    | typeof MapPinIcon
    | typeof Squares2X2Icon
    | typeof ClipboardDocumentListIcon
    | typeof TicketIcon
    | typeof BuildingOffice2Icon
    | typeof BriefcaseIcon
    | typeof CubeIcon
    | typeof DocumentTextIcon
    | typeof UserGroupIcon
    | typeof ChartBarSquareIcon
    | typeof Cog6ToothIcon
    | typeof Square3Stack3DIcon
    | typeof StarIcon
    | typeof QueueListIcon
    | typeof PhotoIcon
    | typeof SparklesIcon
    | typeof HomeModernIcon
  section?: string
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'SA'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function Sidebar({
  items,
  onNavigate,
  onLogout,
  className,
}: {
  items: SidebarItem[]
  onNavigate?: () => void
  onLogout?: () => void
  className?: string
}) {
  const { pathname } = useLocation()

  const grouped = useMemo(() => {
    const map = new Map<string, SidebarItem[]>()
    for (const it of items) {
      const key = it.section ?? 'Main'
      map.set(key, [...(map.get(key) ?? []), it])
    }
    return Array.from(map.entries())
  }, [items])

  /** Avoid highlighting parent paths when a more specific nav item matches (e.g. `/layout/pg` vs `/layout/pg/priority`). */
  const isItemActive = useMemo(() => {
    const paths = items.map((it) => it.to.replace(/\/+$/, '') || '/')
    return (to: string, current0: string) => {
      const base = to.replace(/\/+$/, '') || '/'
      const current = current0.replace(/\/+$/, '') || '/'
      if (!current.startsWith(base)) return false
      if (current === base) return true
      const hasMoreSpecificMatch = items.some((_item, i) => {
        const other = paths[i]
        if (other === base || other.length <= base.length) return false
        return other.startsWith(`${base}/`) && current.startsWith(other)
      })
      return !hasMoreSpecificMatch
    }
  }, [items])

  const user = getStoredUserInner()
  const name = String(user?.name ?? user?.email ?? 'Spacehaat Admin')
  const role = String(user?.role ?? 'admin')

  return (
    <aside className={cn('sidebar', className)}>
      <div className="brand">
        <div className="logo" aria-hidden="true">
          S
        </div>
        <div className="min-w-0">
          <div className="name">Spacehaat</div>
          <div className="sub">Admin console</div>
        </div>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {grouped.map(([section, sectionItems]) => (
          <Fragment key={section}>
            <div className="nav-label">{section}</div>
            {sectionItems.map((item) => {
              const active = isItemActive(item.to, pathname)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn('nav-item', active && 'active')}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon />
                  <span className="min-w-0 truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </Fragment>
        ))}
      </nav>

      <div className="spacer" />

      <div className="who">
        <div className="avatar" aria-hidden="true">
          {initialsOf(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="who-name truncate">{name}</div>
          <div className="who-role truncate capitalize">{role}</div>
        </div>
        {onLogout ? (
          <button
            type="button"
            className="icon-btn plain"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
          >
            <ArrowRightOnRectangleIcon />
          </button>
        ) : null}
      </div>
    </aside>
  )
}
