'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { C, SETTINGS, makeOpening, getType, type Opening, FRAME_COLOURS, HW_COLOURS, type Palettes } from '@/lib/v2/openingTypes'
import { BuilderHeader, BottomBar } from '@/components/estimate-builder-v2/builder-header'
import { OpeningRow } from '@/components/estimate-builder-v2/opening-row'
import { OpeningEditor } from '@/components/estimate-builder-v2/opening-editor'
import { TypePickerSheet } from '@/components/estimate-builder-v2/type-picker'
import { PickerSheet, type PickerState } from '@/components/estimate-builder-v2/primitives'
import { EBIcon } from '@/components/estimate-builder-v2/icons'

// ── Pricing ───────────────────────────────────────────────────────
type CustomPricing = {
  base?: Record<string, number>
  addons?: Partial<typeof SETTINGS.pricing.addons>
  areaRatePerSqFt?: number
}

function computePrice(op: Opening, custom?: CustomPricing): number {
  const v = op.vals
  const base = (custom?.base ?? SETTINGS.pricing.base)[op.typeId] ?? 800
  const rate = custom?.areaRatePerSqFt ?? SETTINGS.pricing.areaRatePerSqFt
  const addons = { ...SETTINGS.pricing.addons, ...custom?.addons }

  const w = +(v.width || v.owidth || 32)
  const h = +(v.height || v.oheight || 48)
  let p = base + Math.round((w * h) / 144 * rate)

  if (v.pane === 'Triple') p += addons.triplePane
  if (v.lowE) p += addons.lowE
  if (v.argon) p += addons.argon
  if (v.tempered) p += addons.tempered
  if (v.grid && v.grid !== 'None') p += addons.grid
  if (v.screen && v.screen !== 'None') p += addons.screen
  if ((v.extColour && v.extColour !== 'White') || (v.doorExt && v.doorExt !== 'White')) p += addons.customColour
  if (v.material === 'Wood' || v.doorMaterial === 'Wood') p += addons.wood
  if (v.material === 'Fiberglass') p += addons.fiberglass

  return p * ((v.qty as number) || 1)
}

