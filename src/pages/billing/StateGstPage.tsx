import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FormSection } from '../../components/FormSection'
import { IconAction } from '../../components/IconAction'
import { Field, Input, Select } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { Table, Td, Th, Tr } from '../../components/Table'
import { deleteStateProfile, getStateProfiles, saveStateProfile } from '../../services/billing/billing.service'
import type { StateGstProfile } from '../../types/billing'
import { INDIAN_STATE_CODES, stateLabel } from './billingHelpers'

function emptyProfile(): StateGstProfile {
  return {
    state_code: '',
    state: '',
    gstin: '',
    address: {},
    is_default: false,
  }
}

export function StateGstPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StateGstProfile>(emptyProfile())
  const [deleteTarget, setDeleteTarget] = useState<StateGstProfile | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'state-profiles'],
    queryFn: async () => {
      const res = await getStateProfiles()
      return (res.data ?? []) as StateGstProfile[]
    },
  })

  const saveMut = useMutation({
    mutationFn: () => saveStateProfile(editing),
    onSuccess: () => {
      toast.success('State GST profile saved')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['billing', 'state-profiles'] })
      qc.invalidateQueries({ queryKey: ['billing', 'meta'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (stateCode: string) => deleteStateProfile(stateCode),
    onSuccess: () => {
      toast.success('Deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['billing', 'state-profiles'] })
      qc.invalidateQueries({ queryKey: ['billing', 'meta'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to delete')
    },
  })

  const openAdd = () => {
    setEditing(emptyProfile())
    setShowForm(true)
  }

  const openEdit = (row: StateGstProfile) => {
    setEditing({ ...row, address: { ...(row.address ?? {}) } })
    setShowForm(true)
  }

  const onStateCodeChange = (code: string) => {
    const hit = INDIAN_STATE_CODES.find((s) => s.code === code)
    setEditing((e) => ({
      ...e,
      state_code: code,
      state: hit?.name ?? e.state,
    }))
  }

  const rows = data ?? []

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={openAdd}>
          <PlusIcon className="mr-1 h-4 w-4" aria-hidden />
          Add state profile
        </Button>
      </div>

      <Table>
        <thead className="bg-surface-2">
          <tr>
            <Th>State</Th>
            <Th>Code</Th>
            <Th>GSTIN</Th>
            <Th>City</Th>
            <Th>Default</Th>
            <Th className="text-center">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <Tr><Td colSpan={6} className="list-empty">Loading…</Td></Tr>
          ) : isError ? (
            <Tr><Td colSpan={6} className="list-empty">Failed to load state profiles.</Td></Tr>
          ) : rows.length === 0 ? (
            <Tr><Td colSpan={6} className="list-empty"><strong>No state profiles</strong>Add GST registration for each state.</Td></Tr>
          ) : (
            rows.map((row) => (
              <Tr key={row.state_code}>
                <Td className="align-middle">{row.state}</Td>
                <Td className="align-middle tnum">{row.state_code}</Td>
                <Td className="align-middle tnum text-sm">{row.gstin}</Td>
                <Td className="align-middle text-muted">{row.address?.city ?? '—'}</Td>
                <Td className="align-middle">{row.is_default ? 'Yes' : '—'}</Td>
                <Td className="align-middle">
                  <div className="table-actions">
                    <IconAction label="Edit" onClick={() => openEdit(row)}>
                      <PencilSquareIcon className="h-5 w-5" aria-hidden />
                    </IconAction>
                    <IconAction label="Delete" tone="rose" onClick={() => setDeleteTarget(row)}>
                      <TrashIcon className="h-5 w-5" aria-hidden />
                    </IconAction>
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing.state_code && rows.some((r) => r.state_code === editing.state_code) ? 'Edit state GST' : 'Add state GST'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={saveMut.isPending}
              onClick={() => {
                if (!editing.state_code || !editing.gstin) {
                  toast.error('State code and GSTIN are required')
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
            <Field label="State" required>
              <Select
                value={editing.state_code}
                onChange={(e) => onStateCodeChange(e.target.value)}
              >
                <option value="">Select state</option>
                {INDIAN_STATE_CODES.map((s) => (
                  <option key={s.code} value={s.code}>{stateLabel(s.code)}</option>
                ))}
              </Select>
            </Field>
            <Field label="GSTIN" required>
              <Input
                value={editing.gstin}
                onChange={(e) => setEditing((x) => ({ ...x, gstin: e.target.value.toUpperCase() }))}
              />
            </Field>
            <Field label="City">
              <Input
                value={editing.address?.city ?? ''}
                onChange={(e) =>
                  setEditing((x) => ({
                    ...x,
                    address: { ...(x.address ?? {}), city: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={editing.address?.pincode ?? ''}
                onChange={(e) =>
                  setEditing((x) => ({
                    ...x,
                    address: { ...(x.address ?? {}), pincode: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Address line 1" className="sm:col-span-2">
              <Input
                value={editing.address?.line1 ?? ''}
                onChange={(e) =>
                  setEditing((x) => ({
                    ...x,
                    address: { ...(x.address ?? {}), line1: e.target.value },
                  }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={!!editing.is_default}
                onChange={(e) => setEditing((x) => ({ ...x, is_default: e.target.checked }))}
              />
              Default seller state for new invoices
            </label>
          </div>
        </FormSection>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete state profile?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.state} (${deleteTarget.state_code})?`
            : undefined
        }
        confirmText={deleteMut.isPending ? 'Deleting…' : 'Delete'}
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.state_code)}
      />
    </>
  )
}
