import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getInvoiceAnalytics } from '../../services/billing/billing.service'
import type { InvoiceAnalyticsMonth, InvoiceAnalyticsSpace } from '../../types/billing'
import { BillingBadge } from './BillingBadge'
import {
  fmtDocDate,
  formatInr,
  invoiceStatusBadgeClass,
  invoiceStatusLabel,
  spaceTypeChipClass,
} from './billingHelpers'

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i)

function formatCompact(value: number): string {
  const n = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (n >= 10_000_000) return `${sign}₹${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `${sign}₹${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `${sign}₹${(n / 1_000).toFixed(1)}k`
  return formatInr(value)
}

function MonthChart({ months }: { months: InvoiceAnalyticsMonth[] }) {
  const max = Math.max(...months.map((m) => Math.max(m.billed, m.collected)), 1)
  const width = 720
  const height = 180
  const padLeft = 8
  const group = (width - padLeft) / months.length
  const bar = Math.min(16, group * 0.28)

  return (
    <svg viewBox={`0 0 ${width} ${height + 28}`} className="an-chart" role="img" aria-label="Monthly billed and collected revenue">
      {months.map((month, i) => {
        const x = padLeft + i * group + group * 0.18
        const billedH = month.billed > 0 ? Math.max(2, (month.billed / max) * (height - 8)) : 0
        const paidH = month.collected > 0 ? Math.max(2, (month.collected / max) * (height - 8)) : 0
        return (
          <g key={month.key}>
            <rect
              x={x}
              y={height - billedH}
              width={bar}
              height={billedH}
              rx={3}
              className="an-bar-billed"
            >
              <title>{`${month.label}: billed ${formatInr(month.billed)}`}</title>
            </rect>
            <rect
              x={x + bar + 4}
              y={height - paidH}
              width={bar}
              height={paidH}
              rx={3}
              className="an-bar-paid"
            >
              <title>{`${month.label}: collected ${formatInr(month.collected)}`}</title>
            </rect>
            <text x={x + bar} y={height + 18} textAnchor="middle" className="an-axis">
              {month.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SpaceBars({ spaces }: { spaces: InvoiceAnalyticsSpace[] }) {
  const max = Math.max(...spaces.map((s) => s.billed), 1)
  if (!spaces.length) {
    return <p className="an-empty">No billed invoices for this year yet.</p>
  }
  return (
    <div className="an-bars">
      {spaces.map((space) => {
        const paidPct = (space.collected / max) * 100
        const duePct = ((space.pending + space.overdue) / max) * 100
        return (
          <div key={space.space_type} className="an-bar-row">
            <div className="an-bar-label">{space.space_type}</div>
            <div className="an-track" title={`Collected ${formatInr(space.collected)} · Still due ${formatInr(space.pending + space.overdue)}`}>
              <span className="an-fill-paid" style={{ width: `${paidPct}%` }} />
              <span className="an-fill-due" style={{ width: `${duePct}%` }} />
            </div>
            <div className="an-bar-value">{formatCompact(space.billed)}</div>
          </div>
        )
      })}
    </div>
  )
}

export function BillingAnalyticsPage() {
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['billing', 'analytics', year],
    queryFn: () => getInvoiceAnalytics(year),
    staleTime: 15_000,
  })

  const summary = data?.summary
  const statusTotal = (summary?.collected ?? 0) + (summary?.pendingAmount ?? 0) + (summary?.overdueAmount ?? 0)
  const paidShare = statusTotal > 0 ? (summary!.collected / statusTotal) * 100 : 0
  const pendingShare = statusTotal > 0 ? (summary!.pendingAmount / statusTotal) * 100 : 0
  const overdueShare = statusTotal > 0 ? (summary!.overdueAmount / statusTotal) * 100 : 0

  const hasYearActivity = useMemo(
    () => (summary?.invoiceCount ?? 0) + (summary?.draftCount ?? 0) > 0,
    [summary],
  )

  return (
    <>
      <div className="bill-toolbar-card">
        <div className="bill-filters">
          <label className="bill-filter">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Year"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <p className="an-toolbar-note">
            Collected is money received. Pending is issued or sent and not yet due as overdue. Overdue is still unpaid past the due date.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bill-table-card"><div className="bill-empty">Loading revenue…</div></div>
      ) : isError ? (
        <div className="bill-table-card"><div className="bill-empty">{(error as Error)?.message ?? 'Failed to load analytics'}</div></div>
      ) : summary ? (
        <>
          <div className="an-kpis">
            <article className="an-kpi">
              <span>Collected</span>
              <strong>{formatInr(summary.collected)}</strong>
              <em>{summary.paidCount} paid invoice{summary.paidCount === 1 ? '' : 's'}</em>
            </article>
            <article className="an-kpi">
              <span>Billed</span>
              <strong>{formatInr(summary.billed)}</strong>
              <em>{summary.collectionRate}% collected</em>
            </article>
            <article className="an-kpi">
              <span>Pending</span>
              <strong>{formatInr(summary.pendingAmount)}</strong>
              <em>{summary.pendingCount} invoice{summary.pendingCount === 1 ? '' : 's'} awaiting payment</em>
            </article>
            <article className="an-kpi an-kpi-alert">
              <span>Overdue</span>
              <strong>{formatInr(summary.overdueAmount)}</strong>
              <em>{summary.overdueCount} invoice{summary.overdueCount === 1 ? '' : 's'} past due</em>
            </article>
          </div>

          <div className="an-split">
            <section className="an-card">
              <header className="an-card-head">
                <div>
                  <h2>Revenue by month</h2>
                  <p>Grey is billed that month. Green is collected on the payment date.</p>
                </div>
                <div className="an-legend">
                  <span><i className="an-swatch billed" /> Billed</span>
                  <span><i className="an-swatch paid" /> Collected</span>
                </div>
              </header>
              {hasYearActivity ? <MonthChart months={data?.months ?? []} /> : <p className="an-empty">No invoices in {year}.</p>}
              <div className="bill-table-scroll">
                <table className="bill-table an-mini-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="bill-td-num">Billed</th>
                      <th className="bill-td-num">Collected</th>
                      <th className="bill-td-num">Outstanding</th>
                      <th className="bill-td-num">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.months ?? []).filter((m) => m.count > 0).length === 0 ? (
                      <tr><td colSpan={5} className="bill-empty">No billed months in {year}.</td></tr>
                    ) : (
                      (data?.months ?? []).filter((m) => m.count > 0).map((month) => (
                        <tr key={month.key}>
                          <td>{month.label} {year}</td>
                          <td className="bill-td-num">{formatInr(month.billed)}</td>
                          <td className="bill-td-num">{formatInr(month.collected)}</td>
                          <td className="bill-td-num">{formatInr(month.outstanding)}</td>
                          <td className="bill-td-num">{month.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="an-card">
              <header className="an-card-head">
                <div>
                  <h2>Paid vs still due</h2>
                  <p>Share of this year’s billed amount.</p>
                </div>
              </header>
              <div className="an-status-bar" aria-hidden>
                <span className="paid" style={{ width: `${paidShare}%` }} />
                <span className="pending" style={{ width: `${pendingShare}%` }} />
                <span className="overdue" style={{ width: `${overdueShare}%` }} />
              </div>
              <ul className="an-status-list">
                <li>
                  <i className="an-swatch paid" />
                  <span>Paid</span>
                  <b>{formatInr(summary.collected)}</b>
                </li>
                <li>
                  <i className="an-swatch pending" />
                  <span>Pending</span>
                  <b>{formatInr(summary.pendingAmount)}</b>
                </li>
                <li>
                  <i className="an-swatch overdue" />
                  <span>Overdue</span>
                  <b>{formatInr(summary.overdueAmount)}</b>
                </li>
              </ul>
              <p className="an-footnote">
                {summary.openCount} invoice{summary.openCount === 1 ? '' : 's'} still open across all years
                {summary.outstandingAll ? ` · ${formatInr(summary.outstandingAll)} outstanding` : ''}.
                {summary.draftCount
                  ? ` ${summary.draftCount} draft${summary.draftCount === 1 ? '' : 's'} in ${year} ${summary.draftCount === 1 ? 'is' : 'are'} not counted as revenue.`
                  : ''}
              </p>
            </section>
          </div>

          <div className="an-split">
            <section className="an-card">
              <header className="an-card-head">
                <div>
                  <h2>Revenue by space</h2>
                  <p>Green is collected. Amber is still due.</p>
                </div>
              </header>
              <SpaceBars spaces={data?.spaces ?? []} />
            </section>

            <section className="an-card an-card-table">
              <header className="an-card-head">
                <div>
                  <h2>Space breakdown</h2>
                  <p>{year}</p>
                </div>
              </header>
              <div className="bill-table-scroll">
                <table className="bill-table an-mini-table">
                  <thead>
                    <tr>
                      <th>Space</th>
                      <th className="bill-td-num">Billed</th>
                      <th className="bill-td-num">Collected</th>
                      <th className="bill-td-num">Pending</th>
                      <th className="bill-td-num">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.spaces ?? []).length === 0 ? (
                      <tr><td colSpan={5} className="bill-empty">No space revenue in {year}.</td></tr>
                    ) : (
                      data!.spaces.map((space) => (
                        <tr key={space.space_type}>
                          <td>
                            <BillingBadge className={spaceTypeChipClass(space.space_type)}>
                              {space.space_type}
                            </BillingBadge>
                          </td>
                          <td className="bill-td-num">{formatInr(space.billed)}</td>
                          <td className="bill-td-num">{formatInr(space.collected)}</td>
                          <td className="bill-td-num">{formatInr(space.pending)}</td>
                          <td className="bill-td-num">{formatInr(space.overdue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="an-split">
            <section className="an-card an-card-table">
              <header className="an-card-head">
                <div>
                  <h2>Open invoices</h2>
                  <p>
                    {data?.openTotal
                      ? `${Math.min(data.openInvoices.length, data.openTotal)} of ${data.openTotal} still unpaid`
                      : 'Nothing waiting on payment'}
                  </p>
                </div>
              </header>
              <div className="bill-table-scroll">
                <table className="bill-table an-mini-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Client</th>
                      <th>Space</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th className="bill-td-num">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.openInvoices ?? []).length === 0 ? (
                      <tr><td colSpan={6} className="bill-empty">All issued invoices are paid.</td></tr>
                    ) : (
                      data!.openInvoices.map((row) => (
                        <tr
                          key={row.id}
                          className="bill-row-click"
                          onClick={() => navigate(`/layout/billing/invoices/${row.id}/preview`)}
                        >
                          <td className="whitespace-nowrap">{row.invoice_number || 'Draft'}</td>
                          <td>{row.client}</td>
                          <td className="whitespace-nowrap">{row.space_type}</td>
                          <td>
                            <BillingBadge className={invoiceStatusBadgeClass(row.status)}>
                              {invoiceStatusLabel(row.status)}
                            </BillingBadge>
                          </td>
                          <td className="whitespace-nowrap">
                            {fmtDocDate(row.due_date ?? undefined)}
                            {row.days_overdue > 0 ? (
                              <div className="an-late">{row.days_overdue}d late</div>
                            ) : null}
                          </td>
                          <td className="bill-td-num"><strong>{formatInr(row.balance_due)}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="an-card an-card-table">
              <header className="an-card-head">
                <div>
                  <h2>Top clients</h2>
                  <p>Highest billed in {year}</p>
                </div>
              </header>
              <div className="bill-table-scroll">
                <table className="bill-table an-mini-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th className="bill-td-num">Billed</th>
                      <th className="bill-td-num">Collected</th>
                      <th className="bill-td-num">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.clients ?? []).length === 0 ? (
                      <tr><td colSpan={4} className="bill-empty">No client revenue in {year}.</td></tr>
                    ) : (
                      data!.clients.map((client) => (
                        <tr key={client.name}>
                          <td>
                            <div className="bill-cell-title">{client.name}</div>
                            <div className="bill-cell-sub">{client.count} invoice{client.count === 1 ? '' : 's'}</div>
                          </td>
                          <td className="bill-td-num">{formatInr(client.billed)}</td>
                          <td className="bill-td-num">{formatInr(client.collected)}</td>
                          <td className="bill-td-num">{formatInr(client.outstanding)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </>
  )
}
