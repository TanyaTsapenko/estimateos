'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
const fmtInv = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
import { useRole } from '@/lib/useRole'
import { getTeamUserIds } from '@/lib/teamScope'
import { ChevronRight } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

interface Invoice {
  id: string; invoice_number: string; status: string; amount: number
  invoice_type: string | null; due_date: string | null; created_at: string
  estimate_id: string | null; user_id: string
  estimates: { client_name: string | null; estimate_number: string } | null
}

const REP_GRADIENTS = [
  'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
  'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)',
  'linear-gradient(135deg,#059669 0%,#047857 100%)',
  'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)',
  'linear-gradient(135deg,#D97706 0%,#B45309 100%)',
]

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
  const [paying,   setPaying]   = useState<string | null>(null)
  const [pageError, setPageError] = useState('')
  const [repFilter, setRepFilter] = useState<string>('all')
  const [teamReps, setTeamReps]   = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!roleLoading && role !== 'owner') router.replace('/dashboard')
  }, [role, roleLoading])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { userIds, isOwnerOrManager } = await getTeamUserIds(supabase, user.id)
      if (isOwnerOrManager && userIds.length > 1) {
        const { data: profs } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
        setTeamReps(userIds.map(uid => {
          const p = (profs || []).find((x: any) => x.id === uid)
          return { id: uid, name: uid === sanitizedId ? 'You' : ([p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Team member') }
        }))
      }
      const { data } = await supabase.from('invoices')
        .select('id, invoice_number, status, amount, invoice_type, due_date, created_at, estimate_id, user_id, estimates!invoices_estimate_id_fkey(client_name, estimate_number)')
        .in('user_id', userIds).order('created_at', { ascending: false })
      setInvoices((data as unknown as Invoice[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function markPaid(invoiceId: string, invoiceType?: string | null, estimateId?: string | null) {
    setPaying(invoiceId)
    try {
      const { data: updatedInv, error: invErr } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .select('id')
      if (invErr || !updatedInv?.length) {
        setPageError('Failed to mark as paid' + (invErr ? ': ' + invErr.message : ' — no rows updated'))
        setTimeout(() => setPageError(''), 3500)
        return
      }
      if (invoiceType === 'final' && estimateId) {
        const { data: updatedEst, error: estErr } = await supabase
          .from('estimates')
          .update({ status: 'paid' })
          .eq('id', estimateId)
          .select('id')
        if (estErr || !updatedEst?.length) {
          setPageError('Failed to update estimate status' + (estErr ? ': ' + estErr.message : ''))
          setTimeout(() => setPageError(''), 3500)
          return
        }
      }
      const invData = invoices.find(i => i.id === invoiceId)
      setInvoices(p => p.map(i => i.id === invoiceId ? { ...i, status: 'paid' } : i))
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        void (async () => {
          const notifType = invoiceType === 'deposit' ? 'deposit_paid' : 'final_paid'
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const { data: existing } = await supabase
            .from('notifications').select('id')
            .eq('user_id', user.id).eq('type', notifType)
            .gte('created_at', fiveMinutesAgo).limit(1)
          if (!existing?.length) {
            const { data: prof } = await supabase.from('profiles').select('notification_settings').eq('id', user.id).single()
            const ns = (prof?.notification_settings as any)
            if (ns?.inapp?.pushPayment !== false) {
              await supabase.from('notifications').insert({
                user_id: user.id,
                type: notifType,
                title: invoiceType === 'deposit' ? 'Deposit paid' : 'Final payment received',
                body: `${invData?.estimates?.client_name || 'Client'} paid ${invoiceType === 'deposit' ? 'the deposit' : 'in full'} for ${invData?.estimates?.estimate_number || ''} · ${fmtInv(invData?.amount || 0)}`,
                link: estimateId ? `/dashboard/estimates/${estimateId}` : null,
                read: false,
              })
            }
          }
        })().catch(() => {})
        fetch('/api/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            event_type: invoiceType === 'final' ? 'final_paid' : 'deposit_paid',
            actor_type: 'client',
            entity_type: 'estimate',
            entity_id: estimateId || invoiceId,
            entity_number: invData?.estimates?.estimate_number,
            client_name: invData?.estimates?.client_name,
            amount: invData?.amount,
          }),
        }).catch(() => {})
      }
      const emailType = invoiceType === 'final' ? 'final_receipt' : 'deposit_receipt'
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: emailType, invoiceId }),
      }).then(r => r.json()).then(d => {
        console.log('[mark-paid] receipt email result:', d)
      }).catch(err => {
        console.error('[mark-paid] receipt email error:', err)
      })
    } finally {
      setPaying(null)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const displayStatus = (inv: Invoice) =>
    inv.status === 'pending' && inv.due_date && inv.due_date < today ? 'overdue' : inv.status

  const displayedInvoices = repFilter !== 'all' ? invoices.filter(i => i.user_id === repFilter) : invoices
  const showRepGrouped    = repFilter === 'all' && teamReps.length > 1

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <AppTopBar
        eyebrow="BILLING"
        title="Invoices"
        right={
          <div style={{ textAlign: 'right', lineHeight: 1.5 }}>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{fmtInv(totalPending)} pending</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{fmtInv(totalPaid)} paid</div>
          </div>
        }
      />

      {/* ── BODY ── */}
      <div style={{ padding: '20px 16px 100px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatBox label="Pending" value={fmtInv(totalPending)} />
          <StatBox label="Paid"    value={fmtInv(totalPaid)}    />
          <StatBox label="Total"   value={invoices.length}      />
        </div>

        {/* Rep chip row — owner/manager with team only */}
        {teamReps.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' as any }}>
            {[{ id: 'all', name: 'All reps' }, ...teamReps].map(m => {
              const active = repFilter === m.id
              return (
                <button key={m.id} onClick={() => setRepFilter(m.id)} style={{ flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 99, border: `1.5px solid ${active ? '#2563EB' : 'rgba(15,23,42,0.08)'}`, background: active ? '#EFF4FF' : '#fff', color: active ? '#2563EB' : '#64748B', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {m.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {/* Empty */}
        {!loading && displayedInvoices.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>No invoices yet</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Create an invoice from a signed estimate.</div>
          </div>
        )}

        {!loading && displayedInvoices.length > 0 && (
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
              {/* Flat / single-rep */}
              {!showRepGrouped && displayedInvoices.map((inv, idx) => {
                const ds = displayStatus(inv)
                const sc = SC[ds] || { text: '#64748B', bg: 'rgba(100,116,139,.1)' }
                return (
                  <div
                    key={inv.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr 90px 80px 110px 100px 160px',
                      padding: '13px 18px',
                      borderBottom: idx < displayedInvoices.length - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none',
                      alignItems: 'center',
                    }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#F8FAFE')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>{inv.invoice_number}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{inv.estimates?.client_name || '—'}</div>
                      {inv.estimates?.estimate_number && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>from {inv.estimates.estimate_number}</div>}
                    </div>
                    <span>{inv.invoice_type && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', background: inv.invoice_type === 'deposit' ? 'rgba(37,99,235,.1)' : 'rgba(5,150,105,.1)', color: inv.invoice_type === 'deposit' ? '#2563EB' : '#059669', borderRadius: 4, padding: '2px 7px' }}>{inv.invoice_type.toUpperCase()}</span>}</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{inv.due_date ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(inv.due_date + 'T00:00:00')) : '—'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', textAlign: 'right', display: 'block' }}>{fmtInv(inv.amount)}</span>
                    <span><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: sc.text, background: sc.bg, borderRadius: 4, padding: '3px 8px' }}>{ds.toUpperCase()}</span></span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      {inv.status === 'pending' && <button onClick={() => markPaid(inv.id, inv.invoice_type, inv.estimate_id)} disabled={paying === inv.id} style={{ background: 'rgba(5,150,105,.1)', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: paying === inv.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: paying === inv.id ? 0.6 : 1 }}>{paying === inv.id ? 'Saving...' : 'Mark paid'}</button>}
                      <button onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')} style={{ background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>PDF</button>
                    </span>
                  </div>
                )
              })}
              {/* Rep-grouped */}
              {showRepGrouped && teamReps.map((rep, ri) => {
                const repInvs = invoices.filter(i => i.user_id === rep.id)
                if (!repInvs.length) return null
                const repTotal = repInvs.reduce((s, i) => s + i.amount, 0)
                return (
                  <div key={rep.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid rgba(10,22,40,0.05)', background: '#FAFBFC' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {rep.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#0A1628' }}>{rep.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{fmtInv(repTotal)}</span>
                    </div>
                    {repInvs.map((inv, idx) => {
                      const ds = displayStatus(inv)
                      const sc = SC[ds] || { text: '#64748B', bg: 'rgba(100,116,139,.1)' }
                      return (
                        <div
                          key={inv.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '110px 1fr 90px 80px 110px 100px 160px',
                            padding: '13px 18px',
                            borderBottom: idx < repInvs.length - 1 ? '1px solid rgba(10,22,40,0.04)' : 'none',
                            alignItems: 'center',
                          }}
                          onMouseEnter={ev => (ev.currentTarget.style.background = '#F8FAFE')}
                          onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'ui-monospace, monospace' }}>{inv.invoice_number}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{inv.estimates?.client_name || '—'}</div>
                            {inv.estimates?.estimate_number && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>from {inv.estimates.estimate_number}</div>}
                          </div>
                          <span>{inv.invoice_type && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', background: inv.invoice_type === 'deposit' ? 'rgba(37,99,235,.1)' : 'rgba(5,150,105,.1)', color: inv.invoice_type === 'deposit' ? '#2563EB' : '#059669', borderRadius: 4, padding: '2px 7px' }}>{inv.invoice_type.toUpperCase()}</span>}</span>
                          <span style={{ fontSize: 12, color: '#64748B' }}>{inv.due_date ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(inv.due_date + 'T00:00:00')) : '—'}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', textAlign: 'right', display: 'block' }}>{fmtInv(inv.amount)}</span>
                          <span><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: sc.text, background: sc.bg, borderRadius: 4, padding: '3px 8px' }}>{ds.toUpperCase()}</span></span>
                          <span style={{ display: 'flex', gap: 6 }}>
                            {inv.status === 'pending' && <button onClick={() => markPaid(inv.id, inv.invoice_type, inv.estimate_id)} disabled={paying === inv.id} style={{ background: 'rgba(5,150,105,.1)', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: paying === inv.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: paying === inv.id ? 0.6 : 1 }}>{paying === inv.id ? 'Saving...' : 'Mark paid'}</button>}
                            <button onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')} style={{ background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 7, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>PDF</button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-only">
              {/* Rep-grouped */}
              {showRepGrouped && teamReps.map((rep, ri) => {
                const repInvs = invoices.filter(i => i.user_id === rep.id)
                if (!repInvs.length) return null
                const repTotal = repInvs.reduce((s, i) => s + i.amount, 0)
                return (
                  <div key={rep.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px 8px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {rep.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{rep.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>{fmtInv(repTotal)}</span>
                    </div>
                    {repInvs.map(inv => {
                      const ds = displayStatus(inv)
                      const sc = SC[ds] || { text: '#64748B', bg: 'rgba(100,116,139,.1)' }
                      return (
                        <div key={inv.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', padding: '14px 16px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {inv.estimates?.client_name || 'Client'}
                                {inv.invoice_type && <span style={{ fontSize: 8, fontWeight: 700, background: inv.invoice_type === 'deposit' ? 'rgba(37,99,235,.1)' : 'rgba(5,150,105,.1)', color: inv.invoice_type === 'deposit' ? '#2563EB' : '#059669', borderRadius: 4, padding: '2px 6px' }}>{inv.invoice_type.toUpperCase()}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                                <span style={{ fontFamily: 'ui-monospace, monospace', color: '#2563EB', fontWeight: 600 }}>{inv.invoice_number}</span>
                                {inv.estimates?.estimate_number ? ` · from ${inv.estimates.estimate_number}` : ''}
                                {inv.due_date ? ` · due ${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(inv.due_date + 'T00:00:00'))}` : ''}
                              </div>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: sc.text, background: sc.bg, borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap', marginLeft: 8 }}>{ds.toUpperCase()}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {inv.status === 'pending' && <button onClick={() => markPaid(inv.id, inv.invoice_type, inv.estimate_id)} disabled={paying === inv.id} style={{ background: 'rgba(5,150,105,.1)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: paying === inv.id ? 'not-allowed' : 'pointer', opacity: paying === inv.id ? 0.6 : 1 }}>{paying === inv.id ? 'Saving...' : 'Mark paid'}</button>}
                              <button onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')} style={{ background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>PDF</button>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628' }}>{fmtInv(inv.amount)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {/* Flat / single-rep */}
              {!showRepGrouped && displayedInvoices.map(inv => {
                const ds = displayStatus(inv)
                const sc = SC[ds] || { text: '#64748B', bg: 'rgba(100,116,139,.1)' }
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
                          {inv.due_date ? ` · due ${new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(inv.due_date + 'T00:00:00'))}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
                        color: sc.text, background: sc.bg,
                        borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap', marginLeft: 8,
                      }}>
                        {ds.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => markPaid(inv.id, inv.invoice_type, inv.estimate_id)}
                            disabled={paying === inv.id}
                            style={{ background: 'rgba(5,150,105,.1)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: paying === inv.id ? 'not-allowed' : 'pointer', opacity: paying === inv.id ? 0.6 : 1 }}>
                            {paying === inv.id ? 'Saving...' : 'Mark paid'}
                          </button>
                        )}
                        <button
                          onClick={() => window.open(`/api/invoice-pdf?id=${inv.id}`, '_blank')}
                          style={{ background: 'rgba(37,99,235,.08)', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                          PDF
                        </button>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628' }}>{fmtInv(inv.amount)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {pageError && (
        <div style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 90px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#DC2626', color: '#fff', borderRadius: 99,
          padding: '10px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', zIndex: 200, whiteSpace: 'nowrap',
        }}>
          {pageError}
        </div>
      )}
    </div>
  )
}
