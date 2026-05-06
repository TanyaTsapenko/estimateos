'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OPENING_TYPES, TAX_RATES, opCost, fmtCAD, type Opening, type CustomPrices } from '@/lib/pricing'

// ─── TYPES ───────────────────────────────────
interface ClientInfo {
  client_name: string; client_email: string; client_phone: string
  client_address: string; client_city: string; client_province: string
  scope_notes: string
}

// ─── CONSTANTS ───────────────────────────────
const TIERS = [
  { key: 'good',   label: 'Good',   mult: 1.0, desc: 'Standard materials & workmanship',   badge: '' },
  { key: 'better', label: 'Better', mult: 1.2, desc: 'Mid-grade product, 5-yr warranty',   badge: 'POPULAR' },
  { key: 'best',   label: 'Best',   mult: 1.4, desc: 'Premium product, lifetime warranty', badge: 'BEST VALUE' },
]

const DEFAULT_OPENING: Omit<Opening, 'id'> = {
  type: 'window_dh', qty: 1, width: 'md', shape: 'rect', colour: 'white',
  glass: 'clear', frame: 'none', install: 'insert', floor: 'first',
  room: '', sidelight: 0, transom: 0, screen: 0,
}

// ─── MAIN COMPONENT ──────────────────────────
export default function NewEstimatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Client info
  const [client, setClient] = useState<ClientInfo>({
    client_name: '', client_email: '', client_phone: '',
    client_address: '', client_city: '', client_province: 'AB',
    scope_notes: '',
  })

  // Step 2 — Openings
  const [openings, setOpenings] = useState<Opening[]>([
    { id: '1', ...DEFAULT_OPENING },
  ])

  // Step 3 — Tier
  const [tier, setTier] = useState('better')

  // Step 4 — Summary / save
  const [profile, setProfile] = useState<{ province: string } | null>(null)
  const [customPrices, setCustomPrices] = useState<CustomPrices | undefined>(undefined)
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const [{ data: prof }, { data: priceRows }] = await Promise.all([
        supabase.from('profiles').select('province').eq('id', user.id).single(),
        supabase.from('price_lists').select('*').eq('user_id', user.id),
      ])
      if (prof) setProfile(prof)
      if (priceRows && priceRows.length > 0) {
        const sizesRow = priceRows.find((r: any) => r.opening_type === '_sizes')
        const types: Record<string, { base: number; lab: number }> = {}
        priceRows.filter((r: any) => r.opening_type !== '_sizes').forEach((r: any) => {
          types[r.opening_type] = { base: r.base_price, lab: r.labour_price }
        })
        setCustomPrices({
          sizes: sizesRow
            ? { sm: sizesRow.sz_sm, md: sizesRow.sz_md, lg: sizesRow.sz_lg, xl: sizesRow.sz_xl }
            : { sm: 0.85, md: 1.0, lg: 1.2, xl: 1.4 },
          types,
        })
      }
    })
  }, [])

  // ─── CALCULATIONS ───
  const mult = TIERS.find(t => t.key === tier)?.mult || 1.2
  const province = client.client_province || profile?.province || 'AB'
  const [taxRate, taxLabel] = TAX_RATES[province] || [0.05, 'GST (5%)']
  const subtotal = openings.reduce((s, op) => s + opCost(op, mult, customPrices), 0)
  const discountAmt = discountValue
    ? discountType === 'percent'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0
  const afterDiscount = subtotal - discountAmt
  const taxAmount = afterDiscount * taxRate
  const total = afterDiscount + taxAmount

  // ─── OPENING HELPERS ───
  function addOpening() {
    setOpenings(p => [...p, { id: Date.now().toString(), ...DEFAULT_OPENING }])
  }
  function removeOpening(id: string) {
    if (openings.length <= 1) return
    setOpenings(p => p.filter(o => o.id !== id))
  }
  function updateOpening(id: string, k: keyof Opening, v: string | number) {
    setOpenings(p => p.map(o => o.id === id ? { ...o, [k]: v } : o))
  }

  // ─── VALIDATION ───
  function validateStep(): string {
    if (step === 1) {
      if (!client.client_name.trim()) return 'Client name is required'
    }
    return ''
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }
  function back() { setError(''); setStep(s => s - 1); window.scrollTo(0, 0) }

  // ─── SAVE ───
  async function saveEstimate() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    // Generate estimate number
    const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const num = `EST-${String((count || 0) + 1).padStart(4, '0')}`

    const { data: est, error: estErr } = await supabase.from('estimates').insert({
      user_id: user.id,
      estimate_number: num,
      ...client,
      status: 'draft',
      tier,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_type: discountAmt > 0 ? discountType : null,
      discount_value: discountAmt > 0 ? parseFloat(discountValue) : null,
      discount_amount: Math.round(discountAmt * 100) / 100,
      payment_method: paymentMethod || null,
      tax_rate: taxRate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    }).select().single()

    if (estErr || !est) { setError(estErr?.message || 'Failed to save estimate'); setSaving(false); return }

    // Save openings
    const rows = openings.map((op, i) => ({
      estimate_id: est.id,
      type: op.type, qty: op.qty, width: op.width, shape: op.shape,
      colour: op.colour, glass: op.glass, frame: op.frame,
      install: op.install, floor: op.floor, room: op.room,
      sidelight: op.sidelight, transom: op.transom, screen: op.screen,
      unit_cost: Math.round(opCost({ ...op, qty: 1 }, mult, customPrices) * 100) / 100,
      total_cost: Math.round(opCost(op, mult, customPrices) * 100) / 100,
      sort_order: i,
    }))

    const { error: opErr } = await supabase.from('estimate_openings').insert(rows)
    if (opErr) { setError(opErr.message); setSaving(false); return }

    router.push(`/dashboard/estimates/${est.id}`)
  }

  // ─── RENDER ───
  const pills = [1, 2, 3, 4]
  const stepLabels = ['Client', 'Openings', 'Pricing', 'Review']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 1
              ? <button onClick={() => router.push('/dashboard/estimates')}
                  style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ←
                </button>
              : <button onClick={back}
                  style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ←
                </button>
            }
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          <div className="pills">
            {pills.map(p => (
              <div key={p} className={`pill${p === step ? ' active' : p < step ? ' done' : ''}`} />
            ))}
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Step {step} of 4 · {stepLabels[step - 1]}</div>
          <div className="h-big">{
            step === 1 ? 'Client Info' :
            step === 2 ? 'Openings' :
            step === 3 ? 'Choose Tier' : 'Review & Save'
          }</div>
          <div className="h-sub">{
            step === 1 ? 'Who is this estimate for?' :
            step === 2 ? `${openings.length} opening${openings.length !== 1 ? 's' : ''} · ${fmtCAD(subtotal)} (pre-tier)` :
            step === 3 ? 'Pick the package to present' :
            `Total: ${fmtCAD(total)} inc. ${taxLabel}`
          }</div>
        </div>
      </div>

      <div className="card screen-enter">
        {error && <div className="error-msg">{error}</div>}

        {/* ── STEP 1: CLIENT INFO ── */}
        {step === 1 && (
          <>
            <div className="r1"><div className="f">
              <label>Client Name *</label>
              <input placeholder="Andriy Koval" value={client.client_name}
                onChange={e => setClient(p => ({ ...p, client_name: e.target.value }))} />
            </div></div>
            <div className="r2">
              <div className="f"><label>Email</label>
                <input type="email" placeholder="andriy@email.com" value={client.client_email}
                  onChange={e => setClient(p => ({ ...p, client_email: e.target.value }))} /></div>
              <div className="f"><label>Phone</label>
                <input type="tel" placeholder="(403) 555-0100" value={client.client_phone}
                  onChange={e => setClient(p => ({ ...p, client_phone: e.target.value }))} /></div>
            </div>
            <div className="r1"><div className="f">
              <label>Address</label>
              <input placeholder="123 Maple St" value={client.client_address}
                onChange={e => setClient(p => ({ ...p, client_address: e.target.value }))} />
            </div></div>
            <div className="r2">
              <div className="f"><label>City</label>
                <input placeholder="Calgary" value={client.client_city}
                  onChange={e => setClient(p => ({ ...p, client_city: e.target.value }))} /></div>
              <div className="f"><label>Province</label>
                <select value={client.client_province}
                  onChange={e => setClient(p => ({ ...p, client_province: e.target.value }))}>
                  {Object.entries(TAX_RATES).sort().map(([k, [, lbl]]) => (
                    <option key={k} value={k}>{k} — {lbl}</option>
                  ))}
                </select></div>
            </div>
            <div className="r1"><div className="f">
              <label>Scope of Work</label>
              <textarea placeholder="Replace 3 bedroom windows, 1 patio door..." rows={3}
                value={client.scope_notes}
                style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, color: 'var(--jet)', outline: 'none', width: '100%', resize: 'vertical' }}
                onChange={e => setClient(p => ({ ...p, scope_notes: e.target.value }))} />
            </div></div>
          </>
        )}

        {/* ── STEP 2: OPENINGS ── */}
        {step === 2 && (
          <>
            <div className="info-box">Add each window or door as a separate opening. Quantities and options affect the price.</div>
            {openings.map((op, idx) => (
              <div key={op.id} className="op-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="op-badge">{idx + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>
                      {OPENING_TYPES[op.type]?.name || 'Opening'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
                      {fmtCAD(opCost(op, 1.0, customPrices))}
                    </div>
                    {openings.length > 1 && (
                      <button onClick={() => removeOpening(op.id)}
                        style={{ background: 'rgba(239,68,68,.1)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer' }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="r2" style={{ marginBottom: 8 }}>
                  <div className="f"><label>Type</label>
                    <select value={op.type} onChange={e => updateOpening(op.id, 'type', e.target.value)}>
                      {Object.entries(OPENING_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.name}</option>
                      ))}
                    </select></div>
                  <div className="f"><label>Qty</label>
                    <select value={op.qty} onChange={e => updateOpening(op.id, 'qty', Number(e.target.value))}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select></div>
                </div>

                <div className="r2" style={{ marginBottom: 8 }}>
                  <div className="f"><label>Size</label>
                    <select value={op.width} onChange={e => updateOpening(op.id, 'width', e.target.value)}>
                      <option value="sm">Small (−15%)</option>
                      <option value="md">Medium (std)</option>
                      <option value="lg">Large (+20%)</option>
                      <option value="xl">XL (+40%)</option>
                    </select></div>
                  <div className="f"><label>Shape</label>
                    <select value={op.shape} onChange={e => updateOpening(op.id, 'shape', e.target.value)}>
                      <option value="rect">Rectangle</option>
                      <option value="arch">Arch (+30%)</option>
                      <option value="custom">Custom (+50%)</option>
                    </select></div>
                </div>

                <div className="r2" style={{ marginBottom: 8 }}>
                  <div className="f"><label>Colour</label>
                    <select value={op.colour} onChange={e => updateOpening(op.id, 'colour', e.target.value)}>
                      <option value="white">White</option>
                      <option value="black">Black (+$80)</option>
                      <option value="grey">Grey (+$80)</option>
                      <option value="custom">Custom (+$150)</option>
                    </select></div>
                  <div className="f"><label>Glass</label>
                    <select value={op.glass} onChange={e => updateOpening(op.id, 'glass', e.target.value)}>
                      <option value="clear">Clear</option>
                      <option value="lowe">Low-E (+$60)</option>
                      <option value="frosted">Frosted (+$90)</option>
                      <option value="tinted">Tinted (+$70)</option>
                      <option value="tempered">Tempered (+$110)</option>
                    </select></div>
                </div>

                <div className="r2" style={{ marginBottom: 8 }}>
                  <div className="f"><label>Frame</label>
                    <select value={op.frame} onChange={e => updateOpening(op.id, 'frame', e.target.value)}>
                      <option value="none">Good condition</option>
                      <option value="repair">Needs repair (+$120)</option>
                      <option value="rotted">Rotted (+$280)</option>
                    </select></div>
                  <div className="f"><label>Install type</label>
                    <select value={op.install} onChange={e => updateOpening(op.id, 'install', e.target.value)}>
                      <option value="insert">Insert / retrofit</option>
                      <option value="fullframe">Full frame (+$200)</option>
                    </select></div>
                </div>

                <div className="r2">
                  <div className="f"><label>Floor</label>
                    <select value={op.floor} onChange={e => updateOpening(op.id, 'floor', e.target.value)}>
                      <option value="first">Ground floor</option>
                      <option value="second">2nd floor (+$80)</option>
                      <option value="third">3rd+ floor (+$180)</option>
                    </select></div>
                  <div className="f"><label>Room (optional)</label>
                    <input placeholder="Living room" value={op.room}
                      onChange={e => updateOpening(op.id, 'room', e.target.value)} /></div>
                </div>
              </div>
            ))}

            <button onClick={addOpening}
              style={{ width: '100%', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, color: 'var(--ash)', cursor: 'pointer', marginBottom: 14 }}>
              + Add another opening
            </button>
          </>
        )}

        {/* ── STEP 3: TIER ── */}
        {step === 3 && (
          <>
            <div className="info-box">
              Present all three options to your client — they choose. Most clients pick Better or Best.
            </div>
            <div className="tier-grid">
              {TIERS.map(t => (
                <div key={t.key} className={`tier${tier === t.key ? ' on' : ''}`}
                  onClick={() => setTier(t.key)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="t-tag">{t.label}</span>
                    {t.badge && <span className="t-badge">{t.badge}</span>}
                  </div>
                  <div className="t-price">{fmtCAD(subtotal * t.mult)}</div>
                  <div className="t-sub">+{fmtCAD(subtotal * t.mult * taxRate)} tax = {fmtCAD(subtotal * t.mult * (1 + taxRate))}</div>
                  <div className="t-why">{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ash)', textAlign: 'center' }}>
              Your client will see all three tiers and choose on their device
            </div>
          </>
        )}

        {/* ── STEP 4: REVIEW ── */}
        {step === 4 && (
          <>
            <div className="sum-box">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jet)', marginBottom: 10 }}>
                {client.client_name} — {client.client_city || 'N/A'}
              </div>
              {openings.map((op) => (
                <div key={op.id} className="sum-row">
                  <span>{OPENING_TYPES[op.type]?.name} × {op.qty}</span>
                  <span>{fmtCAD(opCost(op, mult, customPrices))}</span>
                </div>
              ))}
              <div className="sum-row" style={{ marginTop: 6, paddingTop: 6 }}>
                <span>Subtotal ({tier.charAt(0).toUpperCase() + tier.slice(1)})</span>
                <span>{fmtCAD(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="sum-row" style={{ color: '#16a34a' }}>
                  <span>Discount{discountType === 'percent' ? ` (${discountValue}%)` : ''}</span>
                  <span>−{fmtCAD(discountAmt)}</span>
                </div>
              )}
              <div className="sum-row">
                <span>{taxLabel}</span>
                <span>{fmtCAD(taxAmount)}</span>
              </div>
              <div className="sum-total">
                <span className="sum-total-l">Total</span>
                <span className="sum-total-v">{fmtCAD(total)}</span>
              </div>
            </div>

            {/* Discount */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)', marginBottom: 8 }}>Discount (optional)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                  <button onClick={() => setDiscountType('fixed')}
                    style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: discountType === 'fixed' ? '#2045B8' : 'var(--surface)',
                      color: discountType === 'fixed' ? '#fff' : 'var(--ash)' }}>
                    $
                  </button>
                  <button onClick={() => setDiscountType('percent')}
                    style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: discountType === 'percent' ? '#2045B8' : 'var(--surface)',
                      color: discountType === 'percent' ? '#fff' : 'var(--ash)' }}>
                    %
                  </button>
                </div>
                <input type="number" min="0" placeholder={discountType === 'fixed' ? '0.00' : '0'}
                  value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                  style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--jet)', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* Payment method */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)', marginBottom: 8 }}>Payment Method (optional)</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Cash', 'E-transfer', 'Cheque', 'Financing'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)}
                    style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                      borderColor: paymentMethod === m ? '#2045B8' : 'var(--border)',
                      background: paymentMethod === m ? 'rgba(32,69,184,.1)' : 'var(--surface)',
                      color: paymentMethod === m ? '#2045B8' : 'var(--ash)' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {client.scope_notes && (
              <div className="info-box" style={{ marginBottom: 14 }}>
                <strong>Scope:</strong> {client.scope_notes}
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 16, lineHeight: 1.6 }}>
              Valid for 30 days. Client will receive a link to view all three tiers, choose, and sign electronically.
            </div>

            <button className="gen-btn" onClick={saveEstimate} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Estimate →'}
            </button>
          </>
        )}

        <div style={{ height: 80 }} />
      </div>

      {/* Footer nav */}
      <div className="nav">
        {step > 1
          ? <button className="btn-back" onClick={back}>← Back</button>
          : <button className="btn-back" onClick={() => router.push('/dashboard/estimates')}>← Cancel</button>
        }
        {step < 4
          ? <button className="btn-next" onClick={next}>Continue →</button>
          : null
        }
      </div>
    </div>
  )
}
