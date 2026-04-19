import { useMemo, useState } from 'react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { cn } from '../lib/ui'

export type SearchableCityRow = { id: string; name?: string }

type Props = {
  cities: SearchableCityRow[]
  /** Selected city id, or empty string for “all”. */
  value: string
  onChange: (cityId: string) => void
  disabled?: boolean
  loading?: boolean
  /** Applied to the trigger button (match surrounding filter controls). */
  buttonClassName?: string
  id?: string
  'aria-labelledby'?: string
}

export function SearchableCitySelect({
  cities,
  value,
  onChange,
  disabled,
  loading,
  buttonClassName,
  id,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => (c.name ?? '').toLowerCase().includes(q))
  }, [cities, query])

  const selectedName =
    value === '' ? 'All cities' : cities.find((c) => String(c.id) === String(value))?.name ?? 'All cities'

  return (
    <Popover className="relative w-full">
      <PopoverButton
        id={id}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled || loading}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90',
          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          buttonClassName,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', value === '' && 'text-slate-700')}>
          {loading ? 'Loading…' : selectedName}
        </span>
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </PopoverButton>

      <PopoverPanel
        transition
        anchor="bottom start"
        className={cn(
          'z-[100] mt-1 w-[var(--button-width)] min-w-[260px] rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200/80',
          'transition data-[closed]:data-[leave]:opacity-0 data-[closed]:data-[leave]:duration-100 data-[enter]:duration-100',
        )}
      >
        {({ close }) => (
          <>
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
            <div className="max-h-60 overflow-auto py-1">
              <button
                type="button"
                className={cn(
                  'flex w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-violet-50',
                  value === '' && 'bg-violet-50/70 font-medium text-violet-900',
                )}
                onClick={() => {
                  onChange('')
                  setQuery('')
                  close()
                }}
              >
                All cities
              </button>
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">No cities match.</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-violet-50',
                      String(value) === String(c.id) && 'bg-violet-50 font-medium text-violet-900',
                    )}
                    onClick={() => {
                      onChange(c.id)
                      setQuery('')
                      close()
                    }}
                  >
                    {c.name?.trim() ? c.name : c.id}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  )
}
