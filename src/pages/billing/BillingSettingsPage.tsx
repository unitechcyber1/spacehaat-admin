import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '../../components/Button'
import { FormSection } from '../../components/FormSection'
import { Field, Input, Textarea } from '../../components/Input'
import { getBillingProfile, updateBillingProfile } from '../../services/billing/billing.service'
import type { BillingProfile } from '../../types/billing'

function emptyProfile(): BillingProfile {
  return {
    bank_details: { address: {} },
    invoice_prefixes: {},
  }
}

export function BillingSettingsPage() {
  const qc = useQueryClient()
  const [profile, setProfile] = useState<BillingProfile>(emptyProfile())

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing', 'profile'],
    queryFn: getBillingProfile,
  })

  useEffect(() => {
    if (!data) return
    setProfile({
      ...data,
      bank_details: {
        ...(data.bank_details ?? {}),
        address: { ...(data.bank_details?.address ?? {}) },
      },
      invoice_prefixes: { ...(data.invoice_prefixes ?? {}) },
    })
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => updateBillingProfile(profile),
    onSuccess: () => {
      toast.success('Billing profile saved')
      qc.invalidateQueries({ queryKey: ['billing', 'profile'] })
      qc.invalidateQueries({ queryKey: ['billing', 'meta'] })
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save')
    },
  })

  const patch = (partial: Partial<BillingProfile>) => setProfile((p) => ({ ...p, ...partial }))

  const patchBank = (partial: NonNullable<BillingProfile['bank_details']>) =>
    setProfile((p) => ({
      ...p,
      bank_details: { ...(p.bank_details ?? {}), ...partial },
    }))

  if (isLoading) return <div className="list-empty py-12">Loading billing profile…</div>
  if (isError) return <div className="list-empty py-12">Failed to load billing profile.</div>

  return (
    <form
      className="page-stack"
      onSubmit={(e) => {
        e.preventDefault()
        saveMut.mutate()
      }}
    >
      <FormSection title="Company details">
        <div className="form-grid">
          <Field label="Legal name">
            <Input
              value={profile.legal_name ?? ''}
              onChange={(e) => patch({ legal_name: e.target.value })}
            />
          </Field>
          <Field label="Trade name">
            <Input
              value={profile.trade_name ?? ''}
              onChange={(e) => patch({ trade_name: e.target.value })}
            />
          </Field>
          <Field label="PAN">
            <Input value={profile.pan ?? ''} onChange={(e) => patch({ pan: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="CIN">
            <Input value={profile.cin ?? ''} onChange={(e) => patch({ cin: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={profile.email ?? ''} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={profile.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} />
          </Field>
          <Field label="Website" className="sm:col-span-2">
            <Input value={profile.website ?? ''} onChange={(e) => patch({ website: e.target.value })} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Defaults">
        <div className="form-grid">
          <Field label="Payment terms (days)">
            <Input
              type="number"
              min={0}
              value={profile.default_payment_terms_days ?? 7}
              onChange={(e) => patch({ default_payment_terms_days: Number(e.target.value) })}
            />
          </Field>
          <Field label="Late payment interest (% p.a.)">
            <Input
              type="number"
              min={0}
              step="any"
              value={profile.default_late_payment_interest_rate ?? 18}
              onChange={(e) => patch({ default_late_payment_interest_rate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Default tax rate (%)">
            <Input
              type="number"
              min={0}
              step="any"
              value={profile.default_tax_rate ?? 18}
              onChange={(e) => patch({ default_tax_rate: Number(e.target.value) })}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Bank details">
        <div className="form-grid">
          <Field label="Account name">
            <Input
              value={profile.bank_details?.account_name ?? ''}
              onChange={(e) => patchBank({ account_name: e.target.value })}
            />
          </Field>
          <Field label="Account number">
            <Input
              value={profile.bank_details?.account_number ?? ''}
              onChange={(e) => patchBank({ account_number: e.target.value })}
            />
          </Field>
          <Field label="IFSC">
            <Input
              value={profile.bank_details?.ifsc ?? ''}
              onChange={(e) => patchBank({ ifsc: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Bank name">
            <Input
              value={profile.bank_details?.bank_name ?? ''}
              onChange={(e) => patchBank({ bank_name: e.target.value })}
            />
          </Field>
          <Field label="Bank address" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={profile.bank_details?.address?.line1 ?? ''}
              onChange={(e) =>
                patchBank({ address: { ...(profile.bank_details?.address ?? {}), line1: e.target.value } })
              }
            />
          </Field>
        </div>
      </FormSection>

      <div>
        <Button type="submit" variant="primary" disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Saving…' : 'Save billing profile'}
        </Button>
      </div>
    </form>
  )
}
