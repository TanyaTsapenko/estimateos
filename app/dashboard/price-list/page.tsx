'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { OPENING_TYPES, DEFAULT_SIZE_MULTS, fmtCAD } from '@/lib/pricing'

interface PriceRow { base: number; lab: number }
interface Sizes { sm: number; md: number; lg: number; xl: number }
interface CustomType { key: string; label: string; base: number; lab: number }

const DEFAULT_PRICES: Record<string, PriceRow> = Object.fromEntries(
  Object.entries(OPENING_TYPES).map(([k, v]) => [k, { base: v.base, lab: v.lab }])
)

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8',
  textTransform: 'uppercase', marginBottom: 8, marginTop: 20,
}

const inputStyle: React.CSSProperties = {
  flex: 1, background: '#F8FAFC', border: '1.5px solid #E2E8F0',
  borderRadius: 8, padding: '8px 10px', fontSize: 14, color: '#0A1628',
  fontFamily: 'inherit', outline: 'none', minWidth: 0,
}

export default function PriceListPage() {
  const router = useRouter()
  const supabase = createClient()

  const [prices, setPrices] = useState<Record<string, PriceRow>>(DEFAULT_PRICES)
  const [sizes, setSizes] = useState<Sizes>(DEFAULT_SIZE_MULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [customTypes, setCustomTypes] = useState<CustomType[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [deletedCustomKeys, setDeletedCustomKeys] = useState<string[]>([])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('price_lists').select('*').eq('user_id', user.id)
      if (data && data.length > 0) {
        const sizesRow = data.find(r => r.opening_type === '_sizes')
        if (sizesRow) setSizes({ sm: sizesRow.sz_sm, md: sizesRow.sz_md, lg: sizesRow.sz_lg, xl: sizesRow.sz_xl })
        const loaded: Record<string, PriceRow> = { ...DEFAULT_PRICES }
        data.filter(r => r.opening_type !== '_sizes' && !r.custom_label).forEach(r => {
          loaded[r.opening_type] = { base: r.base_price, lab: r.labour_price }
        })
        setPrices(loaded)
        const customRows = data.filter(r => r.opening_type !== '_sizes' && r.custom_label)
        setCustomTypes(customRows.map(r => ({ key: r.opening_type, label: r.custom_label, base: r.base_price, lab: r.labour_price })))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (deletedCustomKeys.length > 0) {
      await supabase.from('price_lists').delete().eq('user_id', user.id).in('opening_type', deletedCustomKeys)
      setDeletedCustomKeys([])
    }

    const rows = [
      {
        user_id: user.id, opening_type: '_sizes',
        base_price: 0, labour_price: 0,
        sz_sm: sizes.sm, sz_md: sizes.md, sz_lg: sizes.lg, sz_xl: sizes.xl,
        updated_at: new Date().toISOString(),
      },
      ...Object.entries(prices).map(([type, p]) => ({
        user_id: user.id, opening_type: type,
        base_price: p.base, labour_price: p.lab,
        sz_sm: DEFAULT_SIZE_MULTS.sm, sz_md: DEFAULT_SIZE_MULTS.md,
        sz_lg: DEFAULT_SIZE_MULTS.lg, sz_xl: DEFAULT_SIZE_MULTS.xl,
        updated_at: new Date().toISOString(),
      })),
      ...customTypes.map(ct => ({
        user_id: user.id, opening_type: ct.key,
        base_price: ct.base, labour_price: ct.lab,
        custom_label: ct.label,
        sz_sm: DEFAULT_SIZE_MULTS.sm, sz_md: DEFAULT_SIZE_MULTS.md,
        sz_lg: DEFAULT_SIZE_MULTS.lg, sz_xl: DEFAULT_SIZE_MULTS.xl,
        updated_at: new Date().toISOString(),
      })),
    ]

    const { error: e } = await supabase.from('price_lists').upsert(rows, { onConflict: 'user_id,opening_type' })
    if (e) { setError(e.message); setSaving(false); return }
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function resetToDefaults() {
    if (!confirm('Reset all prices to system defaults?')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('price_lists').delete().eq('user_id', user.id)
    setPrices(DEFAULT_PRICES)
    setSizes(DEFAULT_SIZE_MULTS)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function setPrice(type: string, field: 'base' | 'lab', raw: string) {
    const val = parseFloat(raw) || 0
    setPrices(p => ({ ...p, [type]: { ...p[type], [field]: val } }))
  }

  function toggleExpand(key: string) {
    setExpandedKey(prev => prev === key ? null : key)
  }

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
        top: 0,
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
        zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>BUSINESS</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.4px' }}>Price List</div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: saved ? '#059669' : saving ? '#CBD5E1' : '#2563EB',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background .2s',
          }}
        >
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

          {/* ── OPENING TYPES ── */}
          <div style={sectionLabel}>Opening Types</div>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden', marginBottom: 4 }}>
            {Object.entries(OPENING_TYPES).map(([key, def], idx, arr) => {
              const p = prices[key] || { base: def.base, lab: def.lab }
              const total = p.base + p.lab
              const isCustom = p.base !== def.base || p.lab !== def.lab
              const isExpanded = expandedKey === key
              const isLast = idx === arr.length - 1
              return (
                <div key={key}>
                  {/* Row header — tap to expand */}
                  <div
                    onClick={() => toggleExpand(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '13px 16px',
                      borderBottom: (!isExpanded && !isLast) ? '1px solid rgba(10,22,40,0.05)' : 'none',
                      cursor: 'pointer',
                      background: isExpanded ? '#F8FAFF' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                      background: isCustom ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {def.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{def.name}</div>
                      {isCustom && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', letterSpacing: '.06em', textTransform: 'uppercase' }}>Custom</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#2563EB', lineHeight: 1 }}>{fmtCAD(total)}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>installed · med</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4, transition: 'transform .2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</div>
                  </div>

                  {/* Expanded inputs */}
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
                            <input
                              type="number" min="0" step="50"
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
                            <input
                              type="number" min="0" step="50"
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── CUSTOM TYPES ── */}
          <div style={sectionLabel}>Custom Types</div>
          {customTypes.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden', marginBottom: 4 }}>
              {customTypes.map((ct, i) => {
                const isExpanded = expandedKey === ct.key
                const isLast = i === customTypes.length - 1
                return (
                  <div key={ct.key}>
                    <div
                      onClick={() => toggleExpand(ct.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px',
                        borderBottom: (!isExpanded && !isLast) ? '1px solid rgba(10,22,40,0.05)' : 'none',
                        cursor: 'pointer',
                        background: isExpanded ? '#F8FAFF' : 'transparent',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: 'rgba(37,99,235,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>⬜</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{ct.label}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#2563EB', lineHeight: 1 }}>{fmtCAD(ct.base + ct.lab)}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>installed · med</div>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setDeletedCustomKeys(prev => [...prev, ct.key])
                          setCustomTypes(prev => prev.filter((_, j) => j !== i))
                          if (expandedKey === ct.key) setExpandedKey(null)
                        }}
                        style={{ background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#DC2626', cursor: 'pointer', fontSize: 13, marginLeft: 4, flexShrink: 0 }}>
                        ✕
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '12px 16px 16px',
                        borderBottom: !isLast ? '1px solid rgba(10,22,40,0.05)' : 'none',
                        background: '#F8FAFF',
                      }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Materials</div>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>$</span>
                              <input
                                type="number" min="0" step="50"
                                value={ct.base}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setCustomTypes(prev => prev.map((t, j) => j === i ? { ...t, base: Number(e.target.value) } : t))}
                                style={{ ...inputStyle, paddingLeft: 22 }}
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Labour</div>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>$</span>
                              <input
                                type="number" min="0" step="50"
                                value={ct.lab}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setCustomTypes(prev => prev.map((t, j) => j === i ? { ...t, lab: Number(e.target.value) } : t))}
                                style={{ ...inputStyle, paddingLeft: 22 }}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 4 }}>
            <input
              placeholder="e.g. Skylight, Garden Window…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newLabel.trim()) {
                  setCustomTypes(prev => [...prev, { key: 'custom_' + Date.now(), label: newLabel.trim(), base: 500, lab: 200 }])
                  setNewLabel('')
                }
              }}
              style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
            />
            <button
              onClick={() => {
                if (!newLabel.trim()) return
                setCustomTypes(prev => [...prev, { key: 'custom_' + Date.now(), label: newLabel.trim(), base: 500, lab: 200 }])
                setNewLabel('')
              }}
              style={{ padding: '10px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >+ Add</button>
          </div>

          {/* ── ADVANCED (size multipliers) ── */}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowAdvanced(p => !p)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase' }}>Advanced</span>
              <span style={{ fontSize: 12, color: '#94A3B8', transition: 'transform .2s', display: 'inline-block', transform: showAdvanced ? 'rotate(90deg)' : 'none' }}>▶</span>
            </button>

            {showAdvanced && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', padding: '16px', marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14, lineHeight: 1.5 }}>
                  Size multipliers — applied on top of base + labour. Medium (1.0×) is the reference price.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  {(['sm', 'md', 'lg', 'xl'] as const).map(sz => (
                    <div key={sz}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : sz === 'lg' ? 'Large' : 'XL'}
                      </div>
                      <input
                        type="number" step="0.05" min="0.1" max="5"
                        value={sizes[sz]}
                        onChange={e => setSizes(p => ({ ...p, [sz]: parseFloat(e.target.value) || 1 }))}
                        style={{ ...inputStyle, textAlign: 'center' }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={resetToDefaults}
                  style={{ marginTop: 14, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Reset all to defaults
                </button>
              </div>
            )}
          </div>
        </>}
      </div>

      <BottomNav />
    </div>
  )
}
