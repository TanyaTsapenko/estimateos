'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { ArrowLeft, Landmark, FileText, Banknote, CreditCard } from 'lucide-react'

const PAYMENT_OPTIONS = [
  { key: 'E-Transfer', label: 'E-Transfer', Icon: Landmark   },
  { key: 'Cheque',     label: 'Cheque',     Icon: FileText   },
  { key: 'Cash',       label: 'Cash',       Icon: Banknote   },
  { key: 'Financing',  label: 'Financing',  Icon: CreditCard },
]

const PRESETS = [25, 30, 50, 100]

interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  client_address: string | null; total: number
}

export default function PaymentSetupPage() {
  const router       = useRouter()
  const { id }       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const trigger      = searchParams.get('trigger') || 'send'
  const supabase     = createClient()

  const [estimate,        setEstimate]        = useState<Estimate | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [paymentMethod,   setPaymentMethod]   = useState('E-Transfer')
  const [paymentMethods,  setPaymentMethods]  = useState<string[]>([])
  const [depositPercent, setDepositPercent] = useState(30)
  const [customInput,    setCustomInput]    = useState('30')
  const [useCustom,      setUseCustom]      = useState(false)
  const [discountType,   setDiscountType]   = useState<'$' | '%'>('$')
  const [discountValue,  setDiscountValue]  = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const [{ data: est }, { data: prof }] = await Promise.all([
        supabase.from('estimates').select('id, estimate_number, client_name, client_address, total').eq('id', id).single(),
        supabase.from('profiles').select('deposit_percent, payment_methods').eq('id', sanitizedId).single(),
      ])
      if (est) setEstimate(est as Estimate)
      const defaultPct = (prof as any)?.deposit_percent ?? 30
      setDepositPercent(defaultPct)
      setCustomInput(String(defaultPct))
      const profileMethods: string[] = (prof as any)?.payment_methods || []
      if (profileMethods.length) {
        setPaymentMethods(profileMethods)
        setPaymentMethod(profileMethods[0])
      }
      setLoading(false)
    }
    load()
  }, [id])

  const effectivePct    = useCustom ? (parseFloat(customInput) || 0) : depositPercent
  const discountAmount  = estimate ? (discountType === '$' ? discountValue : estimate.total * discountValue / 100) : 0
  const afterDiscount   = estimate ? Math.max(0, estimate.total - discountAmount) : 0
  const depositAmount   = afterDiscount * effectivePct / 100
  const balance         = Math.max(0, afterDiscount - depositAmount)

  function selectPreset(pct: number) {
    setDepositPercent(pct)
    setCustomInput(String(pct))
    setUseCustom(false)
  }

  function handleContinue() {
    const pct = Math.min(100, Math.max(0, Math.round(effectivePct * 10) / 10))
    const params = new URLSearchParams({
      trigger,
      payment_method:  paymentMethod,
      deposit_percent: String(pct),
      discount_amount: String(Math.round(discountAmount * 100) / 100),
      discount_type:   discountType,
    })
    router.push(`/dashboard/estimates/${id}/contract?${params.toString()}`)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13, fontFamily: '"Inter", system-ui, sans-serif' }}>
      Loading…
    </div>
  )
  if (!estimate) return null

  const F = '"Inter", system-ui, -apple-system, sans-serif'

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: F, display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EEF0F4',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{
          background: '#F5F6F8', border: 'none', borderRadius: 8,
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <ArrowLeft size={16} color="#64748B" />
        </button>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>
            {estimate.estimate_number}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>
            Payment Setup
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 16px 200px', flex: 1 }}>

        {/* Page heading */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', letterSpacing: '-0.4px', marginBottom: 4 }}>
            How will {estimate.client_name || 'the client'} pay?
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>
            {fmtCAD(estimate.total)}{estimate.client_address ? ` · ${estimate.client_address}` : ''}
          </div>
        </div>

        {/* Card 1 — Payment Method */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
            PAYMENT METHOD
          </div>
          <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PAYMENT_OPTIONS.filter(({ key }) => paymentMethods.length === 0 || paymentMethods.includes(key)).map(({ key, label, Icon }) => {
              const selected = paymentMethod === key
              return (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    background: selected ? '#EFF6FF' : '#F8FAFC',
                    border: `1.5px solid ${selected ? '#2563EB' : 'transparent'}`,
                    borderRadius: 12, cursor: 'pointer', fontFamily: F, textAlign: 'left',
                  }}
                >
                  <Icon size={18} color={selected ? '#2563EB' : '#64748B'} strokeWidth={1.8} />
                  <span style={{ fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? '#2563EB' : '#0A1628' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Card 2 — Deposit */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', marginBottom: 12 }}>
          <div style={{ padding: '14px 16px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8' }}>
            DEPOSIT
          </div>

          {/* Preset buttons */}
          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
            {PRESETS.map(pct => {
              const selected = !useCustom && depositPercent === pct
              return (
                <button
                  key={pct}
                  onClick={() => selectPreset(pct)}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: selected ? '#2563EB' : '#F8FAFC',
                    color: selected ? '#fff' : '#64748B',
                    border: `1.5px solid ${selected ? '#2563EB' : '#E5E7EB'}`,
                    borderRadius: 10, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: F,
                  }}
                >
                  {pct}%
                </button>
              )
            })}
          </div>

          {/* Custom % input */}
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>Custom %</div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min={0}
                max={100}
                value={customInput}
                onChange={e => { setCustomInput(e.target.value); setUseCustom(true) }}
                onFocus={() => setUseCustom(true)}
                placeholder="e.g. 40"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: `1.5px solid ${useCustom ? '#2563EB' : '#E5E7EB'}`,
                  borderRadius: 10, padding: '11px 40px 11px 14px',
                  fontSize: 15, fontFamily: F, outline: 'none',
                  color: '#0A1628', background: '#fff',
                }}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#94A3B8', fontWeight: 600, pointerEvents: 'none' }}>
                %
              </span>
            </div>
          </div>

          {/* Discount */}
          <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 10 }}>Discount (optional)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                <div onClick={() => setDiscountType('$')} style={{ padding: '10px 14px', background: discountType === '$' ? '#2563EB' : '#fff', color: discountType === '$' ? '#fff' : '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>$</div>
                <div onClick={() => setDiscountType('%')} style={{ padding: '10px 14px', background: discountType === '%' ? '#2563EB' : '#fff', color: discountType === '%' ? '#fff' : '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>%</div>
              </div>
              <input
                type="number" min="0"
                value={discountValue || ''}
                placeholder="0.00"
                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#0A1628', fontFamily: F, outline: 'none' }}
              />
            </div>
          </div>

          {/* Summary */}
          <div style={{ margin: '0 16px 16px', background: '#F8FAFC', borderRadius: 12, padding: '12px 14px' }}>
            {[
              { label: 'Estimate total', value: fmtCAD(estimate.total), color: '#0A1628' },
              ...(discountAmount > 0 ? [
                { label: discountType === '$' ? 'Discount' : `Discount (${discountValue}%)`, value: `− ${fmtCAD(discountAmount)}`, color: '#16A34A' },
                { label: 'After discount', value: fmtCAD(afterDiscount), color: '#0A1628' },
              ] : []),
              { label: `Deposit (${effectivePct}%)`, value: fmtCAD(depositAmount), color: '#F59E0B' },
              { label: 'Balance on completion', value: fmtCAD(balance), color: '#64748B' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0',
                borderBottom: i < arr.length - 1 ? '1px solid #E5E7EB' : 'none',
              }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        background: 'linear-gradient(to top, #F5F6F8 70%, transparent)',
        zIndex: 50,
      }}>
        <button
          onClick={handleContinue}
          style={{ width: '100%', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: F }}
        >
          Continue
        </button>
      </div>

    </div>
  )
}
