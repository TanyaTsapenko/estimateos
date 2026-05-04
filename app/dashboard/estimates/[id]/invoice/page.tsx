'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'

interface Estimate { id: string; estimate_number: string; client_name: string | null; total: number; status: string }

export default function CreateInvoicePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('estimates').select('id, estimate_number, client_name, total, status').eq('id', id).single()
      .then(({ data }) => {
        setEstimate(data)
        // Default due date: 14 days from now
        const d = new Date(); d.setDate(d.getDate() + 14)
        setDueDate(d.toISOString().slice(0, 10))
      })
  }, [id])

  async function createInvoice() {
    if (!estimate) return
    if (!dueDate) return setError('Due date is required')
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const num = `INV-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: inv, error: invErr } = await supabase.from('invoices').insert({
      estimate_id: estimate.id, user_id: user.id,
      invoice_number: num, status: 'pending',
      amount: estimate.total, due_date: dueDate, notes,
    }).select().single()

    if (invErr || !inv) { setError(invErr?.message || 'Failed to create invoice'); setSaving(false); return }

    await supabase.from('estimates').update({ status: 'invoiced' }).eq('id', id)
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
        </div>
        <div className="h-title">
          <div className="h-eye">From {estimate.estimate_number}</div>
          <div className="h-big">Create Invoice</div>
          <div className="h-sub">{estimate.client_name} · {fmtCAD(estimate.total)}</div>
        </div>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        <div style={{ background: 'linear-gradient(135deg,#1A1A1A,#353A3E)', borderRadius: 14, padding: 16, marginBottom: 16, color: '#fff' }}>
          <div style={{ fontSize: 10, opacity: .5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Invoice amount</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{fmtCAD(estimate.total)}</div>
          <div style={{ fontSize: 11, opacity: .5, marginTop: 2 }}>from signed estimate {estimate.estimate_number}</div>
        </div>

        <div className="r1"><div className="f">
          <label>Due Date *</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div></div>

        <div className="r1"><div className="f">
          <label>Notes (optional)</label>
          <textarea placeholder="Payment instructions, bank details, etc." rows={3} value={notes}
            style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical' }}
            onChange={e => setNotes(e.target.value)} />
        </div></div>

        <div className="info-box">💡 The estimate status will update to "Invoiced" automatically.</div>

        <div style={{ height: 80 }} />
      </div>

      <div className="nav">
        <button className="btn-back" onClick={() => router.push(`/dashboard/estimates/${id}`)}>← Back</button>
        <button className="btn-next" onClick={createInvoice} disabled={saving}>
          {saving ? 'Creating...' : 'Create Invoice →'}
        </button>
      </div>
    </div>
  )
}