function money(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

// ── Page ──────────────────────────────────────────────────────────
type Mode = 'list' | 'edit'

export default function NewEstimateV2() {
  const router = useRouter()
  const supabase = createClient()

  const [openings, setOpenings] = useState<Opening[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [mode, setMode] = useState<Mode>('list')
  const [picker, setPicker] = useState<PickerState>(null)
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(false)
  const [customPricing, setCustomPricing] = useState<CustomPricing | undefined>(undefined)
  const [palettes, setPalettes] = useState<Palettes>({ frame: FRAME_COLOURS, hw: HW_COLOURS })
  const [clientName, setClientName] = useState('')

  // Load price_lists + color_palette from Supabase (parallel)
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [priceResult, paletteResult] = await Promise.all([
        supabase.from('price_lists').select('opening_type, base_price, labour_price').eq('user_id', user.id),
        supabase.from('color_palette').select('id, name, hex_color, category').eq('user_id', user.id).order('sort_order').order('created_at'),
      ])

      const { data: priceRows, error: priceErr } = priceResult
      if (priceErr) {
        console.error('[price_lists] fetch failed, falling back to default pricing:', priceErr)
      } else if (priceRows && priceRows.length > 0) {
        const base: Record<string, number> = {}
        priceRows.forEach((r: { opening_type: string; base_price: number; labour_price: number }) => {
          base[r.opening_type] = (r.base_price || 0) + (r.labour_price || 0)
        })
        setCustomPricing(prev => ({ ...prev, base }))
      }

      const { data: paletteRows } = paletteResult
      if (paletteRows && paletteRows.length > 0) {
        type RawEntry = { id: string; name: string; hex_color: string | null; category: string }
        const toEntry = (r: RawEntry) => ({
          id: r.id,
          hex: r.hex_color || '#E5E7EB',
          ring: (r.hex_color || '').toUpperCase() === '#FFFFFF',
        })
        const rows = paletteRows as RawEntry[]
        const frameRows = rows.filter(r => r.category !== 'Hardware')
        const hwRows    = rows.filter(r => r.category === 'Hardware')
        setPalettes({
          frame: frameRows.length > 0 ? frameRows.map(toEntry) : FRAME_COLOURS,
          hw:    hwRows.length    > 0 ? hwRows.map(toEntry)    : HW_COLOURS,
        })
      }
    }
    load()
  }, [])

  const total = openings.reduce((s, o) => s + computePrice(o, customPricing), 0)
  const op = openings[activeIdx]

  const setVal = useCallback((k: string, v: string | number | boolean) => {
    setOpenings(list => list.map((o, i) => i === activeIdx ? { ...o, vals: { ...o.vals, [k]: v } } : o))
  }, [activeIdx])

  const setSub = useCallback((subs: string[]) => {
    const newSub = subs[0]
    setOpenings(list => list.map((o, i) => i === activeIdx ? { ...o, sub: newSub } : o))
  }, [activeIdx])

  const openPicker = useCallback((
    k: string,
    def: { label: string; opts: string[] },
    value: string | undefined,
    onPick: (v: string) => void
  ) => {
    setPicker({ def, value, onPick })
  }, [])

  const changeType = useCallback((typeId: string) => {
    setOpenings(list => list.map((o, i) => {
      if (i !== activeIdx) return o
      const fresh = makeOpening(typeId, 0)
      const preserve = ['width', 'height', 'owidth', 'oheight', 'qty', 'room', 'floor']
      preserve.forEach(k => { if (o.vals[k] != null) fresh.vals[k] = o.vals[k] })
      return fresh
    }))
  }, [activeIdx])

  const handleTypePick = useCallback((typeId: string) => {
    if (pendingAdd) {
      const n = makeOpening(typeId, 0)
      setOpenings(l => [...l, n])
      setActiveIdx(openings.length)
      setMode('edit')
      setPendingAdd(false)
    } else {
      changeType(typeId)
    }
  }, [pendingAdd, openings.length, changeType])

  const addOpening = () => {
    setPendingAdd(true)
    setTypePickerOpen(true)
  }

  const dupOpening = (i: number) => {
    setOpenings(l => {
      const c: Opening = JSON.parse(JSON.stringify(l[i]))
      const nl = [...l]
      nl.splice(i + 1, 0, c)
      return nl
    })
  }

  const delOpening = (i: number) => {
    setOpenings(l => l.filter((_, j) => j !== i))
    if (activeIdx >= openings.length - 1) setActiveIdx(Math.max(0, activeIdx - 1))
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', maxWidth: 600, margin: '0 auto' }}>

      <BuilderHeader
        client={clientName || undefined}
        count={openings.length}
        total={total}
        onBack={() => {
          if (mode === 'edit') setMode('list')
          else router.push('/dashboard/estimates')
        }}
      />

      {/* ── List mode ── */}
      {mode === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px', display: 'flex', flexDirection: 'column' }}>

          {/* Client name input */}
          <div style={{ marginBottom: 14 }}>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Client name…"
              style={{ width: '100%', height: 46, padding: '0 14px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 16, fontWeight: 600, color: C.ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {openings.length === 0 ? (
            /* ── Empty state ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, padding: '40px 8px' }}>
              <EBIcon name="win" size={36} color={C.inkFaint} />
              <span style={{ fontSize: 13, color: C.inkMid, fontWeight: 500, lineHeight: 1.6 }}>No openings yet. Tap below to add your first window or door.</span>
              <button onClick={addOpening} style={{ height: 48, padding: '0 24px', borderRadius: 12, border: 'none', background: C.blue, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                + Add opening
              </button>
            </div>
          ) : (
            /* ── Opening list ── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.blueSoft, border: `1px solid ${C.blueLine}`, borderRadius: 13, padding: '11px 13px', marginBottom: 14 }}>
                <EBIcon name="win" size={18} color={C.blue} />
                <span style={{ fontSize: 12.5, color: C.inkMid, fontWeight: 600, lineHeight: 1.4 }}>Add each window or door as its own opening. Tap a row to edit.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {openings.map((o, i) => (
                  <OpeningRow
                    key={i}
                    index={i + 1}
                    op={o}
                    price={money(computePrice(o, customPricing))}
                    onEdit={() => { setActiveIdx(i); setMode('edit') }}
                    onDup={() => dupOpening(i)}
                    onDel={() => delOpening(i)}
                  />
                ))}
              </div>

              <button onClick={addOpening} style={{ width: '100%', marginTop: 12, height: 48, borderRadius: 12, border: `1.5px dashed ${C.blueLine}`, background: C.card, color: C.blue, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                + Add opening
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Edit mode ── */}
      {mode === 'edit' && op && (
        <>
          {/* Edit sub-header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button onClick={() => setMode('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.inkMid, fontSize: 13.5, fontWeight: 700, padding: 0, cursor: 'pointer' }}>
              <EBIcon name="back" size={18} color={C.inkMid} />All openings
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>Opening {activeIdx + 1} / {openings.length}</span>
            <button onClick={() => dupOpening(activeIdx)} title="Duplicate" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <EBIcon name="dup" size={15} color={C.inkMid} />
            </button>
            <button onClick={() => { delOpening(activeIdx); setMode('list') }} title="Delete" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <EBIcon name="trash" size={15} color={C.red} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <OpeningEditor
              op={op}
              onVal={setVal}
              onSub={setSub}
              openType={() => setTypePickerOpen(true)}
              openPicker={openPicker}
              setPicker={setPicker}
              palettes={palettes}
            />
          </div>

          {/* Save bar */}
          <div style={{ flexShrink: 0, padding: '11px 16px', paddingBottom: 'max(24px, calc(11px + env(safe-area-inset-bottom)))', background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: C.inkSoft, textTransform: 'uppercase' }}>This opening</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{money(computePrice(op, customPricing))}</div>
            </div>
            <button onClick={() => setMode('list')} style={{ flex: 1, height: 48, borderRadius: 12, border: 'none', background: C.blue, color: '#fff', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px rgba(59,108,255,0.35)', cursor: 'pointer' }}>
              Save opening
            </button>
          </div>
        </>
      )}

      {/* Bottom bar (list mode, only when openings exist) */}
      {mode === 'list' && openings.length > 0 && (
        <BottomBar
          onBack={() => router.push('/dashboard/estimates')}
          onContinue={() => {
            console.log('Continue clicked - Step 3 not yet implemented', openings)
            alert('Openings saved locally. Save-to-database and next steps coming soon!')
          }}
          ctaLabel="Continue to details"
        />
      )}

      {/* Sheets */}
      <PickerSheet picker={picker} onClose={() => setPicker(null)} />
      <TypePickerSheet
        open={typePickerOpen}
        current={op?.typeId}
        onPick={handleTypePick}
        onClose={() => { setTypePickerOpen(false); setPendingAdd(false) }}
      />
    </div>
  )
}
