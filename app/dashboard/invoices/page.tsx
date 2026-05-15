'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { useRole } from '@/lib/useRole'
import { ChevronRight } from 'lucide-react'

interface Invoice {
  id: string; invoice_number: string; status: string; amount: number
  invoice_type: string | null; due_date: string | null; created_at: string
  estimates: { client_name: string | null; estimate_number: string } | null
}

const SC: Record<string, { text: string; bg: string }> = {
  pending: { text: '#2563EB', bg: 'rgba(37,99,235,.1)'  },
  paid:    { text: '#059669', bg: 'rgba(5,150,105,.1)'  },
  overdue: { text: '#DC2626', bg: 'rgba(220,38,38,.1)'  },
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: '#fff',
      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0A1628', letterSpacing: '-.02em', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading } = useRole()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)

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
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EEF0F4',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 'env(safe-area-inset-top)',
        zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>
            BILLING
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
            Invoices
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>{fmtCAD(totalPending)} pending · {fmtCAD(totalPaid)} paid</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '20px 16px 60px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatBox label="Pending" value={fmtCAD(totalPending)} />
          <StatBox label="Paid"    value={fmtCAD(totalPaid)}    />
          <StatBox label="Total"   value={invoices.length}      />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {/* Empty */}
        {!loading && invoices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No invoices yet</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Create an invoice from a signed estimate.</div>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="desktop-only" style={{
              background: '#fff', borderRadius: 12,
              boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 90px 80px 110px 100px 160px',
                padding: '10px 18px',
                borderBottom: '1px solid rgba(10,22,40,0.05)',
              }}>
                {['#', 'Client', 'Type', 'Due', 'Amount', 'Status', 'Actions'].map((h, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: '#94A3B8',
                    textAlign: (i === 4 ? 'right' : 'left') as React.CSSProperties['textAlign'],
                  }}>
                    {h}
                  </span>
                ))}
              </div>
              {invoices.map((inv, idx) => {
                const sc = SC[inv.status] || { text: '#64748B', bg: 'rgba(100,116,139,.1)' }
                return (
                  <div
                    key={inv.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr 90px 80px 110px 100px 160px',
                      padding: '13px 18px',
                      borderBottom: idx < invoices.length - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none',
                      alignItems: 'center',
                    }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#F8FAFE')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>
                      {inv.invoice_number}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                        {inv.estimates?.client_name || '—'}
                      </div>
                      {inv.estimates?.estimate_number && (
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                          from {inv.estimates.estimate_number}
                        </div>
                      )}
                    </div>
                    <span>
                      {inv.invoice_type && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                          background: inv.invoice_type === 'deposit' ? 'rgba(37,99,235,.1)' : 'rgba(5,150,105,.1)',
                          color: inv.invoice_type === 'deposit' ? '#2563EB' : '#059669',
                          borderRadius: 4, padding: '2px 7px',
                        }}>
                          {inv.invoice_type.toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', textAlign: 'right', display: 'block' }}>
                      {fmtCAD(inv.amount)}
                    </span>
                    <span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                        color: sc.text, background: sc.bg,
                        borderRadius: 4, padding: '3px 8px',
                      }}>
                        {inv.status.toUpperCase()}
                      </span>
                    </span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => markPaid(inv.id)}
                          style={{ background: 'rgba(5,150,105,.1)', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Mark paid
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')}
                        style={{ background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>
                        PDF
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {invoices.map(inv => {
                const sc = SC[inv.status] || { text: '#64748B', bg: 'rgba(100,116,139,.1)' }
                return (
                  <div
                    key={inv.id}
                    style={{
                      background: '#fff', borderRadius: 12,
                      boxShadow: '0 0 0 1px rgba(10,22,40,0.05)',
                      padding: '14px 16px', marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {inv.estimates?.client_name || 'Client'}
                          {inv.invoice_type && (
                            <span style={{
                              fontSize: 8, fontWeight: 700,
                              background: inv.invoice_type === 'deposit' ? 'rgba(37,99,235,.1)' : 'rgba(5,150,105,.1)',
                              color: inv.invoice_type === 'deposit' ? '#2563EB' : '#059669',
                              borderRadius: 4, padding: '2px 6px',
                            }}>
                              {inv.invoice_type.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', color: '#2563EB', fontWeight: 600 }}>
                            {inv.invoice_number}
                          </span>
                          {inv.estimates?.estimate_number ? ` · from ${inv.estimates.estimate_number}` : ''}
                          {inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                        color: sc.text, background: sc.bg,
                        borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap', marginLeft: 8,
                      }}>
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => markPaid(inv.id)}
                            style={{ background: 'rgba(5,150,105,.1)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: 'pointer' }}>
                            Mark paid
                          </button>
                        )}
                        <button
                          onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')}
                          style={{ background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                          PDF
                        </button>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628' }}>{fmtCAD(inv.amount)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
