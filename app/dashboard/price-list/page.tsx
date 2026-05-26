'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import ConfirmModal from '@/components/ConfirmModal'

interface PriceRow { base: number; lab: number }
interface CustomType { key: string; label: string; base: number; lab: number }
interface GbbRow { good: number; better: number; best: number }

const DEFAULT_PRICES: Record<string, PriceRow> = Object.fromEntries(
  Object.entries(OPENING_TYPES).map(([k, v]) => [k, { base: v.base, lab: v.lab }])
)

function OpeningIcon({ typeKey }: { typeKey: string }) {
  const isWindow = typeKey.startsWith('window_')
  const isDoor   = typeKey.startsWith('door_')
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isWindow ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2045B8" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2" y="2" width="16" height="16" rx="1.5"/>
          <line x1="10" y1="2" x2="10" y2="18"/>
          <line x1="2" y1="10" x2="18" y2="10"/>
        </svg>
      ) : isDoor ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2045B8" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="1" width="14" height="18" rx="1.5"/>
          <circle cx="14" cy="10.5" r="1.2" fill="#2045B8" stroke="none"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#2045B8" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2" y="2" width="16" height="16" rx="1.5"/>
        </svg>
      )}
    </div>
  )
}

function DragHandle() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="3" cy="3"  r="1.5" fill="#CBD5E1"/>
      <circle cx="9" cy="3"  r="1.5" fill="#CBD5E1"/>
      <circle cx="3" cy="9"  r="1.5" fill="#CBD5E1"/>
      <circle cx="9" cy="9"  r="1.5" fill="#CBD5E1"/>
      <circle cx="3" cy="15" r="1.5" fill="#CBD5E1"/>
      <circle cx="9" cy="15" r="1.5" fill="#CBD5E1"/>
    </svg>
  )
}


const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8',
  textTransform: 'uppercase', marginBottom: 8, marginTop: 20,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#F8FAFC', border: '1.5px solid #E2E8F0',
  borderRadius: 8, padding: '8px 10px', fontSize: 14, color: '#0A1628',
  fontFamily: 'inherit', outline: 'none', minWidth: 0,
}

