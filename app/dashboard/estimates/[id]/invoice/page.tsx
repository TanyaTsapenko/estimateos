'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'

interface Estimate { id: string; estimate_number: string; client_name: string | null; client_email: string | null; total: number; status: string }
interface DepositInvoice { id: string; amount: number; status: string }

export default function CreateInvoicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [depositInvoice, setDepositInvoice] = useState<DepositInvoice | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: est }, { data: dep }] = await Promise.all([
        supabase.from('estimates').select('id, estimate_number, client_name, client_email, total, status').eq('id', id).single(),
        supabase.from('invoices').select('id, amount, status').eq('estimate_id', id).eq('invoice_type', 'deposit').single(),
      ])
      setEstimate(est)
      setDepositInvoice(dep)

      const d = new Date()
      d.setDate(d.getDate() + 14)
      setDueDate(d.toISOString().slice(0, 10))

      if (dep && est) {
        const remaining = est.total - dep.amount
        setNotes(`Final invoice — project complete. ${fmtCAD(dep.amount)} deposit previously paid. Remaining balance: ${fmtCAD(remaining)}.`)
      }
    }
    load()
  }, [id])

  const isFinal = !!depositInvoice
  const invoiceAmount = estimate ? (isFinal ? estimate.total - depositInvoice!.amount : estimate.total) : 0

  async function createInvoice() {
    if (!estimate) return
    if (!dueDate) return setError('Due date is required')
    if (invoiceAmount <= 0) return setError('Invoice amount must be greater than zero')
    setSaving(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const num = `INV-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: newInv, error: invErr } = await supabase.from('invoices').insert({
      estimate_id:    estimate.id,
      user_id:        user.id,
      invoice_number: num,
      invoice_type:   isFinal ? 'final' : 'standard',
      status:         'pending',
      amount:         Math.round(invoiceAmount * 100) / 100,
      due_date:       dueDate,
      notes,
    }).select('id').single()

    if (invErr) { setError(invErr.message); setSaving(false); return }

    await supabase.from('estimates').update({ status: 'invoiced' }).eq('id', id)

    if (newInv && estimate.client_email) {
      fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: newInv.id }),
      }).catch(() => {})
    }

    router.push('/dashboard/invoices')
  }

  if (!estimate) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh"><div className="h-top"><div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div></div></div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--ash)', fontSize: 13 }}>Loading...</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push(`/dashboard/estimates/${id}`)}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          {isFinal && (
            <span style={{ background: 'rgba(22,163,74,.15)', border: '1px solid rgba(22,163,74,.3)', color: '#16a34a', borderRadius: 8, padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '.1em' }}>
              FINAL
            </span>
          )}
        </div>
        <div className="h-title">
          <div className="h-eye">From {estimate.estimate_number}</div>
          <div className="h-big">{isFinal ? 'Final Invoice' : 'Create Invoice'}</div>
          <div className="h-sub">{estimate.client_name} · {fmtCAD(estimate.total)} project total</div>
        </div>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        {/* Amount breakdown */}
        <div style={{ background: '#F4F5F7', border: '1.5px solid #1A2744', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          {isFinal ? (
            <>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Invoice breakdown</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#999' }}>
                <span>Project total</span><span>{fmtCAD(estimate.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10, color: '#999' }}>
                <span>Deposit paid ({depositInvoice!.status === 'paid' ? '✅' : '⏳'})</span>
                <span>− {fmtCAD(depositInvoice!.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #1A2744', paddingTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#999' }}>Remaining balance</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#2045B8' }}>{fmtCAD(invoiceAmount)}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Invoice amount</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2045B8' }}>{fmtCAD(invoiceAmount)}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>from signed estimate {estimate.estimate_number}</div>
            </>
          )}
        </div>

        <div className="r1"><div className="f">
          <label>Due Date *</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div></div>

        <div className="r1"><div className="f">
          <label>Notes (optional)</label>
          <textarea rows={3} value={notes}
            placeholder="Payment instructions, bank details, etc."
            style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 13, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.6 }}
            onChange={e => setNotes(e.target.value)} />
        </div></div>

        <div className="info-box">
          {isFinal
            ? '💡 This final invoice covers the remaining balance after the deposit. Estimate status updates to "Invoiced".'
            : '💡 The estimate status will update to "Invoiced" automatically.'}
        </div>

        <div style={{ height: 80 }} />
      </div>

      <div className="nav">
        <button className="btn-back" onClick={() => router.push(`/dashboard/estimates/${id}`)}>← Back</button>
        <button className="btn-next" onClick={createInvoice} disabled={saving}>
          {saving ? 'Creating...' : `Create ${isFinal ? 'Final ' : ''}Invoice →`}
        </button>
      </div>
    </div>
  )
}
