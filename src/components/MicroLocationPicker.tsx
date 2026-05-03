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

type BaseProps = {
  cityId?: string | null
  disabled?: boolean
  placeholder?: string
}

type SingleProps = BaseProps & {
  multiple?: false
  value: string
  onChange: (id: string) => void
}

type MultiProps = BaseProps & {
  multiple: true
  value: string[]
  onChange: (ids: string[]) => void
}

export type MicroLocationPickerProps = SingleProps | MultiProps

function rowId(m: MicroLocation & { _id?: string }) {
  return String(m.id ?? m._id ?? '')
}

export function MicroLocationPicker(props: MicroLocationPickerProps) {
  const multiple = props.multiple === true
  const placeholder =
    props.placeholder ?? (multiple ? 'Select micro-locations…' : 'Select micro-location…')

  const cityId = props.cityId ?? ''
  const disabled = props.disabled

  const valueIds: string[] = multiple ? props.value : props.value ? [props.value] : []
  const selectedSet = useMemo(() => new Set(valueIds.map(String)), [valueIds])

  const [query, setQuery] = useState('')
  const debouncedSearch = useDebounced(query, 350)

  useEffect(() => {
    setQuery('')
  }, [cityId])

  const microQ = useQuery({
    queryKey: ['micro-locations-form', cityId, debouncedSearch],
    queryFn: () =>
      getMicroLocationsForCityForm(cityId, {
        name: debouncedSearch.trim() ? debouncedSearch : undefined,
      }),
    enabled: !!cityId && !disabled,
    staleTime: 30_000,
  })

  const rows = (microQ.data?.data ?? []) as MicroLocation[]

  const [labelById, setLabelById] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!rows.length) return
    setLabelById((prev) => {
      const next = { ...prev }
      for (const m of rows) {
        const id = rowId(m)
        if (id && m.name) next[id] = m.name
      }
      return next
    })
  }, [rows])

  function toggle(id: string) {
    const idStr = String(id)
    if (!multiple) {
      ;(props as SingleProps).onChange(selectedSet.has(idStr) ? '' : idStr)
      return
    }
    const next = new Set(selectedSet)
    if (next.has(idStr)) next.delete(idStr)
    else next.add(idStr)
    ;(props as MultiProps).onChange(Array.from(next))
  }

  let summary: string
  if (multiple) {
    summary =
      valueIds.length === 0 ? placeholder : valueIds.map((id) => labelById[id] ?? id).join(', ')
  } else {
    const v = (props as SingleProps).value
    summary = !v ? placeholder : labelById[v] ?? v
  }

  const loading = microQ.isLoading || microQ.isFetching

  return (
    <Popover className="relative w-full">
      <PopoverButton
        type="button"
        disabled={disabled || !cityId}
        className={cn(
          'flex w-full min-h-[42px] items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm text-slate-900 ring-1 ring-slate-200',
          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span
          className={cn(
            'line-clamp-2 flex-1 break-words',
            (multiple ? valueIds.length === 0 : !(props as SingleProps).value) && 'text-slate-400',
          )}
        >
          {summary}
        </span>
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
            placeholder="Search micro-locations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="max-h-56 overflow-auto py-1">
          {!cityId ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">Select a city first.</div>
          ) : loading ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">No micro-locations match.</div>
          ) : (
            rows.map((m) => {
              const idStr = rowId(m)
              if (!idStr) return null
              const checked = selectedSet.has(idStr)
              return (
                <label
                  key={idStr}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-violet-50"
                >
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    name={multiple ? undefined : 'micro-location-picker'}
                    className={cn(
                      multiple ? 'h-4 w-4 rounded border-slate-300' : 'h-4 w-4 border-slate-300',
                      'text-violet-600 focus:ring-violet-500',
                    )}
                    checked={checked}
                    onChange={() => toggle(idStr)}
                  />
                  <span className="text-slate-800">{m.name}</span>
                </label>
              )
            })
          )}
        </div>

        {multiple && valueIds.length > 0 ? (
          <div className="flex justify-end border-t border-slate-100 px-2 pt-2">
            <button
              type="button"
              className="text-xs font-semibold text-violet-700 hover:text-violet-900"
              onClick={() => (props as MultiProps).onChange([])}
            >
              Clear all
            </button>
          </div>
        ) : null}
      </PopoverPanel>
    </Popover>
  )
}