export default function PriceListPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [prices,           setPrices]           = useState<Record<string, PriceRow>>(DEFAULT_PRICES)
  const [saving,           setSaving]           = useState(false)
  const [saved,            setSaved]            = useState(false)
  const [error,            setError]            = useState('')
  const [loading,          setLoading]          = useState(true)
  const [customTypes,        setCustomTypes]        = useState<CustomType[]>([])
  const [newLabel,           setNewLabel]           = useState('')
  const [expandedKey,        setExpandedKey]        = useState<string | null>(null)
  const [deletingItem,       setDeletingItem]       = useState<{ key: string; name: string; isCustom: boolean } | null>(null)
  const [removedStandardKeys,setRemovedStandardKeys]= useState<string[]>([])
  const [hoverDeleteKey,     setHoverDeleteKey]     = useState<string | null>(null)
  const [userId,             setUserId]             = useState<string | null>(null)
  const [pricingMode,      setPricingMode]      = useState<'single' | 'gbb'>('single')
  const [gbbPrices,        setGbbPrices]        = useState<Record<string, GbbRow>>({})

  // Drag state — refs for use inside stable useEffect closures
  const [dragIndexState,   setDragIndexState]   = useState<number | null>(null)
  const [dragOverState,    setDragOverState]    = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const dragOverRef  = useRef<number | null>(null)
  const itemRefs     = useRef<(HTMLDivElement | null)[]>([])

  function setDragIndex(v: number | null) { dragIndexRef.current = v; setDragIndexState(v) }
  function setDragOver(v: number | null)  { dragOverRef.current  = v; setDragOverState(v) }

  function getOverIndex(clientY: number): number {
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return Math.max(0, itemRefs.current.filter(Boolean).length - 1)
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (dragIndexRef.current === null) return
      e.preventDefault()
      const over = getOverIndex(e.clientY)
      if (over !== dragOverRef.current) setDragOver(over)
    }
    function onUp() {
      if (dragIndexRef.current === null) return
      const from = dragIndexRef.current
      const to   = dragOverRef.current
      if (to !== null && to !== from) {
        setCustomTypes(prev => {
          const arr = [...prev]
          const [item] = arr.splice(from, 1)
          arr.splice(to, 0, item)
          return arr
        })
      }
      setDragIndex(null)
      setDragOver(null)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from('price_lists').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('pricing_mode').eq('id', user.id).single(),
      ])
      if ((prof as any)?.pricing_mode === 'gbb') setPricingMode('gbb')
      if (data && data.length > 0) {
        const loaded: Record<string, PriceRow> = { ...DEFAULT_PRICES }
        data.filter(r => r.opening_type !== '_sizes' && !r.custom_label).forEach(r => {
          loaded[r.opening_type] = { base: r.base_price, lab: r.labour_price }
        })
        setPrices(loaded)
        const customRows = data.filter(r => r.opening_type !== '_sizes' && r.custom_label)
        setCustomTypes(customRows.map(r => ({
          key: r.opening_type, label: r.custom_label,
          base: r.base_price, lab: r.labour_price,
        })))
        const gbb: Record<string, GbbRow> = {}
        data.filter(r => r.opening_type !== '_sizes').forEach(r => {
          gbb[r.opening_type] = { good: r.good_price || 0, better: r.better_price || 0, best: r.best_price || 0 }
        })
        setGbbPrices(gbb)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const zeroCustom = customTypes.find(ct => ct.base + ct.lab === 0)
    if (zeroCustom) {
      setError(`Please enter a price for "${zeroCustom.label}"`)
      setExpandedKey(zeroCustom.key)
      setSaving(false)
      return
    }

    const rows = [
      ...Object.entries(prices).filter(([type]) => !removedStandardKeys.includes(type)).map(([type, p]) => ({
        user_id: user.id, opening_type: type,
        base_price: p.base, labour_price: p.lab,
        ...(pricingMode === 'gbb' ? {
          good_price:   gbbPrices[type]?.good   || null,
          better_price: gbbPrices[type]?.better || null,
          best_price:   gbbPrices[type]?.best   || null,
        } : {}),
        updated_at: new Date().toISOString(),
      })),
      ...customTypes.map(ct => ({
        user_id: user.id, opening_type: ct.key,
        base_price: ct.base, labour_price: ct.lab,
        custom_label: ct.label,
        ...(pricingMode === 'gbb' ? {
          good_price:   gbbPrices[ct.key]?.good   || null,
          better_price: gbbPrices[ct.key]?.better || null,
          best_price:   gbbPrices[ct.key]?.best   || null,
        } : {}),
        updated_at: new Date().toISOString(),
      })),
    ]

    const { error: e } = await supabase.from('price_lists').upsert(rows, { onConflict: 'user_id,opening_type' })
    if (e) { setError(e.message); setSaving(false); return }
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  function setPrice(type: string, field: 'base' | 'lab', raw: string) {
    const val = parseFloat(raw.replace(',', '.')) || 0
    setPrices(p => ({ ...p, [type]: { ...p[type], [field]: val } }))
  }

  function setGbbPrice(type: string, tier: 'good' | 'better' | 'best', raw: string) {
    const val = parseFloat(raw.replace(',', '.')) || 0
    setGbbPrices(g => ({ ...g, [type]: { ...(g[type] || { good: 0, better: 0, best: 0 }), [tier]: val } }))
  }

  function setCustomPrice(key: string, field: 'base' | 'lab', raw: string) {
    const val = parseFloat(raw.replace(',', '.')) || 0
    setCustomTypes(prev => prev.map(ct => ct.key === key ? { ...ct, [field]: val } : ct))
  }

  function toggleExpand(key: string) {
    setExpandedKey(prev => prev === key ? null : key)
  }

  function addCustomType() {
    if (!newLabel.trim()) return
    const key = 'custom_' + Date.now()
    setCustomTypes(prev => [...prev, { key, label: newLabel.trim(), base: 0, lab: 0 }])
    setExpandedKey(key)
    setNewLabel('')
  }

  function onHandlePointerDown(e: React.PointerEvent, index: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragIndex(index)
    setDragOver(index)
  }

  // ── Price display helpers ──
  const priceNum: React.CSSProperties = {
    fontSize: 15, fontWeight: 600, color: '#0B1220', lineHeight: 1,
  }
  const priceSub: React.CSSProperties = {
    fontSize: 10, color: '#94A3B8', marginTop: 2,
  }

  return (
    <>
    <ConfirmModal
      open={!!deletingItem}
      icon="trash"
      title={`Delete ${deletingItem?.name ?? ''}?`}
      body="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={async () => {
        if (!deletingItem || !userId) return
        await supabase.from('price_lists').delete().eq('user_id', userId).eq('opening_type', deletingItem.key)
        if (deletingItem.isCustom) {
          setCustomTypes(prev => prev.filter(t => t.key !== deletingItem.key))
        } else {
          setRemovedStandardKeys(prev => [...prev, deletingItem.key])
        }
        if (expandedKey === deletingItem.key) setExpandedKey(null)
        setDeletingItem(null)
      }}
      onCancel={() => setDeletingItem(null)}
    />

    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EEF0F4',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0,
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/dashboard/settings')} style={{
            width: 32, height: 32, background: '#F5F6F8', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>←</button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>BUSINESS</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>Price List</div>
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{
          padding: '8px 16px', borderRadius: 10, border: 'none',
          background: saved ? '#059669' : saving ? '#CBD5E1' : '#2563EB',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          transition: 'background .2s',
        }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '16px 16px 100px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
        )}

        {!loading && <>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* ── STANDARD TYPES ── */}
          <div style={sectionLabel}>Opening Types</div>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden', marginBottom: 4 }}>
            {Object.entries(OPENING_TYPES).filter(([key]) => !removedStandardKeys.includes(key)).map(([key, def], idx, arr) => {
              const p         = prices[key] || { base: def.base, lab: def.lab }
              const total     = p.base + p.lab
              const isCustom  = p.base !== def.base || p.lab !== def.lab
              const isExpanded = expandedKey === key
              const isLast    = idx === arr.length - 1
              return (
                <div key={key}>
                  <div
                    onClick={() => toggleExpand(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px',
                      borderBottom: (!isExpanded && !isLast) ? '1px solid rgba(10,22,40,0.05)' : 'none',
                      cursor: 'pointer',
                      background: isExpanded ? '#F8FAFF' : 'transparent',
                    }}
                  >
                    <OpeningIcon typeKey={key} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{def.name}</div>
                      {isCustom && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', letterSpacing: '.06em', textTransform: 'uppercase' }}>Custom</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={priceNum}>{fmtCAD(total)}</div>
                      <div style={priceSub}>per opening</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#CBD5E1', marginLeft: 2, transition: 'transform .2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</div>
                    <button
                      onClick={e => { e.stopPropagation(); setDeletingItem({ key, name: def.name, isCustom: false }) }}
                      onMouseEnter={() => setHoverDeleteKey(key)}
                      onMouseLeave={() => setHoverDeleteKey(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{
                      padding: '12px 16px 16px',
                      borderBottom: !isLast ? '1px solid rgba(10,22,40,0.05)' : 'none',
                      background: '#F8FAFF',
                    }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Materials</div>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>$</span>
                            <input type="number" min="0" step="50"
                              value={p.base}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setPrice(key, 'base', e.target.value)}
                              style={{ ...inputStyle, paddingLeft: 22 }}
                            />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Labour</div>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>$</span>
                            <input type="number" min="0" step="50"
                              value={p.lab}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setPrice(key, 'lab', e.target.value)}
                              style={{ ...inputStyle, paddingLeft: 22 }}
                            />
                          </div>
                        </div>
                      </div>
                      {isCustom && (
                        <button
                          onClick={e => { e.stopPropagation(); setPrices(prev => ({ ...prev, [key]: { base: def.base, lab: def.lab } })) }}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                          Reset to default ({fmtCAD(def.base + def.lab)})
                        </button>
                      )}
                      {pricingMode === 'gbb' && (
                        <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#2045B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tier Prices</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {(['good', 'better', 'best'] as const).map(tier => {
                              const gbb = gbbPrices[key] || { good: 0, better: 0, best: 0 }
                              const isMiddle = tier === 'better'
                              return (
                                <div key={tier} style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: isMiddle ? '#2045B8' : '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center' }}>
                                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                  </div>
                                  <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: isMiddle ? '#2045B8' : '#94A3B8' }}>$</span>
                                    <input type="number" min="0" step="50"
                                      value={gbb[tier] || ''}
                                      placeholder="0"
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => setGbbPrice(key, tier, e.target.value)}
                                      style={{
                                        ...inputStyle, paddingLeft: 20,
                                        border: isMiddle ? '1.5px solid #2045B8' : '1.5px solid #E2E8F0',
                                        background: isMiddle ? '#EEF2FF' : '#F8FAFC',
                                        color: isMiddle ? '#2045B8' : '#0A1628',
                                        fontWeight: isMiddle ? 700 : 400,
                                        textAlign: 'center',
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── CUSTOM TYPES ── */}
          <div style={sectionLabel}>Custom Types</div>
          {customTypes.length > 0 && (
            <div
              style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden', marginBottom: 4 }}
            >
              {customTypes.map((ct, i) => {
                const isExpanded   = expandedKey === ct.key
                const isLast       = i === customTypes.length - 1
                const isDragging   = dragIndexState === i
                const isDropTarget = dragOverState !== null && dragOverState === i && dragIndexState !== null && dragIndexState !== i

                return (
                  <div
                    key={ct.key}
                    ref={el => { itemRefs.current[i] = el }}
                    style={{
                      borderTop: isDropTarget ? '2px solid #2563EB' : undefined,
                      opacity: isDragging ? 0.45 : 1,
                      transition: 'opacity 150ms',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 14px 12px 10px',
                        borderBottom: (!isExpanded && !isLast) ? '1px solid rgba(10,22,40,0.05)' : 'none',
                        background: isExpanded ? '#F8FAFF' : 'transparent',
                      }}
                    >
                      {/* Drag handle */}
                      <div
                        onPointerDown={e => onHandlePointerDown(e, i)}
                        style={{ padding: '6px 4px', cursor: 'grab', touchAction: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <DragHandle />
                      </div>

                      {/* Tap area to expand */}
                      <div onClick={() => toggleExpand(ct.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                        <OpeningIcon typeKey={ct.key} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ct.label}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={priceNum}>{fmtCAD(ct.base + ct.lab)}</div>
                          <div style={priceSub}>per opening</div>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingItem({ key: ct.key, name: ct.label, isCustom: true }) }}
                        onMouseEnter={() => setHoverDeleteKey(ct.key)}
                        onMouseLeave={() => setHoverDeleteKey(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>

                      {/* Chevron */}
                      <div
                        onClick={() => toggleExpand(ct.key)}
                        style={{ fontSize: 11, color: '#CBD5E1', transition: 'transform .2s', transform: isExpanded ? 'rotate(90deg)' : 'none', cursor: 'pointer', flexShrink: 0 }}
                      >▶</div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '12px 16px 16px',
                        borderBottom: !isLast ? '1px solid rgba(10,22,40,0.05)' : 'none',
                        background: '#F8FAFF',
                      }}>
                        {ct.base + ct.lab === 0 && (
                          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8, fontWeight: 500 }}>
                            Please enter a price
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Materials</div>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>$</span>
                              <input type="number" min="0" step="50"
                                value={ct.base || ''}
                                placeholder="0"
                                onClick={e => e.stopPropagation()}
                                onChange={e => setCustomPrice(ct.key, 'base', e.target.value)}
                                style={{ ...inputStyle, paddingLeft: 22, borderColor: ct.base + ct.lab === 0 ? '#FECACA' : undefined }}
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Labour</div>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>$</span>
                              <input type="number" min="0" step="50"
                                value={ct.lab || ''}
                                placeholder="0"
                                onClick={e => e.stopPropagation()}
                                onChange={e => setCustomPrice(ct.key, 'lab', e.target.value)}
                                style={{ ...inputStyle, paddingLeft: 22, borderColor: ct.base + ct.lab === 0 ? '#FECACA' : undefined }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add custom type */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              placeholder="e.g. Skylight, Garden Window…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomType() }}
              style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
            />
            <button
              onClick={addCustomType}
              style={{ padding: '10px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >+ Add</button>
          </div>
        </>}
      </div>

      <BottomNav />
    </div>
    </>
  )
}
