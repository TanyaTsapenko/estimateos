'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'
import { useRole } from '@/lib/useRole'

interface Invoice {
  id: string; invoice_number: string; status: string; amount: number
  invoice_type: string | null; due_date: string | null; created_at: string
  estimates: { client_name: string | null; estimate_number: string } | null
}

const statusColor: Record<string, string> = { pending: '#2563eb', paid: '#16a34a', overdue: '#dc2626' }
const statusBg: Record<string, string> = { pending: 'rgba(37,99,235,.1)', paid: 'rgba(22,163,74,.1)', overdue: 'rgba(220,38,38,.1)' }

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = useRole()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && role !== 'owner') router.replace('/dashboard')
  }, [role, roleLoading])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('invoices')
        .select('id, invoice_number, status, amount, invoice_type, due_date, created_at, estimates(client_name, estimate_number)')
        .eq('user_id', user.id).order('created_at', { ascending: false })
      setInvoices((data as unknown as Invoice[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function markPaid(invoiceId: string) {
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoiceId)
    setInvoices(p => p.map(i => i.id === invoiceId ? { ...i, status: 'paid' } : i))
  }

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  const empty = (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--jet)', marginBottom: 4 }}>No invoices yet</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>Create an invoice from a signed estimate.</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
        </div>
        <div className="h-title">
          <div className="h-eye">Billing</div>
          <div className="h-big">Invoices</div>
          <div className="h-sub">{fmtCAD(totalPending)} pending · {fmtCAD(totalPaid)} paid</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        <div className="stats" style={{ marginBottom: 16 }}>
          <div className="stat">
            <div className="stat-top"><div className="stat-ic">🕐</div><div className="stat-tr">Owed</div></div>
            <div className="stat-val">{fmtCAD(totalPending)}</div>
            <div className="stat-lbl">Pending</div>
          </div>
          <div className="stat">
            <div className="stat-top"><div className="stat-ic">✅</div><div className="stat-tr">Collected</div></div>
            <div className="stat-val">{fmtCAD(totalPaid)}</div>
            <div className="stat-lbl">Paid</div>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>}

        {!loading && invoices.length === 0 && empty}

        {/* ── DESKTOP TABLE ── */}
        {!loading && invoices.length > 0 && (
          <div className="desktop-only">
            <div className="dt">
              <div className="dt-head" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 80px 80px 100px 90px 160px', padding: '9px 16px' }}>
                <span>#</span>
                <span>Client</span>
                <span>Type</span>
                <span>Due</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {invoices.map(inv => (
                <div key={inv.id} className="dt-row" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 80px 80px 100px 90px 160px', padding: '11px 16px', alignItems: 'center' }}>
                  <span className="dt-num">{inv.invoice_number}</span>
                  <div>
                    <div className="dt-name">{inv.estimates?.client_name || '—'}</div>
                    {inv.estimates?.estimate_number && (
                      <div style={{ fontSize: 10, color: 'var(--ash)' }}>from {inv.estimates.estimate_number}</div>
                    )}
                  </div>
                  <span>
                    {inv.invoice_type && (
                      <span className="badge" style={{
                        background: inv.invoice_type === 'deposit' ? 'rgba(59,108,255,.1)' : 'rgba(22,163,74,.1)',
                        color: inv.invoice_type === 'deposit' ? '#2045B8' : '#15803d',
                      }}>
                        {inv.invoice_type.toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="dt-date">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                      : '—'}
                  </span>
                  <span className="dt-amt">{fmtCAD(inv.amount)}</span>
                  <span>
                    <span className="badge" style={{ color: statusColor[inv.status] || '#6b7280', background: statusBg[inv.status] || 'rgba(107,114,128,.1)' }}>
                      {inv.status.toUpperCase()}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {inv.status === 'pending' && (
                      <button onClick={() => markPaid(inv.id)}
                        style={{ background: 'rgba(22,163,74,.1)', border: 'none', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#16a34a', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Mark paid
                      </button>
                    )}
                    <button onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')}
                      style={{ background: 'rgba(59,108,255,.08)', border: 'none', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#2045B8', cursor: 'pointer', fontFamily: 'inherit' }}>
                      PDF
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MOBILE CARDS ── */}
        <div className="mobile-only">
          {invoices.map(inv => (
            <div key={inv.id} className="ec">
              <div className="ec-top">
                <div>
                  <div className="ec-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {inv.estimates?.client_name || 'Client'}
                    {inv.invoice_type === 'deposit' && (
                      <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(59,108,255,.1)', color: '#2045B8', padding: '2px 6px', borderRadius: 5 }}>DEPOSIT</span>
                    )}
                    {inv.invoice_type === 'final' && (
                      <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(22,163,74,.1)', color: '#15803d', padding: '2px 6px', borderRadius: 5 }}>FINAL</span>
                    )}
                  </div>
                  <div className="ec-date">
                    {inv.invoice_number}
                    {inv.estimates?.estimate_number ? ` · from ${inv.estimates.estimate_number}` : ''}
                    {inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : ''}
                  </div>
                </div>
                <span className="badge" style={{ color: statusColor[inv.status] || '#6b7280', background: statusBg[inv.status] || 'rgba(107,114,128,.1)' }}>
                  {inv.status.toUpperCase()}
                </span>
              </div>
              <div className="ec-bot">
                <div style={{ display: 'flex', gap: 6 }}>
                  {inv.status === 'pending' && (
                    <button onClick={() => markPaid(inv.id)}
                      style={{ background: 'rgba(22,163,74,.1)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}>
                      Mark paid
                    </button>
                  )}
                  <button onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')}
                    style={{ background: 'rgba(59,108,255,.08)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#2045B8', cursor: 'pointer' }}>
                    PDF
                  </button>
                </div>
                <div className="ec-amt">{fmtCAD(inv.amount)}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
