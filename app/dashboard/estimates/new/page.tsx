'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { C, SETTINGS, makeOpening, getType, type Opening, FRAME_COLOURS, HW_COLOURS, type Palettes } from '@/lib/v2/openingTypes'
import { BuilderHeader, BottomBar } from '@/components/estimate-builder-v2/builder-header'
import { OpeningRow } from '@/components/estimate-builder-v2/opening-row'
import { OpeningEditor } from '@/components/estimate-builder-v2/opening-editor'
import { TypePickerSheet } from '@/components/estimate-builder-v2/type-picker'
import { PickerSheet, type PickerState } from '@/components/estimate-builder-v2/primitives'
import { EBIcon } from '@/components/estimate-builder-v2/icons'
import ConfirmModal from '@/components/ConfirmModal'
import { ClientStep, type ClientInfo } from '@/components/estimate-builder-v2/client-step'
import { ReviewStep, type SaveParams } from '@/components/estimate-builder-v2/review-step'

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

function dimToSizeBucket(wIn: number, hIn: number): string {
  const dim = Math.max(wIn, hIn)
  return dim >= 48 ? 'xl' : dim >= 36 ? 'lg' : dim >= 24 ? 'md' : 'sm'
}

function buildOpeningRow(op: Opening, idx: number, estimateId: string, custom?: CustomPricing) {
  const v = op.vals
  const widthIn  = parseFloat(String(v.width  || v.owidth  || '')) || 0
  const heightIn = parseFloat(String(v.height || v.oheight || '')) || 0

  // Legacy glass string expected by old readers
  const glassKind = String(v.glassType || 'Clear').toLowerCase()
  let glass = 'clear'
  if (v.tempered) glass = 'tempered'
  else if (v.lowE) glass = 'lowe'
  else if (glassKind === 'frosted') glass = 'frosted'
  else if (glassKind === 'tinted')  glass = 'tinted'

  const unitCost  = Math.round(computePrice({ ...op, vals: { ...v, qty: 1 } }, custom) * 100) / 100
  const totalCost = Math.round(computePrice(op, custom) * 100) / 100

  return {
    estimate_id:      estimateId,
    type:             op.typeId,
    window_subtype:   op.sub || null,
    qty:              (v.qty as number) || 1,
    width_in:         widthIn  || null,
    height_in:        heightIn || null,
    width:            widthIn && heightIn ? dimToSizeBucket(widthIn, heightIn) : 'md',
    shape:            'rect',
    colour:           String(v.extColour || v.doorExt || v.colour || 'White'),
    interior_colour:  String(v.intColour || v.doorInt || 'White'),
    hardware_colour:  String(v.hwColour  || 'White'),
    frame:            'none',
    glass,
    glass_kind:       glassKind,
    low_e:            Boolean(v.lowE),
    tempered:         Boolean(v.tempered),
    pane:             String(v.pane || 'Double'),
    install:          String(v.install  || 'Retrofit'),
    floor:            String(v.floor    || 'Ground floor'),
    room:             (v.room     as string) || null,
    has_screen:       Boolean(v.screen && v.screen !== 'None'),
    material:         String(v.material || v.doorMaterial || 'Vinyl'),
    grid_pattern:     String(v.grid     || 'None'),
    tilt_clean:       Boolean(v.tiltClean),
    opening_direction:String(v.openDir  || v.operSide || ''),
    panels_count:     String(v.numPanels || ''),
    bay_angle:        String(v.bayAngle  || ''),
    transom_panes:    String(v.transomPanes || ''),
    sidelight:        0,
    sidelight_left:   0,
    sidelight_right:  0,
    transom:          0,
    transom_above:    Boolean(v.transomAbove),
    core_type:        String(v.coreType || ''),
    handle_type:      String(v.handle   || ''),
    egress_required:  Boolean(v.egress),
    notes:            String(v.notes    || ''),
    custom_shape_label: (v.customShapeDesc as string) || null,
    unit_cost:        unitCost,
    total_cost:       totalCost,
    sort_order:       idx,
  }
}

// ── Page ──────────────────────────────────────────────────────────
type Mode = 'client' | 'list' | 'edit' | 'review'

