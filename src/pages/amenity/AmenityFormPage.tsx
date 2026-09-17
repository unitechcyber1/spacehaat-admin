import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { FormSection } from '../../components/FormSection'
import { PageShell } from '../../components/PageShell'
import { filterLabelClass } from '../../lib/listPageUi'
import { getAmenities, saveAmenity } from '../../services/amenity/amenity.service'
import type { AmenityCategory, AmenityRecord } from '../../services/amenity/types'

const CATEGORIES: { value: AmenityCategory; label: string }[] = [
  { value: 'facilities', label: 'Facility' },
  { value: 'recreational', label: 'Re-creational' },
  { value: 'others', label: 'Others' },
]

function emptyAmenity(): AmenityRecord {
  return {
    name: '',
    category: 'facilities',
    for_coWorking: false,
    for_office: false,
    for_coLiving: false,
    for_flatspace: false,
    for_builder_project: false,
  }
}

function amenityRowId(a: AmenityRecord): string {
  return String(a.id ?? a._id ?? '')
}

async function fetchAmenityByIdScan(amenityId: string): Promise<AmenityRecord | null> {
  let page = 1
  const limit = 100
  for (let i = 0; i < 50; i++) {
    const res = await getAmenities({ limit, page })
    const rows = res.data ?? []
    const found = rows.find((r) => String(r.id ?? r._id) === amenityId)
    if (found) return found
    const total = res.totalRecords ?? 0
    if (rows.length === 0 || page * limit >= total) break
    page += 1
  }
  return null
}

export function AmenityFormPage() {
  const { amentyId } = useParams<{ amentyId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(amentyId)

  const existingQ = useQuery({
    queryKey: ['amenity', 'one', amentyId],
    queryFn: async () => {
      const row = await fetchAmenityByIdScan(amentyId!)
      if (!row) throw new Error('Not found')
      return row
    },
    enabled: isEdit,
  })

  const [form, setForm] = useState<AmenityRecord>(emptyAmenity)

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyAmenity())
      return
    }
    const row = existingQ.data
    if (!row) return
    setForm({
      ...emptyAmenity(),
      ...row,
      category: (row.category as AmenityCategory) || 'facilities',
    })
  }, [isEdit, existingQ.data])

  const saveMut = useMutation({
    mutationFn: (payload: AmenityRecord) => saveAmenity(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Amenity updated' : 'Amenity created')
      qc.invalidateQueries({ queryKey: ['amenities'] })
      navigate('/layout/amenty')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed'),
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name?.trim()) {
      toast.error('Name is required.')
      return
    }
    const payload: AmenityRecord = { ...form, name: form.name.trim() }
    if (isEdit && existingQ.data) {
      const id = amenityRowId(existingQ.data)
      if (id) payload.id = id
    }
    saveMut.mutate(payload)
  }

  const title = isEdit ? 'Edit amenity' : 'Add amenity'
  const showLoading = isEdit && existingQ.isLoading
  const showError = isEdit && existingQ.isError
  const showForm = !isEdit || existingQ.isSuccess

  const selectClass =
    'mt-1 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/90 focus:outline-none focus:ring-2 focus:ring-violet-500'

  return (
    <PageShell
      title={title}
      description="Name, category, and scope flags — same fields as the legacy Angular dialog."
      actions={
        <Button type="button" variant="secondary" onClick={() => navigate('/layout/amenty')}>
          Back to list
        </Button>
      }
    >
      {showLoading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : showError ? (
        <p className="text-sm text-rose-600">Could not load this amenity.</p>
      ) : showForm ? (
        <form onSubmit={onSubmit} className="form-page narrow">
          <FormSection title="Details" description="Name and category for this amenity.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={filterLabelClass} htmlFor="amenity-name">
                  Name <span className="text-expired">*</span>
                </label>
                <Input
                  id="amenity-name"
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                  required
                />
              </div>
              <div>
                <label className={filterLabelClass} htmlFor="amenity-category">
                  Category
                </label>
                <select
                  id="amenity-category"
                  className={selectClass.replace('mt-1 ', '')}
                  value={form.category ?? 'facilities'}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AmenityCategory }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Apply to" description="Choose which listing types can use this amenity.">
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['for_coWorking', 'Coworking'],
                  ['for_office', 'Office / commercial'],
                  ['for_coLiving', 'Coliving'],
                  ['for_flatspace', 'Flat / residential'],
                  ['for_builder_project', 'Builder project'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={Boolean(form[key])}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </FormSection>

          <div className="form-actions-bar">
            <Button type="button" variant="secondary" onClick={() => navigate('/layout/amenty')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saveMut.isPending}>
              {isEdit ? 'Save changes' : 'Add amenity'}
            </Button>
          </div>
        </form>
      ) : null}
    </PageShell>
  )
}
