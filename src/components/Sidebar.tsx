import { Fragment, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
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
  Squares2X2Icon,
  StarIcon,
  TicketIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { cn } from '../lib/ui'

export const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed'

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
  section?: string
}

export function Sidebar({
  items,
  onNavigate,
  className,
  collapsed: collapsedControlled,
  onCollapsedChange,
  enableCollapse = true,
}: {
  items: SidebarItem[]
  onNavigate?: () => void
  className?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  enableCollapse?: boolean
}) {
  const controlled =
    collapsedControlled !== undefined && onCollapsedChange !== undefined

  const [internalCollapsed, setInternalCollapsed] = useState(false)

  useEffect(() => {
    if (controlled || !enableCollapse) return
    try {
      const v = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (v === '1') setInternalCollapsed(true)
    } catch {
      // ignore
    }
  }, [controlled, enableCollapse])

  const collapsed = enableCollapse
    ? controlled
      ? collapsedControlled!
      : internalCollapsed
    : false

  function setCollapsed(next: boolean) {
    if (!enableCollapse) return
    if (controlled) {
      onCollapsedChange!(next)
    } else {
      setInternalCollapsed(next)
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
    }
  }

  function toggleCollapsed() {
    setCollapsed(!collapsed)
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SidebarItem[]>()
    for (const it of items) {
      const key = it.section ?? 'Main'
      map.set(key, [...(map.get(key) ?? []), it])
    }
    return Array.from(map.entries())
  }, [items])

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-col',
        enableCollapse && collapsed ? 'max-w-[88px]' : 'max-w-none',
        className,
      )}
    >
      <div className="relative overflow-hidden border-b border-slate-200/70 px-4 py-4">
        <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-violet-400/30 via-fuchsia-400/20 to-sky-400/20 blur-2xl" />
        <div className="absolute -right-12 -bottom-16 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/20 via-sky-400/15 to-violet-400/20 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className={cn('min-w-0', enableCollapse && collapsed && 'sr-only')}>
            <div className="text-sm font-semibold tracking-wide text-slate-900">
              Spacehaat Admin
            </div>
            <div className="text-xs text-slate-500">Colorful • Modern • Responsive</div>
          </div>

          {enableCollapse ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className={cn(
                'rounded-xl p-2 text-slate-600 transition',
                'hover:bg-white/70 hover:text-slate-800 hover:ring-1 hover:ring-slate-200',
                collapsed && 'mx-auto',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <span className="text-lg leading-none">{collapsed ? '»' : '«'}</span>
            </button>
          ) : null}
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        {grouped.map(([section, sectionItems]) => (
          <Fragment key={section}>
            <div
              className={cn(
                'px-3 pb-2 pt-4',
                enableCollapse && collapsed && 'sr-only',
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section}
              </div>
            </div>

            <div className="space-y-1">
              {sectionItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition',
                      enableCollapse && collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 text-white shadow-sm shadow-violet-600/15'
                        : 'text-slate-700 hover:bg-white/70 hover:ring-1 hover:ring-slate-200',
                    )
                  }
                  title={enableCollapse && collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      'text-slate-500 group-hover:text-slate-700',
                      'group-aria-[current=page]:text-white',
                    )}
                  />
                  <span
                    className={cn(
                      'min-w-0 truncate',
                      enableCollapse && collapsed && 'sr-only',
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </Fragment>
        ))}
      </nav>
    </div>
  )
}
