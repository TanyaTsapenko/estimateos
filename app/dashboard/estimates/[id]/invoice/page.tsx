'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { ArrowLeft, Info, Send } from 'lucide-react'

interface Estimate { id: string; estimate_number: string; client_name: string | null; client_email: string | null; total: number; status: string; user_id: string }
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
  const [showModal, setShowModal] = useState(false)
  const [interacEmail, setInteracEmail] = useState('')
  const [additionalCharges, setAdditionalCharges] = useState<{id: string; label: string; amount: number}[]>([])

  function addCharge() {
    setAdditionalCharges(prev => [...prev, { id: Date.now().toString(), label: '', amount: 0 }])
  }
  function removeCharge(id: string) {
    setAdditionalCharges(prev => prev.filter(c => c.id !== id))
  }
  function updateCharge(id: string, field: 'label' | 'amount', value: string | number) {
    setAdditionalCharges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const sanitizedId = user ? user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '') : null
      const [{ data: est }, { data: dep }, { data: prof }] = await Promise.all([
        supabase.from('estimates').select('id, estimate_number, client_name, client_email, total, status, user_id').eq('id', id).single(),
        supabase.from('invoices').select('id, amount, status').eq('estimate_id', id).eq('invoice_type', 'deposit').maybeSingle(),
        sanitizedId ? supabase.from('profiles').select('interac_email').eq('id', sanitizedId).single() : Promise.resolve({ data: null }),
      ])
      setEstimate(est)
      setDepositInvoice(dep)
      setInteracEmail((prof as any)?.interac_email || '')

      const d = new Date()
      d.setDate(d.getDate() + 14)
      setDueDate(d.toISOString().slice(0, 10))
    }
    load()
  }, [id])

  const isFinal = !!depositInvoice
  const additionalTotal = additionalCharges.reduce((s, c) => s + (c.amount || 0), 0)
  const depositPaid = isFinal ? (depositInvoice!.amount ?? 0) : 0
  const balanceAmount = isFinal
    ? Math.round((estimate ? estimate.total - depositPaid : 0) * 100) / 100
    : (estimate?.total ?? 0)
  const invoiceAmount = (isFinal ? balanceAmount : (estimate?.total ?? 0)) + additionalTotal

  function setNet(days: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDueDate(d.toISOString().slice(0, 10))
  }

  async function createInvoice() {
    if (!estimate) return
    if (saving) return
    if (!dueDate) return setError('Due date is required')
    if (invoiceAmount <= 0) return setError('Invoice amount must be greater than zero')
    if (!depositInvoice && isFinal) {
      console.error('[invoice/create] isFinal=true but no deposit invoice found for estimate', estimate.id)
      setError('Cannot create final invoice: deposit invoice not found')
      return
    }
    setSaving(true); setError('')
    try {
      if (isFinal) {
        const { data: existingFinal } = await supabase.from('invoices')
          .select('id').eq('estimate_id', estimate.id).eq('invoice_type', 'final').maybeSingle()
        if (existingFinal) { setError('Final invoice already sent'); return }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', sanitizedId)
      const num = `INV-${String((count || 0) + 1).padStart(4, '0')}`

      const { data: newInv, error: invErr } = await supabase.from('invoices').insert({
        estimate_id:    estimate.id,
        user_id:        estimate.user_id,
        invoice_number: num,
        invoice_type:   isFinal ? 'final' : 'standard',
        status:         'pending',
        amount:         Math.round(invoiceAmount * 100) / 100,
        due_date:       dueDate,
        notes,
        additional_charges: additionalCharges.filter(c => c.label.trim()).map(c => ({ label: c.label.trim(), amount: c.amount })),
      }).select('id').single()

      if (invErr) { setError(invErr.message); return }

      await supabase.from('estimates').update({ status: 'invoiced' }).eq('id', id)

      if (newInv && estimate.client_email) {
        fetch('/api/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: newInv.id }),
        }).catch(() => {})
      }

      router.push('/dashboard/invoices')
    } finally {
      setSaving(false)
    }
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

  if (isFinal) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8' }}>

      {/* TOPBAR */}
      <div className="page-hd" style={{
        background: '#fff',
        borderBottom: '1px solid #EEF0F4',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
        zIndex: 10,
      }}>
        <button
          onClick={() => router.push(`/dashboard/estimates/${id}`)}
          style={{ width: 32, height: 32, background: '#F5F6F8', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1628' }}>Send Final Invoice</div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 100 }}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Info card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{estimate.client_name}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{estimate.client_email}</div>
            </div>
            <div style={{ height: 1, background: '#F1F3F7' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, letterSpacing: '.04em' }}>{estimate.estimate_number}</div>
            </div>
            <div style={{ height: 1, background: '#F1F3F7' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Project total</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475467' }}>{fmtCAD(estimate.total)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Deposit paid</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>−{fmtCAD(depositPaid)}</div>
              </div>
              <div style={{ height: 1, background: '#F1F3F7', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#94A3B8' }}>Balance due</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2563EB' }}>{fmtCAD(invoiceAmount)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional charges */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8', textTransform: 'uppercase' as const }}>Additional charges</div>
            <button onClick={addCharge} style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
          </div>
          {additionalCharges.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: '#94A3B8' }}>None — tap + Add to include extras</div>
          ) : additionalCharges.map((charge, i) => (
            <div key={charge.id} style={{ padding: '10px 14px', borderBottom: i < additionalCharges.length - 1 ? '0.5px solid #F1F5F9' : 'none', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={charge.label} onChange={e => updateCharge(charge.id, 'label', e.target.value)} placeholder="e.g. Permit fee, Travel..." style={{ flex: 1, border: 'none', fontSize: 13, color: '#0A1628', outline: 'none', fontFamily: 'inherit', background: 'transparent' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', width: 90, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>$</span>
                <input type="number" min="0" value={charge.amount || ''} onChange={e => updateCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#0A1628', textAlign: 'right' as const, outline: 'none', fontFamily: 'inherit' }}/>
              </div>
              <button onClick={() => removeCharge(charge.id)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Due Date *</label>
            <input
              type="date"
              lang="en"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setNet(14)}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E2E5EA', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Net 14
              </button>
              <button
                onClick={() => setNet(30)}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E2E5EA', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Net 30
              </button>
              {dueDate && (
                <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(dueDate + 'T00:00:00'))}
                </div>
              )}
            </div>
          </div>

          {interacEmail && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Interac e-Transfer</label>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #EEF0F4' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Send to</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{interacEmail}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #EEF0F4' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Message</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{estimate.estimate_number} balance</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>Amount</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>{fmtCAD(invoiceAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              placeholder="Additional notes for client (optional)"
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', background: saving ? '#CBD5E1' : '#2563EB', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
          {saving ? 'Sending...' : 'Send Final Invoice'}
        </button>
      </div>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={20} color="#2563EB" strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', textAlign: 'center', marginBottom: 10 }}>
              Send Final Invoice?
            </div>
            <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
              This will send a final invoice of <strong style={{ color: '#0A1628' }}>{fmtCAD(invoiceAmount)}</strong> to {estimate.client_email}. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid #E2E5EA', background: '#fff', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={() => { setShowModal(false); createInvoice() }}
                disabled={saving}
                style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Non-final invoice layout (no deposit exists)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F6F8' }}>

      {/* TOPBAR */}
      <div className="page-hd" style={{
        background: '#fff',
        borderBottom: '1px solid #EEF0F4',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
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
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1628', lineHeight: 1.2 }}>Send Final Invoice</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{estimate.client_name}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{fmtCAD(estimate.total)} project total</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, padding: '20px 16px', paddingBottom: 100, overflowY: 'auto' }}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={labelStyle}>Invoice Amount</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#2563EB', lineHeight: 1.1 }}>{fmtCAD(invoiceAmount)}</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>from signed estimate {estimate.estimate_number}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, overflow: 'hidden' }}>
          <div style={{ marginBottom: 16, width: '100%' }}>
            <label style={labelStyle}>Due Date *</label>
            <input
              type="date"
              lang="en"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setNet(14)}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E2E5EA', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Net 14
              </button>
              <button
                onClick={() => setNet(30)}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E2E5EA', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Net 30
              </button>
              {dueDate && (
                <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  {new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(dueDate + 'T00:00:00'))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              placeholder="Additional notes for client (optional)"
              onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
            <Info size={14} strokeWidth={1.8} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              The estimate status will update to &quot;Invoiced&quot; automatically.
            </span>
          </div>
        </div>

        <button
          onClick={createInvoice}
          disabled={saving}
          style={{ width: '100%', height: 52, borderRadius: 12, border: 'none', background: saving ? '#CBD5E1' : '#2563EB', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 24, marginBottom: 32 }}>
          {saving ? 'Sending...' : 'Send Final Invoice'}
        </button>
      </div>
    </div>
  )
}
