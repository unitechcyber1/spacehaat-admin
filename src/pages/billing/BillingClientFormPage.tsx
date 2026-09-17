import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { FormSection } from '../../components/FormSection'
import { Field, Input, Select, Textarea } from '../../components/Input'
import { PageShell } from '../../components/PageShell'
import {
  createBillingClient,
  getBillingClient,
  updateBillingClient,
} from '../../services/billing/billingClient.service'
import type { BillingClient } from '../../types/billing'
import {
  BILLING_SPACE_TYPES,
  INDIAN_STATE_CODES,
  billingClientRecordId,
  emptyBillingClient,
  syncPlaceOfSupplyFromStateCode,
} from './billingHelpers'

export function BillingClientFormPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(clientId && clientId !== 'new')

  const existingQ = useQuery({
    queryKey: ['billing-client', clientId],
    queryFn: () => getBillingClient(clientId!),
    enabled: isEdit,
  })

  const [model, setModel] = useState<BillingClient>(emptyBillingClient())
  const [clientType, setClientType] = useState<'b2b' | 'b2c'>('b2b')

  useEffect(() => {
    if (!isEdit) {
      setModel(emptyBillingClient())
      setClientType('b2b')
    }
  }, [isEdit])

  useEffect(() => {
    if (!isEdit || !existingQ.data) return
    const row = existingQ.data
    setModel({
      ...emptyBillingClient(),
      ...row,
      billing_address: { ...(row.billing_address ?? {}) },
      shipping_address: { ...(row.shipping_address ?? {}) },
    })
    setClientType(row.is_gst_registered !== false && (row.gstin || row.company_name) ? 'b2b' : 'b2c')
  }, [isEdit, existingQ.data])

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { ...model }
      if (isEdit) return updateBillingClient(clientId!, payload)
      return createBillingClient(payload)
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'Client updated' : 'Client created')
      qc.invalidateQueries({ queryKey: ['billing-clients'] })
      const id = billingClientRecordId(res.data)
      navigate(id ? `/layout/billing/clients/${id}` : '/layout/billing/clients')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Save failed')
    },
  })

  const patch = (partial: Partial<BillingClient>) => setModel((m) => ({ ...m, ...partial }))

  const patchAddress = (partial: NonNullable<BillingClient['billing_address']>) =>
    setModel((m) => ({
      ...m,
      billing_address: { ...(m.billing_address ?? {}), ...partial },
    }))

  const patchShipping = (partial: NonNullable<BillingClient['shipping_address']>) =>
    setModel((m) => ({
      ...m,
      shipping_address: { ...(m.shipping_address ?? {}), ...partial },
    }))

  const onStateCodeChange = (code: string) => {
    const next = { ...model }
    syncPlaceOfSupplyFromStateCode(code, next)
    setModel({ ...next })
  }

  const onShipToStateChange = (code: string) => {
    const hit = INDIAN_STATE_CODES.find((s) => s.code === code)
    if (!hit) return
    patchShipping({ state: hit.name, state_code: hit.code })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!model.billing_name.trim()) {
      toast.error('Billing name is required')
      return
    }
    saveMut.mutate()
  }

  return (
    <PageShell
      title={isEdit ? 'Edit billing client' : 'Add billing client'}
      description="GST billing profile used on invoices."
      actions={
        <Button variant="ghost" onClick={() => navigate('/layout/billing/clients')}>
          <ArrowLeftIcon className="mr-1.5 h-4 w-4" aria-hidden />
          Back to clients
        </Button>
      }
    >
      <form className="page-stack" onSubmit={onSubmit}>
        <FormSection title="Client type">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={clientType === 'b2b' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setClientType('b2b')
                patch({ is_gst_registered: true })
              }}
            >
              B2B (GST registered)
            </Button>
            <Button
              type="button"
              variant={clientType === 'b2c' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setClientType('b2c')
                patch({ is_gst_registered: false, gstin: '', company_name: '' })
              }}
            >
              B2C (Individual)
            </Button>
          </div>
        </FormSection>

        <FormSection title="Contact">
          <div className="form-grid">
            <Field label="Billing name" required>
              <Input
                value={model.billing_name}
                onChange={(e) => patch({ billing_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Company name">
              <Input
                value={model.company_name ?? ''}
                onChange={(e) => patch({ company_name: e.target.value })}
                disabled={clientType === 'b2c'}
              />
            </Field>
            <Field label="Billing email">
              <Input
                type="email"
                value={model.billing_email ?? ''}
                onChange={(e) => patch({ billing_email: e.target.value })}
              />
            </Field>
            <Field label="Billing phone">
              <Input
                value={model.billing_phone ?? ''}
                onChange={(e) => patch({ billing_phone: e.target.value })}
              />
            </Field>
            {clientType === 'b2b' ? (
              <>
                <Field label="GSTIN">
                  <Input
                    value={model.gstin ?? ''}
                    onChange={(e) => patch({ gstin: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label="PAN">
                  <Input
                    value={model.pan ?? ''}
                    onChange={(e) => patch({ pan: e.target.value.toUpperCase() })}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Default space type">
              <Select
                value={model.default_space_type ?? 'Coworking Space'}
                onChange={(e) => patch({ default_space_type: e.target.value })}
              >
                {BILLING_SPACE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={model.status ?? 'active'}
                onChange={(e) => patch({ status: e.target.value as BillingClient['status'] })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Billing address">
          <div className="form-grid">
            <Field label="Address line 1" className="sm:col-span-2">
              <Input
                value={model.billing_address?.line1 ?? ''}
                onChange={(e) => patchAddress({ line1: e.target.value })}
              />
            </Field>
            <Field label="Address line 2" className="sm:col-span-2">
              <Input
                value={model.billing_address?.line2 ?? ''}
                onChange={(e) => patchAddress({ line2: e.target.value })}
              />
            </Field>
            <Field label="City">
              <Input
                value={model.billing_address?.city ?? ''}
                onChange={(e) => patchAddress({ city: e.target.value })}
              />
            </Field>
            <Field label="State (GST code)">
              <Select
                value={model.place_of_supply_state_code ?? model.billing_address?.state_code ?? ''}
                onChange={(e) => onStateCodeChange(e.target.value)}
              >
                <option value="">Select state</option>
                {INDIAN_STATE_CODES.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Pincode">
              <Input
                value={model.billing_address?.pincode ?? ''}
                onChange={(e) => patchAddress({ pincode: e.target.value })}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Ship to">
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={model.ship_to_same_as_billing !== false}
              onChange={(e) => patch({ ship_to_same_as_billing: e.target.checked })}
            />
            Same as billing address
          </label>
          {model.ship_to_same_as_billing === false ? (
            <div className="form-grid">
              <Field label="Ship to name">
                <Input
                  value={model.ship_to_name ?? ''}
                  onChange={(e) => patch({ ship_to_name: e.target.value })}
                />
              </Field>
              <Field label="Ship to company">
                <Input
                  value={model.ship_to_company_name ?? ''}
                  onChange={(e) => patch({ ship_to_company_name: e.target.value })}
                />
              </Field>
              <Field label="Ship to email">
                <Input
                  value={model.ship_to_email ?? ''}
                  onChange={(e) => patch({ ship_to_email: e.target.value })}
                />
              </Field>
              <Field label="Ship to phone">
                <Input
                  value={model.ship_to_phone ?? ''}
                  onChange={(e) => patch({ ship_to_phone: e.target.value })}
                />
              </Field>
              <Field label="Ship to GSTIN">
                <Input
                  value={model.ship_to_gstin ?? ''}
                  onChange={(e) => patch({ ship_to_gstin: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Shipping city">
                <Input
                  value={model.shipping_address?.city ?? ''}
                  onChange={(e) => patchShipping({ city: e.target.value })}
                />
              </Field>
              <Field label="Shipping state">
                <Select
                  value={model.shipping_address?.state_code ?? ''}
                  onChange={(e) => onShipToStateChange(e.target.value)}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATE_CODES.map((s) => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Shipping pincode">
                <Input
                  value={model.shipping_address?.pincode ?? ''}
                  onChange={(e) => patchShipping({ pincode: e.target.value })}
                />
              </Field>
            </div>
          ) : null}
        </FormSection>

        <FormSection title="Notes">
          <Field label="Internal notes">
            <Textarea
              rows={3}
              value={model.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
        </FormSection>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={saveMut.isPending || existingQ.isLoading}>
            {saveMut.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/layout/billing/clients')}>
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
