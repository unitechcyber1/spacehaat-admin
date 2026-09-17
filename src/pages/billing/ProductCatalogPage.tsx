import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FormSection } from '../../components/FormSection'
import { IconAction } from '../../components/IconAction'
import { Field, Input, Select } from '../../components/Input'
import { ListFilterCard } from '../../components/ListFilterCard'
import { Modal } from '../../components/Modal'
import { Table, Td, Th, Tr } from '../../components/Table'
import { filterLabelClass } from '../../lib/listPageUi'
import {
  deleteProductCatalogItem,
  getProductCatalog,
  saveProductCatalogItem,
  seedProductCatalog,
} from '../../services/billing/billing.service'
import type { ProductCatalogItem } from '../../types/billing'
import { BILLING_SPACE_TYPES, formatInr } from './billingHelpers'

function emptyItem(): ProductCatalogItem {
  return {
    sku: '',
    name: '',
    space_type: 'Coworking Space',
    category: 'service',
    unit: 'flat',
    default_rate: 0,
    tax_rate: 18,
    hsn_sac: '997212',
    enabled: true,
  }
}

export function ProductCatalogPage() {
  const qc = useQueryClient()
  const [spaceTypeFilter, setSpaceTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProductCatalogItem>(emptyItem())
  const [deleteTarget, setDeleteTarget] = useState<ProductCatalogItem | null>(null)

  const params: Record<string, string> = { enabled: 'true' }
  if (spaceTypeFilter) params.space_type = spaceTypeFilter

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'product-catalog', params],
    queryFn: async () => {
      const res = await getProductCatalog(params)
      return (res.data ?? []) as ProductCatalogItem[]
    },
  })

  const saveMut = useMutation({
    mutationFn: () => saveProductCatalogItem(editing),
    onSuccess: () => {
      toast.success('Catalog item saved')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['billing', 'product-catalog'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductCatalogItem(id),
    onSuccess: () => {
      toast.success('Deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['billing', 'product-catalog'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to delete')
    },
  })

  const seedMut = useMutation({
    mutationFn: seedProductCatalog,
    onSuccess: () => {
      toast.success('Default catalog seeded')
      qc.invalidateQueries({ queryKey: ['billing', 'product-catalog'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to seed catalog')
    },
  })

  const rows = data ?? []

  return (
    <>
      <ListFilterCard
        description="Product SKUs used when adding invoice line items."
        onReset={() => setSpaceTypeFilter('')}
      >
        <div>
          <label className={filterLabelClass} htmlFor="cat-space">Space type</label>
          <Select
            id="cat-space"
            value={spaceTypeFilter}
            onChange={(e) => setSpaceTypeFilter(e.target.value)}
          >
            <option value="">All space types</option>
            {BILLING_SPACE_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      </ListFilterCard>

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={seedMut.isPending} onClick={() => seedMut.mutate()}>
          Seed defaults
        </Button>
        <Button variant="primary" size="sm" onClick={() => { setEditing(emptyItem()); setShowForm(true) }}>
          <PlusIcon className="mr-1 h-4 w-4" aria-hidden />
          Add SKU
        </Button>
      </div>

      <Table>
        <thead className="bg-surface-2">
          <tr>
            <Th>SKU</Th>
            <Th>Name</Th>
            <Th>Space type</Th>
            <Th>Category</Th>
            <Th>Unit</Th>
            <Th className="text-right">Rate</Th>
            <Th className="text-right">Tax %</Th>
            <Th>Enabled</Th>
            <Th className="text-center">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <Tr><Td colSpan={9} className="list-empty">Loading…</Td></Tr>
          ) : isError ? (
            <Tr><Td colSpan={9} className="list-empty">Failed to load catalog.</Td></Tr>
          ) : rows.length === 0 ? (
            <Tr><Td colSpan={9} className="list-empty"><strong>No catalog items</strong>Seed defaults or add a SKU.</Td></Tr>
          ) : (
            rows.map((row) => {
              const id = String(row._id ?? row.id ?? row.sku)
              return (
                <Tr key={id}>
                  <Td className="align-middle font-medium tnum">{row.sku}</Td>
                  <Td className="align-middle">{row.name}</Td>
                  <Td className="align-middle text-sm">{row.space_type}</Td>
                  <Td className="align-middle text-muted">{row.category ?? '—'}</Td>
                  <Td className="align-middle text-muted">{row.unit ?? '—'}</Td>
                  <Td className="align-middle text-right tnum">{formatInr(row.default_rate)}</Td>
                  <Td className="align-middle text-right tnum">{row.tax_rate ?? '—'}</Td>
                  <Td className="align-middle">{row.enabled !== false ? 'Yes' : 'No'}</Td>
                  <Td className="align-middle">
                    <div className="table-actions">
                      <IconAction label="Edit" onClick={() => { setEditing({ ...row }); setShowForm(true) }}>
                        <PencilSquareIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                      <IconAction label="Delete" tone="rose" onClick={() => setDeleteTarget(row)}>
                        <TrashIcon className="h-5 w-5" aria-hidden />
                      </IconAction>
                    </div>
                  </Td>
                </Tr>
              )
            })
          )}
        </tbody>
      </Table>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing._id || editing.id ? 'Edit catalog item' : 'Add catalog item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={saveMut.isPending}
              onClick={() => {
                if (!editing.sku || !editing.name) {
                  toast.error('SKU and name are required')
                  return
                }
                saveMut.mutate()
              }}
            >
              {saveMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <FormSection>
          <div className="form-grid">
            <Field label="SKU" required>
              <Input value={editing.sku} onChange={(e) => setEditing((x) => ({ ...x, sku: e.target.value }))} />
            </Field>
            <Field label="Name" required>
              <Input value={editing.name} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} />
            </Field>
            <Field label="Space type">
              <Select
                value={editing.space_type}
                onChange={(e) => setEditing((x) => ({ ...x, space_type: e.target.value }))}
              >
                {BILLING_SPACE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Input value={editing.category ?? ''} onChange={(e) => setEditing((x) => ({ ...x, category: e.target.value }))} />
            </Field>
            <Field label="Unit">
              <Input value={editing.unit ?? ''} onChange={(e) => setEditing((x) => ({ ...x, unit: e.target.value }))} />
            </Field>
            <Field label="Default rate (₹)">
              <Input
                type="number"
                min={0}
                step="any"
                value={editing.default_rate ?? 0}
                onChange={(e) => setEditing((x) => ({ ...x, default_rate: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Tax rate (%)">
              <Input
                type="number"
                min={0}
                step="any"
                value={editing.tax_rate ?? 18}
                onChange={(e) => setEditing((x) => ({ ...x, tax_rate: Number(e.target.value) }))}
              />
            </Field>
            <Field label="HSN/SAC">
              <Input value={editing.hsn_sac ?? ''} onChange={(e) => setEditing((x) => ({ ...x, hsn_sac: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.enabled !== false}
                onChange={(e) => setEditing((x) => ({ ...x, enabled: e.target.checked }))}
              />
              Enabled
            </label>
          </div>
        </FormSection>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete SKU?"
        description={deleteTarget ? deleteTarget.sku : undefined}
        confirmText={deleteMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const id = String(deleteTarget?._id ?? deleteTarget?.id ?? '')
          if (id) deleteMut.mutate(id)
        }}
      />
    </>
  )
}
