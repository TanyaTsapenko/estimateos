'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { OPENING_TYPES, TAX_RATES, opCost, fmtCAD, dimToSizeBucket, type Opening, type CustomPrices } from '@/lib/pricing'
import { formatPhone, validateName, validatePhone, validateEmail, validateAddress, hasErrors, type ClientErrors } from '@/lib/clientValidation'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const estErrStyle: React.CSSProperties = { fontSize: 11, color: '#C0341A', marginTop: 4 }
const estErrBorder = '1.5px solid #C0341A'

interface Tier { display_name: string; specs: string[]; pricing_type: 'fixed' | 'per_sqft'; price: number }
type CustomOpeningType = { label: string; base: number; lab: number; category?: string; is_tiered?: boolean; tier_good?: Tier | null; tier_better?: Tier | null; tier_best?: Tier | null }

function OpeningTypeSelect({ value, onChange, customOpeningTypes, customPrices }: {
  value: string
  onChange: (v: string) => void
  customOpeningTypes?: Record<string, CustomOpeningType>
  customPrices?: CustomPrices
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Build a flat list of all items, grouped by category
  const allItems: Array<{ key: string; name: string; price: number; category: string; is_tiered?: boolean }> = []
  Object.entries(OPENING_TYPES).forEach(([k, v]) => {
    const cat = k.startsWith('window_') ? 'Windows' : k.startsWith('door_') ? 'Doors' : 'Other'
    const dbPrice = customPrices?.types?.[k]
    const price = dbPrice ? dbPrice.base + dbPrice.lab : v.base + v.lab
    allItems.push({ key: k, name: v.name, price, category: cat })
  })
  if (customOpeningTypes) {
    Object.entries(customOpeningTypes).forEach(([k, v]) => {
      if (!allItems.find(i => i.key === k)) {
        allItems.push({ key: k, name: v.label, price: v.base + v.lab, category: v.category || 'Other', is_tiered: v.is_tiered })
      }
    })
  }
  const grouped = allItems.reduce<Record<string, typeof allItems>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const selectedName = OPENING_TYPES[value]?.name || customOpeningTypes?.[value]?.label || value

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 8, padding: '9px 10px', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 13, color: 'var(--jet)', textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{selectedName}</span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
          maxHeight: 340, overflowY: 'auto',
        }}>
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              {/* Category divider */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', background: '#F8FAFC',
                borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9',
              }}>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                  {category}
                </span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>
              {catItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { onChange(item.key); setOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    padding: '10px 12px', border: 'none',
                    background: item.key === value ? 'rgba(37,99,235,.07)' : '#fff',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    color: 'var(--jet)', textAlign: 'left', gap: 8,
                  }}
                >
                  {item.key === value
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}><polyline points="2 7 5.5 10.5 12 3.5"/></svg>
                    : <div style={{ width: 14, flexShrink: 0 }} />
                  }
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: item.is_tiered ? '#3B6CFF' : '#64748B', fontWeight: 600, flexShrink: 0 }}>{item.is_tiered ? '3 Tiers' : fmtCAD(item.price)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ClientInfo {
  client_name: string; client_email: string; client_phone: string
  client_address: string; client_city: string; client_province: string; client_postal_code: string
}

const TIERS = [
  { key: 'good',   label: 'Good',   mult: 1.0, desc: 'Standard materials & workmanship',   badge: '' },
  { key: 'better', label: 'Better', mult: 1.2, desc: 'Mid-grade product, 5-yr warranty',   badge: 'POPULAR' },
  { key: 'best',   label: 'Best',   mult: 1.4, desc: 'Premium product, lifetime warranty', badge: 'BEST VALUE' },
]

function calcTierTotal(ops: Opening[], tierKey: 'good' | 'better' | 'best', customTypes: Record<string, CustomOpeningType>, customPrices: CustomPrices | undefined): number {
  return ops.reduce((sum, op) => {
    const item = customTypes[op.type]
    if (item?.is_tiered) {
      const t = tierKey === 'good' ? item.tier_good : tierKey === 'better' ? item.tier_better : item.tier_best
      if (!t) return sum
      const unit = t.pricing_type === 'per_sqft'
        ? t.price * ((op.width_in || 0) / 12) * ((op.height_in || 0) / 12)
        : t.price
      return sum + unit * op.qty
    }
    return sum + opCost(op, 1.0, customPrices)
  }, 0)
}

const DEFAULT_OPENING: Omit<Opening, 'id'> = {
  type: 'window_dh', qty: 1, width: 'md', width_in: 0, height_in: 0,
  shape: 'rect', colour: 'white', glass: 'clear', frame: 'none',
  install: 'retrofit', floor: 'first', room: '', sidelight: 0, transom: 0, screen: 0,
}

interface OpeningCardProps {
  op: Opening
  idx: number
  customOpeningTypes: Record<string, CustomOpeningType>
  customPrices: CustomPrices | undefined
  openingsCount: number
  removeOpening: (id: string) => void
  updateOpening: (id: string, k: keyof Opening, v: string | number) => void
}

function OpeningCard({ op, idx, customOpeningTypes, customPrices, openingsCount, removeOpening, updateOpening }: OpeningCardProps) {
  return (
    <div className="op-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="op-badge">{idx + 1}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>
            {OPENING_TYPES[op.type]?.name || customOpeningTypes[op.type]?.label || 'Opening'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: customOpeningTypes[op.type]?.is_tiered ? '#3B6CFF' : 'var(--amber)' }}>
            {customOpeningTypes[op.type]?.is_tiered ? (() => {
              const t = customOpeningTypes[op.type]?.tier_better
              if (!t) return '3 Tiers'
              const unit = t.pricing_type === 'per_sqft' ? t.price * ((op.width_in||0)/12) * ((op.height_in||0)/12) : t.price
              return fmtCAD(unit * op.qty)
            })() : fmtCAD(opCost(op, 1.0, customPrices))}
          </div>
          {openingsCount > 1 && (
            <button onClick={() => removeOpening(op.id)}
              style={{ background: 'rgba(239,68,68,.1)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="r2" style={{ marginBottom: 8 }}>
        <div className="f"><label>Type</label>
          <OpeningTypeSelect value={op.type} onChange={v => updateOpening(op.id, 'type', v)} customOpeningTypes={customOpeningTypes} customPrices={customPrices} /></div>
        <div className="f"><label>Qty</label>
          <select value={op.qty} onChange={e => updateOpening(op.id, 'qty', Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select></div>
      </div>

      {customOpeningTypes[op.type]?.is_tiered && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
          {(['good', 'better', 'best'] as const).map(tk => {
            const TIER_COLORS: Record<string, string> = { good: '#64748B', better: '#3B6CFF', best: '#D97706' }
            const TIER_LABELS: Record<string, string> = { good: 'Good', better: 'Better', best: 'Best' }
            const item = customOpeningTypes[op.type]!
            const t = tk === 'good' ? item.tier_good : tk === 'better' ? item.tier_better : item.tier_best
            const color = TIER_COLORS[tk]
            if (!t) return <div key={tk} />
            const unit = t.pricing_type === 'per_sqft'
              ? t.price * ((op.width_in || 0) / 12) * ((op.height_in || 0) / 12)
              : t.price
            return (
              <div key={tk} style={{ border: `1.5px solid ${color}44`, background: `${color}08`, borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{TIER_LABELS[tk]}</div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 3 }}>{t.display_name}</div>
                {t.specs.slice(0, 2).map((s, i) => (
                  <div key={i} style={{ fontSize: 9, color: '#94A3B8', lineHeight: 1.4 }}>• {s}</div>
                ))}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', marginTop: 5 }}>{fmtCAD(unit * op.qty)}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="r2" style={{ marginBottom: 8 }}>
        <div className="f"><label>Width</label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="0" step="0.5" placeholder="32"
              value={op.width_in || ''}
              onChange={e => updateOpening(op.id, 'width_in', e.target.value ? parseFloat(e.target.value) : 0)}
              style={{ paddingRight: 28 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ash)', pointerEvents: 'none' }}>in</span>
          </div></div>
        <div className="f"><label>Height</label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="0" step="0.5" placeholder="48"
              value={op.height_in || ''}
              onChange={e => updateOpening(op.id, 'height_in', e.target.value ? parseFloat(e.target.value) : 0)}
              style={{ paddingRight: 28 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ash)', pointerEvents: 'none' }}>in</span>
          </div></div>
      </div>

      <div className="r2" style={{ marginBottom: 8 }}>
        <div className="f"><label>Shape</label>
          <select value={op.shape} onChange={e => updateOpening(op.id, 'shape', e.target.value)}>
            <option value="rect">Rectangle</option>
            <option value="arch">Arch (+30%)</option>
            <option value="custom">Custom (+50%)</option>
          </select></div>
        <div className="f"><label>Colour</label>
          <select value={op.colour} onChange={e => updateOpening(op.id, 'colour', e.target.value)}>
            <option value="white">White</option>
            <option value="black">Black (+$80)</option>
            <option value="grey">Grey (+$80)</option>
            <option value="custom">Custom (+$150)</option>
          </select></div>
      </div>

      <div className="r2" style={{ marginBottom: 8 }}>
        <div className="f"><label>Glass</label>
          <select value={op.glass} onChange={e => updateOpening(op.id, 'glass', e.target.value)}>
            <option value="clear">Clear</option>
            <option value="lowe">Low-E (+$60)</option>
            <option value="frosted">Frosted (+$90)</option>
            <option value="tinted">Tinted (+$70)</option>
            <option value="tempered">Tempered (+$110)</option>
          </select></div>
        <div className="f"><label>Frame</label>
          <select value={op.frame} onChange={e => updateOpening(op.id, 'frame', e.target.value)}>
            <option value="none">Good condition</option>
            <option value="repair">Needs repair (+$120)</option>
            <option value="rotted">Rotted (+$280)</option>
          </select></div>
      </div>

      <div className="r1" style={{ marginBottom: 8 }}>
        <div className="f"><label>Installation</label>
          <select value={op.install} onChange={e => updateOpening(op.id, 'install', e.target.value)}>
            <option value="retrofit">Retrofit</option>
            <option value="fullframe">Full Frame (+$200)</option>
            <option value="stud_to_stud">Stud to Stud (+$350)</option>
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
  )
}

function NewEstimateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const apptId = searchParams.get('appointment_id') || ''
  const editId = searchParams.get('edit') || ''

  const [client, setClient] = useState<ClientInfo>({
    client_name: searchParams.get('client_name') || '',
    client_email: '',
    client_phone: '',
    client_address: searchParams.get('client_address') || '',
    client_city: '', client_province: 'AB', client_postal_code: '',
  })

  const [openings, setOpenings] = useState<Opening[]>([{ id: '1', ...DEFAULT_OPENING }])
  const [tier, setTier] = useState('better')
  const [pricingMode, setPricingMode] = useState<'single' | 'gbb'>('single')
  const [profile, setProfile] = useState<{ province: string } | null>(null)
  const [customPrices, setCustomPrices] = useState<CustomPrices | undefined>(undefined)
  const [customOpeningTypes, setCustomOpeningTypes] = useState<Record<string, CustomOpeningType>>({})
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('')
  const [clientErrors, setClientErrors] = useState<ClientErrors>({})
  const userIdRef = useRef<string | null>(null)

  const setCErr = (k: keyof ClientErrors, v: string | null) => setClientErrors(p => ({ ...p, [k]: v }))
  const clearCErr = (k: keyof ClientErrors) => setCErr(k, null)

  function applyPriceRows(priceRows: any[] | null) {
    if (!priceRows || priceRows.length === 0) return
    const types: Record<string, { base: number; lab: number }> = {}
    priceRows.filter((r: any) => r.opening_type !== '_sizes').forEach((r: any) => {
      types[r.opening_type] = { base: r.base_price, lab: r.labour_price }
    })
    setCustomPrices({ types })
    const customTypesMap: Record<string, CustomOpeningType> = {}
    priceRows.filter((r: any) => r.opening_type !== '_sizes' && r.custom_label).forEach((r: any) => {
      customTypesMap[r.opening_type] = {
        label:       r.custom_label,
        base:        r.base_price,
        lab:         r.labour_price,
        category:    r.category    || 'Other',
        is_tiered:   r.is_tiered   || false,
        tier_good:   r.tier_good   || null,
        tier_better: r.tier_better || null,
        tier_best:   r.tier_best   || null,
      }
    })
    setCustomOpeningTypes(customTypesMap)
  }

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || !userIdRef.current) return
      const { data: priceRows } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', userIdRef.current)
      applyPriceRows(priceRows)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      userIdRef.current = user.id
      const [{ data: prof }, { data: priceRows }] = await Promise.all([
        supabase.from('profiles').select('province, pricing_mode').eq('id', user.id).single(),
        supabase.from('price_lists').select('*').eq('user_id', user.id).order('category', { nullsFirst: false }).order('custom_label', { nullsFirst: false }),
      ])
      if (prof) {
        setProfile(prof)
        setPricingMode((prof as any).pricing_mode === 'gbb' ? 'gbb' : 'single')
      }
      if (editId) {
        const [{ data: est }, { data: ops }] = await Promise.all([
          supabase.from('estimates').select('*').eq('id', editId).single(),
          supabase.from('estimate_openings').select('*').eq('estimate_id', editId).order('sort_order'),
        ])
        if (est) {
          setClient({
            client_name:     est.client_name || '',
            client_email:    est.client_email || '',
            client_phone:    est.client_phone || '',
            client_address:  est.client_address || '',
            client_city:        est.client_city || '',
            client_province:    est.client_province || 'AB',
            client_postal_code: (est as any).client_postal_code || '',
          })
          setTier(est.tier || 'better')
          if (est.discount_type) {
            setDiscountType(est.discount_type as 'fixed' | 'percent')
            setDiscountValue(String(est.discount_value || ''))
          }
        }
        if (ops && ops.length > 0) {
          setOpenings(ops.map((op: any) => ({
            id: op.id,
            type: op.type, qty: op.qty,
            width: op.width, width_in: op.width_in || '', height_in: op.height_in || '',
            shape: op.shape, colour: op.colour, glass: op.glass, frame: op.frame,
            install: op.install, floor: op.floor, room: op.room || '',
            sidelight: op.sidelight, transom: op.transom, screen: op.screen,
          })))
        }
      } else if (apptId) {
        const { data: appt } = await supabase
          .from('appointments')
          .select('client_name, client_phone, client_email, client_address, client_city, client_province, postal_code, notes')
          .eq('id', apptId)
          .maybeSingle()
        if (appt) {
          setClient(p => ({
            ...p,
            ...(appt.client_name     && { client_name:     appt.client_name }),
            ...(appt.client_phone    && { client_phone:    appt.client_phone }),
            ...(appt.client_email    && { client_email:    appt.client_email }),
            ...(appt.client_address  && { client_address:  appt.client_address }),
            ...(appt.client_city     && { client_city:        appt.client_city }),
            ...(appt.client_province && { client_province:    appt.client_province }),
            ...(appt.postal_code     && { client_postal_code: appt.postal_code }),
          }))
        }
      }
      applyPriceRows(priceRows)
    })
  }, [])

  const mult = TIERS.find(t => t.key === tier)?.mult || 1.2
  const province = client.client_province || profile?.province || 'AB'
  const [taxRate, taxLabel] = TAX_RATES[province] || [0.05, 'GST (5%)']
  const hasAnyTieredItems = openings.some(op => !!customOpeningTypes[op.type]?.is_tiered)
  const gbbGood   = hasAnyTieredItems ? calcTierTotal(openings, 'good',   customOpeningTypes, customPrices) : null
  const gbbBetter = hasAnyTieredItems ? calcTierTotal(openings, 'better', customOpeningTypes, customPrices) : null
  const gbbBest   = hasAnyTieredItems ? calcTierTotal(openings, 'best',   customOpeningTypes, customPrices) : null
  const subtotal = hasAnyTieredItems
    ? (gbbBetter ?? 0)
    : openings.reduce((s, op) => s + opCost(op, mult, customPrices), 0)
  const discountAmt = discountValue
    ? discountType === 'percent'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0
  const afterDiscount = subtotal - discountAmt
  const taxAmount = afterDiscount * taxRate
  const total = afterDiscount + taxAmount

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

  function validateClientFields(): ClientErrors {
    return {
      client_name:    validateName(client.client_name),
      client_phone:   validatePhone(client.client_phone),
      client_email:   validateEmail(client.client_email),
      client_address: validateAddress(client.client_address),
    }
  }
  function next() {
    if (step === 1) {
      const errs = validateClientFields()
      setClientErrors(errs)
      if (hasErrors(errs)) return
    }
    setError('')
    const nextStep = step === 2 ? 4 : step + 1
    setStep(nextStep)
    window.scrollTo(0, 0)
  }
  function back() {
    setError('')
    const prevStep = step === 4 ? 2 : step - 1
    setStep(prevStep)
    window.scrollTo(0, 0)
  }

  async function saveEstimate() {
    const errs = validateClientFields()
    setClientErrors(errs)
    if (hasErrors(errs)) return
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const estimateFields = {
      ...client,
      tier,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_type: discountAmt > 0 ? discountType : null,
      discount_value: discountAmt > 0 ? parseFloat(discountValue) : null,
      discount_amount: Math.round(discountAmt * 100) / 100,
      tax_rate: taxRate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      has_tiers:       hasAnyTieredItems,
      subtotal_good:   gbbGood   !== null ? Math.round(gbbGood   * 100) / 100 : null,
      subtotal_better: gbbBetter !== null ? Math.round(gbbBetter * 100) / 100 : null,
      subtotal_best:   gbbBest   !== null ? Math.round(gbbBest   * 100) / 100 : null,
      total_good:      gbbGood   !== null ? Math.round(gbbGood   * (1 + taxRate) * 100) / 100 : null,
      total_better:    gbbBetter !== null ? Math.round(gbbBetter * (1 + taxRate) * 100) / 100 : null,
      total_best:      gbbBest   !== null ? Math.round(gbbBest   * (1 + taxRate) * 100) / 100 : null,
    }

    let savedId: string

    if (editId) {
      const { error: estErr } = await supabase.from('estimates').update(estimateFields).eq('id', editId)
      if (estErr) { setError(estErr.message); setSaving(false); return }
      savedId = editId
    } else {
      const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      const num = `EST-${String((count || 0) + 1).padStart(4, '0')}`
      const { data: est, error: estErr } = await supabase.from('estimates').insert({
        user_id: user.id,
        estimate_number: num,
        ...estimateFields,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        appointment_id: apptId || null,
      }).select('id').single()
      if (estErr || !est) { setError(estErr?.message || 'Failed to save'); setSaving(false); return }
      savedId = est.id
    }

    const rows = openings.map((op, i) => ({
      estimate_id: savedId,
      type: op.type, qty: op.qty,
      width: (op.width_in && op.height_in) ? dimToSizeBucket(op.width_in, op.height_in) : op.width,
      width_in: op.width_in || null,
      height_in: op.height_in || null,
      shape: op.shape, colour: op.colour, glass: op.glass, frame: op.frame,
      install: op.install, floor: op.floor, room: op.room,
      sidelight: op.sidelight, transom: op.transom, screen: op.screen,
      unit_cost: Math.round(opCost({ ...op, qty: 1 }, mult, customPrices) * 100) / 100,
      total_cost: Math.round(opCost(op, mult, customPrices) * 100) / 100,
      sort_order: i,
    }))

    if (editId) {
      await supabase.from('estimate_openings').delete().eq('estimate_id', editId)
    }
    const { error: opErr } = await supabase.from('estimate_openings').insert(rows)
    if (opErr) { setError(opErr.message); setSaving(false); return }

    if (!editId && apptId) {
      await supabase.from('appointments').update({ estimate_id: savedId, status: 'completed' }).eq('id', apptId)
    }

    router.push(`/dashboard/estimates/${savedId}`)
  }

  // ── DESKTOP TWO-COL FORM ─────────────────────
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{
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
            <button onClick={() => router.back()} style={{
              background: '#F5F6F8', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748B',
            }}>←</button>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>{editId ? 'EDIT ESTIMATE' : 'NEW ESTIMATE'}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
                {client.client_name || (editId ? 'Edit Estimate' : 'New Estimate')}
              </div>
            </div>
          </div>
          {step > 1 && subtotal > 0 && (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>
              {openings.length} opening{openings.length !== 1 ? 's' : ''} · {fmtCAD(total)}
            </div>
          )}
        </div>

        <div className="dash-bg screen-enter">
          {error && <div className="error-msg">{error}</div>}

          <div className="form-2col">
            {/* ── LEFT: Client + Pricing ── */}
            <div className="form-sticky">
              <div className="sl">Client Info</div>

              <div className="r1"><div className="f">
                <label>Client Name *</label>
                <input
                  placeholder="Andriy Koval"
                  value={client.client_name}
                  style={clientErrors.client_name ? { border: estErrBorder } : undefined}
                  onChange={e => { clearCErr('client_name'); setClient(p => ({ ...p, client_name: e.target.value })) }}
                  onBlur={() => setCErr('client_name', validateName(client.client_name))}
                />
                {clientErrors.client_name && <div style={estErrStyle}>{clientErrors.client_name}</div>}
              </div></div>
              <div className="r2">
                <div className="f"><label>Email</label>
                  <input
                    type="email"
                    placeholder="andriy@email.com"
                    value={client.client_email}
                    style={clientErrors.client_email ? { border: estErrBorder } : undefined}
                    onChange={e => { clearCErr('client_email'); setClient(p => ({ ...p, client_email: e.target.value })) }}
                    onBlur={() => setCErr('client_email', validateEmail(client.client_email))}
                  />
                  {clientErrors.client_email && <div style={estErrStyle}>{clientErrors.client_email}</div>}
                </div>
                <div className="f"><label>Phone</label>
                  <input
                    type="tel"
                    placeholder="(403) 555-0100"
                    value={client.client_phone}
                    style={clientErrors.client_phone ? { border: estErrBorder } : undefined}
                    onChange={e => { clearCErr('client_phone'); setClient(p => ({ ...p, client_phone: formatPhone(e.target.value) })) }}
                    onBlur={() => setCErr('client_phone', validatePhone(client.client_phone))}
                  />
                  {clientErrors.client_phone && <div style={estErrStyle}>{clientErrors.client_phone}</div>}
                </div>
              </div>
              <div className="r1"><div className="f">
                <label>Address</label>
                <AddressAutocomplete
                  value={client.client_address}
                  placeholder="123 Maple St"
                  error={!!clientErrors.client_address}
                  onChange={v => { clearCErr('client_address'); setClient(p => ({ ...p, client_address: v })) }}
                  onBlur={() => setCErr('client_address', validateAddress(client.client_address))}
                  onSelect={({ street, city, province }) => {
                    clearCErr('client_address')
                    setClient(p => ({
                      ...p,
                      client_address: street,
                      ...(city     && { client_city: city }),
                      ...(province && TAX_RATES[province] && { client_province: province }),
                    }))
                  }}
                />
                {clientErrors.client_address && <div style={estErrStyle}>{clientErrors.client_address}</div>}
              </div></div>
              <div className="sl" style={{ marginTop: 20 }}>Tier</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {TIERS.map(t => (
                  <button key={t.key} onClick={() => setTier(t.key)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                      borderColor: tier === t.key ? 'var(--blue)' : 'var(--border)',
                      background: tier === t.key ? 'rgba(59,108,255,.08)' : 'var(--surface)',
                      color: tier === t.key ? 'var(--blue-dark)' : 'var(--ash)',
                    }}>
                    <div>{t.label}</div>
                    <div style={{ fontSize: 10, marginTop: 2, opacity: .7 }}>{fmtCAD(subtotal * t.mult / (mult))}</div>
                  </button>
                ))}
              </div>

              <div className="sl" style={{ marginTop: 4 }}>Discount & Payment</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                    <button onClick={() => setDiscountType('fixed')}
                      style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        background: discountType === 'fixed' ? '#2045B8' : 'var(--surface)',
                        color: discountType === 'fixed' ? '#fff' : 'var(--ash)' }}>$</button>
                    <button onClick={() => setDiscountType('percent')}
                      style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        background: discountType === 'percent' ? '#2045B8' : 'var(--surface)',
                        color: discountType === 'percent' ? '#fff' : 'var(--ash)' }}>%</button>
                  </div>
                  <input type="number" min="0" placeholder={discountType === 'fixed' ? '0.00' : '0'}
                    value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                    style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--jet)', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div className="sl" style={{ marginTop: 4 }}>Summary</div>
              <div className="sum-box">
                {openings.map(op => (
                  <div key={op.id} className="sum-row">
                    <span>{(OPENING_TYPES[op.type]?.name || customOpeningTypes[op.type]?.label || op.type)} × {op.qty}</span>
                    {customOpeningTypes[op.type]?.is_tiered
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: '#3B6CFF' }}>3 Tiers</span>
                      : <span>{fmtCAD(opCost(op, mult, customPrices))}</span>
                    }
                  </div>
                ))}
                {hasAnyTieredItems ? (
                  <>
                    <div className="sum-row" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ color: '#64748B' }}>Good total</span>
                      <span>{fmtCAD((gbbGood || 0) * (1 + taxRate))}</span>
                    </div>
                    <div className="sum-row" style={{ fontWeight: 700, color: '#3B6CFF' }}>
                      <span>Better total ★</span>
                      <span>{fmtCAD((gbbBetter || 0) * (1 + taxRate))}</span>
                    </div>
                    <div className="sum-row" style={{ color: '#D97706' }}>
                      <span>Best total</span>
                      <span>{fmtCAD((gbbBest || 0) * (1 + taxRate))}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>All totals include {taxLabel}</div>
                  </>
                ) : (
                  <>
                    <div className="sum-row" style={{ marginTop: 6, paddingTop: 6 }}>
                      <span>Subtotal</span>
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
                  </>
                )}
              </div>

              <button onClick={saveEstimate} disabled={saving} style={{
                width: '100%', padding: 14, borderRadius: 10, border: 'none',
                background: saving ? '#CBD5E1' : '#2563EB', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {saving ? 'Saving...' : 'Save Estimate →'}
              </button>
            </div>

            {/* ── RIGHT: Openings ── */}
            <div>
              <div className="sl">Openings ({openings.length})</div>
              <div className="info-box">Add each window or door. Quantities and options affect the price.</div>
              <div className="op-cards-grid">
                {openings.map((op, idx) => (
                  <OpeningCard key={op.id} op={op} idx={idx}
                    customOpeningTypes={customOpeningTypes} customPrices={customPrices}
                    openingsCount={openings.length} removeOpening={removeOpening} updateOpening={updateOpening} />
                ))}
              </div>
              <button onClick={addOpening}
                style={{ width: '100%', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, color: 'var(--ash)', cursor: 'pointer' }}>
                + Add another opening
              </button>
            </div>
          </div>

          <div style={{ height: 40 }} />
        </div>
      </div>
    )
  }

  // ── MOBILE STEPPER ───────────────────────────
  const pills = [1, 2, 3, 4]
  const stepLabels = ['Client', 'Openings', 'Pricing', 'Review']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{
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
          <button onClick={() => step === 1 ? router.back() : back()} style={{
            background: '#F5F6F8', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#64748B',
          }}>←</button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>NEW ESTIMATE</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>
              {client.client_name || 'New Estimate'}
            </div>
          </div>
        </div>
        {step > 1 && subtotal > 0 && (
          <div style={{ fontSize: 13, color: '#94A3B8' }}>
            {openings.length} opening{openings.length !== 1 ? 's' : ''} · {fmtCAD(total)}
          </div>
        )}
      </div>

      <div className="card screen-enter" style={{ paddingTop: 42 }}>
        {error && <div className="error-msg">{error}</div>}

        {step === 1 && (
          <>
            <div className="r1"><div className="f">
              <label>Client Name *</label>
              <input
                placeholder="Andriy Koval"
                value={client.client_name}
                style={clientErrors.client_name ? { border: estErrBorder } : undefined}
                onChange={e => { clearCErr('client_name'); setClient(p => ({ ...p, client_name: e.target.value })) }}
                onBlur={() => setCErr('client_name', validateName(client.client_name))}
              />
              {clientErrors.client_name && <div style={estErrStyle}>{clientErrors.client_name}</div>}
            </div></div>
            <div className="r2">
              <div className="f"><label>Email</label>
                <input
                  type="email"
                  placeholder="andriy@email.com"
                  value={client.client_email}
                  style={clientErrors.client_email ? { border: estErrBorder } : undefined}
                  onChange={e => { clearCErr('client_email'); setClient(p => ({ ...p, client_email: e.target.value })) }}
                  onBlur={() => setCErr('client_email', validateEmail(client.client_email))}
                />
                {clientErrors.client_email && <div style={estErrStyle}>{clientErrors.client_email}</div>}
              </div>
              <div className="f"><label>Phone</label>
                <input
                  type="tel"
                  placeholder="(403) 555-0100"
                  value={client.client_phone}
                  style={clientErrors.client_phone ? { border: estErrBorder } : undefined}
                  onChange={e => { clearCErr('client_phone'); setClient(p => ({ ...p, client_phone: formatPhone(e.target.value) })) }}
                  onBlur={() => setCErr('client_phone', validatePhone(client.client_phone))}
                />
                {clientErrors.client_phone && <div style={estErrStyle}>{clientErrors.client_phone}</div>}
              </div>
            </div>
            <div className="r1"><div className="f">
              <label>Address</label>
              <AddressAutocomplete
                value={client.client_address}
                placeholder="123 Maple St"
                error={!!clientErrors.client_address}
                onChange={v => { clearCErr('client_address'); setClient(p => ({ ...p, client_address: v })) }}
                onBlur={() => setCErr('client_address', validateAddress(client.client_address))}
                onSelect={({ street, city, province }) => {
                  clearCErr('client_address')
                  setClient(p => ({
                    ...p,
                    client_address: street,
                    ...(city     && { client_city: city }),
                    ...(province && TAX_RATES[province] && { client_province: province }),
                  }))
                }}
              />
              {clientErrors.client_address && <div style={estErrStyle}>{clientErrors.client_address}</div>}
            </div></div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="info-box">Add each window or door as a separate opening. Quantities and options affect the price.</div>
            {openings.map((op, idx) => <OpeningCard key={op.id} op={op} idx={idx}
              customOpeningTypes={customOpeningTypes} customPrices={customPrices}
              openingsCount={openings.length} removeOpening={removeOpening} updateOpening={updateOpening} />)}
            <button onClick={addOpening}
              style={{ width: '100%', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, color: 'var(--ash)', cursor: 'pointer', marginBottom: 14 }}>
              + Add another opening
            </button>
          </>
        )}

        {step === 3 && pricingMode === 'gbb' && (
          <>
            <div className="info-box">
              Present all three options to your client — they choose. Most clients pick Better or Best.
            </div>
            <div className="tier-grid">
              {TIERS.map(t => (
                <div key={t.key} className={`tier${tier === t.key ? ' on' : ''}`} onClick={() => setTier(t.key)}>
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

        {step === 4 && (
          <>
            <div className="sum-box" style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--jet)', marginBottom: 10 }}>
                {client.client_name} — {client.client_address || client.client_city || ''}
              </div>
              {openings.map(op => (
                <div key={op.id} className="sum-row">
                  <span>{OPENING_TYPES[op.type]?.name || customOpeningTypes[op.type]?.label || op.type} × {op.qty}</span>
                  {customOpeningTypes[op.type]?.is_tiered
                    ? <span style={{ fontSize: 11, fontWeight: 600, color: '#3B6CFF' }}>3 Tiers</span>
                    : <span>{fmtCAD(opCost(op, mult, customPrices))}</span>
                  }
                </div>
              ))}
              {hasAnyTieredItems ? (
                <>
                  <div className="sum-row" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Good total</span>
                    <span>{fmtCAD((gbbGood || 0) * (1 + taxRate))}</span>
                  </div>
                  <div className="sum-row" style={{ fontWeight: 700, color: '#3B6CFF' }}>
                    <span>Better total ★</span>
                    <span>{fmtCAD((gbbBetter || 0) * (1 + taxRate))}</span>
                  </div>
                  <div className="sum-row" style={{ color: '#D97706' }}>
                    <span>Best total</span>
                    <span>{fmtCAD((gbbBest || 0) * (1 + taxRate))}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>All totals include {taxLabel}</div>
                </>
              ) : (
                <>
                  <div className="sum-row" style={{ marginTop: 6, paddingTop: 6 }}>
                    <span>Subtotal</span>
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
                </>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jet)', marginBottom: 8 }}>Discount (optional)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                  <button onClick={() => setDiscountType('fixed')}
                    style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: discountType === 'fixed' ? '#2045B8' : 'var(--surface)',
                      color: discountType === 'fixed' ? '#fff' : 'var(--ash)' }}>$</button>
                  <button onClick={() => setDiscountType('percent')}
                    style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: discountType === 'percent' ? '#2045B8' : 'var(--surface)',
                      color: discountType === 'percent' ? '#fff' : 'var(--ash)' }}>%</button>
                </div>
                <input type="number" min="0" placeholder={discountType === 'fixed' ? '0.00' : '0'}
                  value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                  style={{ flex: 1, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: 'var(--jet)', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 16, lineHeight: 1.6 }}>
              Valid for 30 days. Send to client for review.
            </div>

            <button onClick={saveEstimate} disabled={saving} style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: saving ? '#CBD5E1' : '#2563EB', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {saving ? 'Saving...' : 'Save Estimate →'}
            </button>
          </>
        )}

        <div style={{ height: 80 }} />
      </div>

      <div className="nav">
        {step === 1
          ? <button className="btn-back" onClick={() => router.push('/dashboard/estimates')}>← Cancel</button>
          : step < 4
            ? <button className="btn-back" onClick={back}>← Back</button>
            : <div />
        }
        {step < 4 && <button className="btn-next" onClick={next}>Continue →</button>}
      </div>
    </div>
  )
}

export default function NewEstimatePage() {
  return (
    <Suspense fallback={null}>
      <NewEstimateForm />
    </Suspense>
  )
}
