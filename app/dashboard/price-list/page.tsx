'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { OPENING_TYPES, DEFAULT_SIZE_MULTS, fmtCAD } from '@/lib/pricing'

interface PriceRow { base: number; lab: number }
interface Sizes { sm: number; md: number; lg: number; xl: number }

const DEFAULT_PRICES: Record<string, PriceRow> = Object.fromEntries(
  Object.entries(OPENING_TYPES).map(([k, v]) => [k, { base: v.base, lab: v.lab }])
)

export default function PriceListPage() {
  const router = useRouter()
  const supabase = createClient()

  const [prices, setPrices] = useState<Record<string, PriceRow>>(DEFAULT_PRICES)
  const [sizes, setSizes] = useState<Sizes>(DEFAULT_SIZE_MULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('price_lists').select('*').eq('user_id', user.id)
      if (data && data.length > 0) {
        const sizesRow = data.find(r => r.opening_type === '_sizes')
        if (sizesRow) setSizes({ sm: sizesRow.sz_sm, md: sizesRow.sz_md, lg: sizesRow.sz_lg, xl: sizesRow.sz_xl })
        const loaded: Record<string, PriceRow> = { ...DEFAULT_PRICES }
        data.filter(r => r.opening_type !== '_sizes').forEach(r => {
          loaded[r.opening_type] = { base: r.base_price, lab: r.labour_price }
        })
        setPrices(loaded)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#fff', border: '1.5px solid var(--border)',
    borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--jet)',
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')}
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,.08)', borderRadius: 8, border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ←
            </button>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Custom pricing</div>
          <div className="h-big">Price List</div>
          <div className="h-sub">Your prices apply to all new estimates</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>}

        {!loading && <>
          {error && <div className="error-msg">{error}</div>}
          {saved && <div className="success-msg">✅ Prices saved</div>}

          {/* Size multipliers */}
          <div className="sl">Size multipliers</div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 12, lineHeight: 1.5 }}>
              Multiplied against base + labour. Medium (1.0) is the reference price.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {(['sm', 'md', 'lg', 'xl'] as const).map(sz => (
                <div key={sz} className="f">
                  <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : sz === 'lg' ? 'Large' : 'XL'}
                  </label>
                  <input
                    type="number" step="0.05" min="0.1" max="5"
                    value={sizes[sz]}
                    style={inputStyle}
                    onChange={e => setSizes(p => ({ ...p, [sz]: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Opening types */}
          <div className="sl">Opening type prices</div>
          <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 12, lineHeight: 1.5 }}>
            Materials + Labour at medium size. Tier multipliers (Good 1×, Better 1.2×, Best 1.4×) apply on top.
          </div>

          {Object.entries(OPENING_TYPES).map(([key, def]) => {
            const p = prices[key] || { base: def.base, lab: def.lab }
            const total = p.base + p.lab
            const isCustom = p.base !== def.base || p.lab !== def.lab
            return (
              <div key={key} style={{
                background: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
                border: `1px solid ${isCustom ? 'rgba(59,108,255,.3)' : 'var(--border-light)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{def.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>{def.name}</div>
                      {isCustom && (
                        <div style={{ fontSize: 9, color: '#2045B8', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Custom</div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#2045B8' }}>{fmtCAD(total)}</div>
                    <div style={{ fontSize: 9, color: 'var(--ash)' }}>installed · medium</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="f">
                    <label>Materials</label>
                    <input
                      type="number" min="0" step="50"
                      value={p.base}
                      style={inputStyle}
                      onChange={e => setPrice(key, 'base', e.target.value)}
                    />
                  </div>
                  <div className="f">
                    <label>Labour</label>
                    <input
                      type="number" min="0" step="50"
                      value={p.lab}
                      style={inputStyle}
                      onChange={e => setPrice(key, 'lab', e.target.value)}
                    />
                  </div>
                </div>
                {isCustom && (
                  <button
                    onClick={() => setPrices(prev => ({ ...prev, [key]: { base: def.base, lab: def.lab } }))}
                    style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--ash)', fontSize: 10, cursor: 'pointer', padding: 0 }}>
                    Reset to default ({fmtCAD(def.base + def.lab)})
                  </button>
                )}
              </div>
            )
          })}

          <button className="gen-btn" onClick={save} disabled={saving} style={{ marginBottom: 10 }}>
            {saving ? '⏳ Saving...' : '💾 Save Price List'}
          </button>
          <button onClick={resetToDefaults}
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '10px 0', cursor: 'pointer' }}>
            Reset all to defaults
          </button>

          <div style={{ height: 90 }} />
        </>}
      </div>

      <BottomNav />
    </div>
  )
}
