import { useMemo, useState } from 'react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { cn } from '../lib/ui'

export type CityOption = { id: string; name: string }

export function CityMultiSelect({
  cities,
  value,
  onChange,
  disabled,
  loading,
  placeholder = 'Select cities…',
}: {
  cities: CityOption[]
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => c.name.toLowerCase().includes(q))
  }, [cities, query])

  const selectedSet = useMemo(() => new Set(value.map(String)), [value])

  function toggle(id: string) {
    const idStr = String(id)
    const next = new Set(selectedSet)
    if (next.has(idStr)) next.delete(idStr)
    else next.add(idStr)
    onChange(Array.from(next))
  }

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? cities.find((c) => String(c.id) === String(value[0]))?.name ?? `${value.length} selected`
        : `${value.length} cities selected`

  return (
    <Popover className="relative w-full">
      <PopoverButton
        disabled={disabled || loading}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm text-slate-900 ring-1 ring-slate-200',
          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className={cn('truncate', value.length === 0 && 'text-slate-400')}>{summary}</span>
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </PopoverButton>

      <PopoverPanel
        transition
        anchor="bottom start"
        className={cn(
          'z-50 mt-1 w-[var(--button-width)] min-w-[280px] rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200/80 transition',
          'data-[closed]:data-[leave]:opacity-0 data-[closed]:data-[leave]:duration-100 data-[enter]:duration-100 data-[enter]:ease-out',
        )}
      >
        <div className="relative border-b border-slate-100 px-2 pb-2">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Search cities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="max-h-56 overflow-auto py-1">
          {loading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">Loading cities…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">No cities match.</div>
          ) : (
            filtered.map((c) => {
              const idStr = String(c.id)
              const checked = selectedSet.has(idStr)
              return (
                <label
                  key={idStr}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-violet-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={checked}
                    onChange={() => toggle(idStr)}
                  />
                  <span className="text-slate-800">{c.name}</span>
                </label>
              )
            })
          )}
        </div>

        {value.length > 0 ? (
          <div className="flex justify-end border-t border-slate-100 px-2 pt-2">
            <button
              type="button"
              className="text-xs font-semibold text-violet-700 hover:text-violet-900"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </div>
        ) : null}
      </PopoverPanel>
    </Popover>
  )
}
