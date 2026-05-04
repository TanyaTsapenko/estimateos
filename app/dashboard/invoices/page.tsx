'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'

interface Invoice {
  id: string; invoice_number: string; status: string; amount: number
  due_date: string | null; created_at: string
  estimates: { client_name: string | null; estimate_number: string } | null
}

const statusColor: Record<string, string> = { pending: '#2563eb', paid: '#16a34a', overdue: '#dc2626' }
const statusBg: Record<string, string> = { pending: 'rgba(37,99,235,.1)', paid: 'rgba(22,163,74,.1)', overdue: 'rgba(220,38,38,.1)' }

export default function InvoicesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('invoices')
        .select('id, invoice_number, status, amount, due_date, created_at, estimates(client_name, estimate_number)')
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

        {!loading && invoices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--jet)', marginBottom: 4 }}>No invoices yet</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Create an invoice from a signed estimate.</div>
          </div>
        )}

        {invoices.map(inv => (
          <div key={inv.id} className="ec">
            <div className="ec-top">
              <div>
                <div className="ec-name">{inv.estimates?.client_name || 'Client'}</div>
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
              {inv.status === 'pending' && (
                <button onClick={() => markPaid(inv.id)}
                  style={{ background: 'rgba(22,163,74,.1)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}>
                  Mark paid
                </button>
              )}
              {inv.status !== 'pending' && <div />}
              <div className="ec-amt">{fmtCAD(inv.amount)}</div>
            </div>
          </div>
        ))}

        <div style={{ height: 90 }} />
      </div>

      <BottomNav />
    </div>
  )
}
