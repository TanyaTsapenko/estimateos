'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { ArrowLeft, Info } from 'lucide-react'

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #EEF0F4', padding: '16px 28px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628' }}>Create Invoice</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Loading...</div>
      </div>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    border: '1px solid #E2E5EA',
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: 'inherit',
    fontSize: 13,
    color: '#0A1628',
    outline: 'none',
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    minWidth: 0,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.08em',
    textTransform: 'uppercase' as const,
    color: '#94A3B8',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8' }}>

      {/* TOPBAR */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #EEF0F4',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push(`/dashboard/estimates/${id}`)}
            style={{ width: 32, height: 32, background: '#F5F6F8', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 1 }}>
              FROM {estimate.estimate_number}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1628', lineHeight: 1.2 }}>
              {isFinal ? 'Final Invoice' : 'Create Invoice'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{estimate.client_name}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{fmtCAD(estimate.total)} project total</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 100, overflow: 'hidden' }}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Amount card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          {isFinal ? (
            <>
              <div style={labelStyle}>Invoice Breakdown</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 6 }}>
                <span>Project total</span>
                <span>{fmtCAD(estimate.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                <span>Deposit paid ({depositInvoice!.status === 'paid' ? 'paid' : 'pending'})</span>
                <span>− {fmtCAD(depositInvoice!.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEF0F4', paddingTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Remaining balance</span>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#2563EB' }}>{fmtCAD(invoiceAmount)}</span>
              </div>
            </>
          ) : (
            <>
              <div style={labelStyle}>Invoice Amount</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#2563EB', lineHeight: 1.1 }}>{fmtCAD(invoiceAmount)}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>from signed estimate {estimate.estimate_number}</div>
            </>
          )}
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, overflow: 'hidden' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              placeholder="Payment instructions, bank details, etc."
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
            <Info size={14} strokeWidth={1.8} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              {isFinal
                ? 'This final invoice covers the remaining balance after the deposit. Estimate status updates to "Invoiced".'
                : 'The estimate status will update to "Invoiced" automatically.'}
            </span>
          </div>
        </div>

        <button
          onClick={createInvoice}
          disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', background: saving ? '#CBD5E1' : '#2563EB', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 24, marginBottom: 32 }}>
          {saving ? 'Creating...' : `Create ${isFinal ? 'Final ' : ''}Invoice`}
        </button>
      </div>
    </div>
  )
}
