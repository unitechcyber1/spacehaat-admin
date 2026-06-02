import { useEffect, useMemo, useState } from 'react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { cn } from '../lib/ui'
import { getMicroLocationsForCityForm } from '../services/locations/microLocation.service'
import type { MicroLocation } from '../services/locations/types'

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export type SearchableLocalityRow = { id?: string; name: string }

type Props = {
  cityId: string
  /** Selected locality name (stored on PG priority slot). */
  value: string
  onChange: (localityName: string) => void
  disabled?: boolean
  buttonClassName?: string
  id?: string
  placeholder?: string
}

function rowName(m: MicroLocation & { _id?: string }): string {
  return (m.name ?? '').trim()
}

export function SearchableLocalitySelect({
  cityId,
  value,
  onChange,
  disabled,
  buttonClassName,
  id,
  placeholder = 'Select locality…',
}: Props) {
  const [query, setQuery] = useState('')
  const debouncedSearch = useDebounced(query, 350)

  useEffect(() => {
    setQuery('')
  }, [cityId])

  const microQ = useQuery({
    queryKey: ['micro-locations-searchable', cityId, debouncedSearch],
    queryFn: () =>
      getMicroLocationsForCityForm(cityId, {
        name: debouncedSearch.trim() ? debouncedSearch : undefined,
      }),
    enabled: !!cityId && !disabled,
    staleTime: 30_000,
  })

  const rows = useMemo(() => {
    const raw = (microQ.data?.data ?? []) as MicroLocation[]
    const seen = new Set<string>()
    const out: SearchableLocalityRow[] = []
    for (const m of raw) {
      const name = rowName(m)
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      out.push({ id: String(m.id ?? (m as { _id?: string })._id ?? ''), name })
    }
    return out
  }, [microQ.data?.data])

  const selectedLabel = value.trim() || placeholder
  const loading = microQ.isLoading || microQ.isFetching

  return (
    <Popover className="relative w-full">
      <PopoverButton
        id={id}
        disabled={disabled || !cityId}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200/90',
          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          buttonClassName,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !value.trim() && 'text-slate-500')}>
          {!cityId ? 'Select city first' : loading && !value ? 'Loading…' : selectedLabel}
        </span>
        <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </PopoverButton>

      <PopoverPanel
        transition
        anchor="bottom start"
        className={cn(
          'z-[100] mt-1 w-[var(--button-width)] min-w-[280px] rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200/80',
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
                placeholder="Search localities…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-auto py-1">
              {!cityId ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">Select a city first.</div>
              ) : loading ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">Loading…</div>
              ) : rows.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">No localities match.</div>
              ) : (
                rows.map((m) => (
                  <button
                    key={m.id || m.name}
                    type="button"
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-violet-50',
                      value.trim().toLowerCase() === m.name.toLowerCase() &&
                        'bg-violet-50 font-medium text-violet-900',
                    )}
                    onClick={() => {
                      onChange(m.name)
                      setQuery('')
                      close()
                    }}
                  >
                    {m.name}
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