function NewEstimateV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const apptId = searchParams.get('appointment_id') || ''

  const [clientInfo, setClientInfo] = useState<ClientInfo>(() => ({
    name:    searchParams.get('client_name')    || '',
    email:   '',
    phone:   '',
    address: searchParams.get('client_address') || '',
  }))
  const [openings, setOpenings] = useState<Opening[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [mode, setMode] = useState<Mode>('client')
  const [picker, setPicker] = useState<PickerState>(null)
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)
  const [customPricing, setCustomPricing] = useState<CustomPricing | undefined>(undefined)
  const [palettes, setPalettes] = useState<Palettes>({ frame: FRAME_COLOURS, hw: HW_COLOURS })
  const [saving, setSaving] = useState(false)

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
          id: r.name,
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

  // Fetch full appointment data and merge into clientInfo
  useEffect(() => {
    if (!apptId) return
    async function fetchAppt() {
      const { data: appt } = await supabase
        .from('appointments')
        .select('client_name, client_phone, client_email, client_address, client_city, client_province, postal_code, client_id')
        .eq('id', apptId)
        .maybeSingle()
      if (!appt) return
      const row = appt as Record<string, string | null>
      setClientInfo(prev => ({
        ...prev,
        ...(row.client_id    && { id:      row.client_id }),
        ...(row.client_name  && { name:    row.client_name }),
        ...(row.client_phone && { phone:   row.client_phone }),
        ...(row.client_email && { email:   row.client_email }),
        ...(row.client_address && {
          address: [row.client_address, row.client_city].filter(Boolean).join(', '),
        }),
      }))
    }
    fetchAppt()
  }, [apptId])

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

  // ── Save estimate ─────────────────────────────────────────────────
  async function saveEstimate(params: SaveParams) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const uid = user.id

      // 1. Resolve client_id
      let clientId: string | null = clientInfo.id || null
      if (!clientId) {
        const { data: created, error: cErr } = await supabase
          .from('clients')
          .insert({
            owner_id:    uid,
            name:        clientInfo.name,
            phone:       clientInfo.phone  || null,
            email:       clientInfo.email  || null,
            address:     clientInfo.address || null,
            city:        clientInfo.city    || null,
            province:    clientInfo.province || null,
            postal_code: clientInfo.postalCode || null,
          })
          .select('id')
          .single()
        if (cErr || !created) throw new Error('Failed to create client: ' + (cErr?.message || 'unknown'))
        clientId = created.id as string
      }

      // 2. Generate estimate number
      const { count } = await supabase
        .from('estimates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
      const estimateNumber = 'EST-' + String((count || 0) + 1).padStart(4, '0')

      // 3. INSERT estimate
      const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const { data: est, error: estErr } = await supabase
        .from('estimates')
        .insert({
          user_id:          uid,
          estimate_number:  estimateNumber,
          client_id:        clientId,
          client_name:      clientInfo.name,
          client_email:     clientInfo.email  || null,
          client_phone:     clientInfo.phone  || null,
          client_address:   clientInfo.address || null,
          client_city:      clientInfo.city    || null,
          client_province:  clientInfo.province || null,
          client_postal_code: clientInfo.postalCode || null,
          subtotal:         Math.round(params.subtotal      * 100) / 100,
          discount_type:    params.discountAmount > 0 ? params.discountType : null,
          discount_value:   params.discountAmount > 0 ? params.discountValue : null,
          discount_amount:  Math.round(params.discountAmount * 100) / 100,
          tax_rate:         params.taxRate,
          tax_amount:       Math.round(params.taxAmount     * 100) / 100,
          total:            Math.round(params.total         * 100) / 100,
          status:           'draft',
          valid_until:      validUntil,
          appointment_id:   apptId || null,
        })
        .select('id')
        .single()
      if (estErr || !est) throw new Error(estErr?.message || 'Failed to save estimate')
      const savedId = est.id as string

      // 4. Batch INSERT openings
      const rows = openings.map((o, i) => buildOpeningRow(o, i, savedId, customPricing))
      const { error: opErr } = await supabase.from('estimate_openings').insert(rows)
      if (opErr) throw new Error('Failed to save openings: ' + opErr.message)

      // 5. Update appointment if created from one
      if (apptId) {
        await supabase
          .from('appointments')
          .update({ estimate_id: savedId, status: 'completed' })
          .eq('id', apptId)
      }

      router.push('/dashboard/estimates/' + savedId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      alert('Error saving estimate: ' + msg)
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', maxWidth: 600, margin: '0 auto' }}>

      <BuilderHeader
        count={openings.length}
        total={total}
        step={mode === 'client' ? 1 : mode === 'review' ? 3 : 2}
        onBack={() => {
          if (mode === 'edit') setMode('list')
          else if (mode === 'review') setMode('list')
          else if (mode === 'list') setMode('client')
          else router.push('/dashboard/estimates')
        }}
      />

      {/* ── Client step ── */}
      {mode === 'client' && (
        <ClientStep value={clientInfo} onChange={setClientInfo} onContinue={() => setMode('list')} />
      )}

      {/* ── List mode ── */}
      {mode === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px', display: 'flex', flexDirection: 'column' }}>

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
                    onDel={() => setDeleteIdx(i)}
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
            <button onClick={() => setDeleteIdx(activeIdx)} title="Delete" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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

      {/* ── Review mode ── */}
      {mode === 'review' && (
        <ReviewStep
          clientInfo={clientInfo}
          openings={openings}
          prices={openings.map(o => computePrice(o, customPricing))}
          onEditOpenings={() => setMode('list')}
          onSave={saveEstimate}
          saving={saving}
        />
      )}

      {/* Bottom bar (list mode, only when openings exist) */}
      {mode === 'list' && openings.length > 0 && (
        <BottomBar
          onBack={() => setMode('client')}
          onContinue={() => setMode('review')}
          ctaLabel="Continue to details"
        />
      )}

      {/* Sheets */}
      <ConfirmModal
        open={deleteIdx !== null}
        icon="trash"
        title="Remove this opening?"
        body="This opening will be removed from the estimate. This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteIdx !== null) {
            delOpening(deleteIdx)
            if (mode === 'edit') setMode('list')
          }
          setDeleteIdx(null)
        }}
        onCancel={() => setDeleteIdx(null)}
      />
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

export default function NewEstimatePage() {
  return (
    <Suspense fallback={null}>
      <NewEstimateV2 />
    </Suspense>
  )
}
