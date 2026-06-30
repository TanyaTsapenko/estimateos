'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { C, makeOpening, getType, type Opening, FRAME_COLOURS, type Palettes, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'
import { computePrice, computeTrimCost, type CustomPricing } from '@/lib/pricing'
import { BuilderHeader, BottomBar } from '@/components/estimate-builder-v2/builder-header'
import { OpeningRow } from '@/components/estimate-builder-v2/opening-row'
import { OpeningEditor } from '@/components/estimate-builder-v2/opening-editor'
import { TypePickerSheet } from '@/components/estimate-builder-v2/type-picker'
import { PickerSheet, type PickerState } from '@/components/estimate-builder-v2/primitives'
import { EBIcon } from '@/components/estimate-builder-v2/icons'
import ConfirmModal from '@/components/ConfirmModal'
import { ClientStep, type ClientInfo } from '@/components/estimate-builder-v2/client-step'
import { ReviewStep, type SaveParams } from '@/components/estimate-builder-v2/review-step'
import { type PhotoSlot } from '@/components/estimate-builder-v2/photos-upload'
import { TrimSection, type TrimState, TRIM_DEFAULTS } from '@/components/estimate-builder-v2/trim-section'

function money(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

function dimToSizeBucket(wIn: number, hIn: number): string {
  const dim = Math.max(wIn, hIn)
  return dim >= 48 ? 'xl' : dim >= 36 ? 'lg' : dim >= 24 ? 'md' : 'sm'
}

const INSTALL_MAP: Record<string, string> = {
  'Retrofit': 'retrofit',
  'Full Frame': 'fullframe', 'Full frame': 'fullframe', 'New construction': 'fullframe',
  'Stud-to-Stud': 'stud_to_stud', 'Stud to stud': 'stud_to_stud',
}
const FLOOR_MAP: Record<string, string> = {
  'Ground floor': 'first', '2nd floor': 'second', '3rd floor': 'third', 'Basement': 'basement',
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

  console.log('bay/bow save:', { sideUnit: v.sideUnit, centerWindowType: v.centerWindowType, panelType: v.panelType, openMode: v.openMode })
  const unitCost  = Math.round(computePrice({ ...op, vals: { ...v, qty: 1 } }, custom) * 100) / 100
  const totalCost = Math.round(computePrice(op, custom) * 100) / 100

  const rawInstall = String(v.install || 'Retrofit')
  const rawFloor   = String(v.floor   || 'Ground floor')

  return {
    id:               op.tempId,
    estimate_id:      estimateId,
    type:             op.typeId,
    window_subtype:   op.sub || null,
    qty:              (v.qty as number) || 1,
    width_in:         widthIn  || null,
    height_in:        heightIn || null,
    width:            widthIn && heightIn ? dimToSizeBucket(widthIn, heightIn) : 'md',
    shape:            String(v.shape || 'rect').toLowerCase(),
    colour:           String(v.extColour || v.doorExt || v.colour || 'White').toLowerCase(),
    interior_colour:  String(v.intColour || v.doorInt || 'White').toLowerCase(),
    frame:            'none',
    glass,
    glass_kind:       glassKind,
    low_e:            Boolean(v.lowE),
    tempered:         Boolean(v.tempered),
    pane:             String(v.pane || 'Double').toLowerCase(),
    install:          INSTALL_MAP[rawInstall] ?? rawInstall.toLowerCase(),
    floor:            FLOOR_MAP[rawFloor]   ?? rawFloor.toLowerCase(),
    room:             (v.room     as string) || null,
    has_screen:       Boolean(v.screen && v.screen !== 'None'),
    material:         String(v.material || v.doorMaterial || 'Vinyl').toLowerCase(),
    grid_pattern:     String(v.grid     || 'None').toLowerCase(),
    tilt_clean:       Boolean(v.tiltClean),
    opening_direction:String(v.openDir  || v.operSide || '').toLowerCase(),
    panels_count:     String(v.numPanels || ''),
    bay_angle:        String(v.bayAngle  || ''),
    transom_panes:    String(v.transomPanes || ''),
    sidelight:        0,
    sidelight_left:   0,
    sidelight_right:  0,
    transom:          0,
    transom_above:    Boolean(v.transomAbove),
    core_type:        String(v.coreType || '').toLowerCase(),
    egress_required:  Boolean(v.egress),
    notes:            String(v.notes    || ''),
    custom_shape_label: (v.customShapeDesc as string) || null,
    interior_photo_url: op.interiorPhotoUrl || null,
    exterior_photo_url: op.exteriorPhotoUrl || null,
    photo_3_url:        op.photo3Url        || null,
    photo_4_url:        op.photo4Url        || null,
    unit_cost:        unitCost,
    total_cost:       totalCost,
    sort_order:       idx,
    sections:           Array.isArray(op.sections) ? JSON.stringify(op.sections) : null,
    side_unit:          (v.sideUnit         as string) || null,
    center_window_type: (v.centerWindowType as string) || null,
    panel_type:         (v.panelType        as string) || null,
    open_mode:          (v.openMode         as string) || null,
  }
}

// ── Reverse-map DB row → v2 Opening ──────────────────────────────
const INSTALL_UNMAP: Record<string, string> = {
  retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to stud',
}
const FLOOR_UNMAP: Record<string, string> = {
  first: 'Ground floor', second: '2nd floor', third: '3rd floor', basement: 'Basement',
}

function capitalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function reverseMapOpeningRow(row: Record<string, unknown>): Opening {
  const typeId = String(row.type || 'doubleHung')
  const vals: Record<string, string | number | boolean | undefined> = {}

  const qty = Number(row.qty) || 1
  if (qty !== 1) vals.qty = qty
  if (row.width_in)  vals.width  = String(row.width_in)
  if (row.height_in) vals.height = String(row.height_in)
  if (row.room)      vals.room   = String(row.room)

  // Colour
  const col = String(row.colour || '')
  if (col) { vals.extColour = capitalize(col); vals.doorExt = capitalize(col) }
  const intCol = String(row.interior_colour || '')
  if (intCol) { vals.intColour = capitalize(intCol); vals.doorInt = capitalize(intCol) }

  // Glass
  if (row.glass_kind) vals.glassType = capitalize(String(row.glass_kind))
  if (row.pane) vals.pane = capitalize(String(row.pane))
  if (row.low_e != null)   vals.lowE    = Boolean(row.low_e)
  if (row.tempered != null) vals.tempered = Boolean(row.tempered)

  // Install / floor
  const rawInstall = String(row.install || '')
  if (rawInstall) vals.install = INSTALL_UNMAP[rawInstall] ?? capitalize(rawInstall)
  const rawFloor = String(row.floor || '')
  if (rawFloor) vals.floor = FLOOR_UNMAP[rawFloor] ?? capitalize(rawFloor)

  // Material
  if (row.material) { vals.material = capitalize(String(row.material)); vals.doorMaterial = capitalize(String(row.material)) }
  if (row.grid_pattern) vals.grid = capitalize(String(row.grid_pattern))
  if (row.tilt_clean != null) vals.tiltClean = Boolean(row.tilt_clean)
  if (row.has_screen) vals.screen = 'Standard'; else vals.screen = 'None'
  if (row.opening_direction) { vals.openDir = capitalize(String(row.opening_direction)); vals.operSide = capitalize(String(row.opening_direction)) }
  if (row.panels_count) vals.numPanels = String(row.panels_count)
  if (row.bay_angle) vals.bayAngle = String(row.bay_angle)
  if (row.transom_panes) vals.transomPanes = String(row.transom_panes)
  if (row.transom_above != null) vals.transomAbove = Boolean(row.transom_above)
  if (row.core_type) vals.coreType = capitalize(String(row.core_type))
  if (row.egress_required != null) vals.egress = Boolean(row.egress_required)
  if (row.notes) vals.notes = String(row.notes)
  if (row.custom_shape_label) vals.customShapeDesc = String(row.custom_shape_label)
  if (row.side_unit)          vals.sideUnit          = String(row.side_unit)
  if (row.center_window_type) vals.centerWindowType  = String(row.center_window_type)
  if (row.panel_type)         vals.panelType         = String(row.panel_type)
  if (row.open_mode)          vals.openMode          = String(row.open_mode)

  let sections: Opening['sections'] = undefined
  if (row.sections) {
    try { const p = JSON.parse(String(row.sections)); sections = Array.isArray(p) ? p : [] } catch { sections = [] }
  }

  return {
    typeId,
    sub: String(row.window_subtype || ''),
    tempId: String(row.id || crypto.randomUUID()),
    interiorPhotoUrl: (row.interior_photo_url as string | null) || null,
    exteriorPhotoUrl: (row.exterior_photo_url as string | null) || null,
    photo3Url:        (row.photo_3_url        as string | null) || null,
    photo4Url:        (row.photo_4_url        as string | null) || null,
    sections,
    vals,
  }
}

// ── Estimate Notes collapsible block ──────────────────────────────
function EstimateNotesBlock({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const hasNotes = value.trim().length > 0
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 9, background: open ? C.blueSoft : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <EBIcon name="note" size={16} color={open ? C.blue : C.inkMid} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, letterSpacing: '0.01em' }}>Estimate Notes</span>
          <div style={{ fontSize: 11, color: hasNotes ? C.blue : C.inkFaint, marginTop: 1 }}>
            {open ? 'Applied to whole estimate' : hasNotes ? 'Added · tap to edit' : 'Not added · tap to add'}
          </div>
        </div>
        <EBIcon name={open ? 'chev-u' : 'chev-d'} size={17} color={C.inkSoft} />
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 14px 16px' }}>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Add scope of work, special instructions, or any notes for this estimate…"
            rows={5}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '11px 13px', borderRadius: 12,
              border: `1px solid ${C.borderStrong}`, background: C.card,
              fontSize: 13, color: C.ink, fontFamily: 'inherit',
              lineHeight: 1.6, resize: 'vertical', outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
type Mode = 'client' | 'list' | 'edit' | 'review'

function NewEstimateV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const apptId  = searchParams.get('appointment_id') || ''
  const editId  = searchParams.get('edit') || ''

  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name:    searchParams.get('client_name')    || '',
    email:   '',
    phone:   '',
    address: searchParams.get('client_address') || '',
  })
  const [openings, setOpenings] = useState<Opening[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [mode, setMode] = useState<Mode>(editId ? 'list' : 'client')
  const [picker, setPicker] = useState<PickerState>(null)
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [pendingAdd, setPendingAdd] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)
  const [subtypeError, setSubtypeError] = useState('')
  const [customPricing, setCustomPricing] = useState<CustomPricing | undefined>(undefined)
  const [palettes, setPalettes] = useState<Palettes>({ frame: FRAME_COLOURS })
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [trimState, setTrimState] = useState<TrimState>(TRIM_DEFAULTS)
  const [scopeNotes, setScopeNotes] = useState('')

  // Restore draft from sessionStorage on mount (client-side only, new estimates only)
  useEffect(() => {
    if (editId) return
    try {
      const raw = sessionStorage.getItem('estimate-draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.clientInfo) setClientInfo(draft.clientInfo)
      if (draft.openings?.length) setOpenings(draft.openings)
      if (draft.activeIdx != null) setActiveIdx(draft.activeIdx)
      if (draft.mode) setMode(draft.mode)
      if (draft.trimState) setTrimState(draft.trimState)
      if (draft.scopeNotes) setScopeNotes(draft.scopeNotes)
    } catch {}
  }, [])

  // Persist draft to sessionStorage (new estimates only)
  useEffect(() => {
    if (editId) return
    sessionStorage.setItem('estimate-draft', JSON.stringify({ clientInfo, openings, activeIdx, mode, trimState, scopeNotes }))
  }, [clientInfo, openings, activeIdx, mode, trimState, scopeNotes, editId])

  // Load price_lists + color_palette from Supabase (parallel)
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)

      const [priceResult, paletteResult, profileResult] = await Promise.all([
        supabase.from('price_lists').select('opening_type, base_price, labour_price').eq('user_id', user.id),
        supabase.from('color_palette').select('id, name, hex_color, category, price_addon').eq('user_id', user.id).order('sort_order').order('created_at'),
        supabase.from('profiles').select('surcharges, team_owner_id').eq('id', user.id).single(),
      ])

      const { data: priceRows, error: priceErr } = priceResult
      if (priceErr) {
        console.error('[price_lists] fetch failed, falling back to default pricing:', priceErr)
      } else if (priceRows && priceRows.length > 0) {
        // Invert V2_TO_OLD_TYPE_KEY: { window_cas: 'casement', ... } so we can
        // convert DB opening_type keys back to the v2 typeIds that computePrice() uses.
        const dbToV2: Record<string, string> = {}
        for (const [typeId, dbKey] of Object.entries(V2_TO_OLD_TYPE_KEY)) {
          dbToV2[dbKey] = typeId
        }
        const base: Record<string, number> = {}
        priceRows.forEach((r: { opening_type: string; base_price: number; labour_price: number }) => {
          const typeId = dbToV2[r.opening_type] ?? r.opening_type
          base[typeId] = (r.base_price || 0) + (r.labour_price || 0)
        })
        setCustomPricing(prev => ({ ...prev, base }))
      }

      // Load surcharges (from owner profile for team members)
      const { data: profRow } = profileResult
      if (profRow) {
        let rawSurcharges: Record<string, number> = (profRow as any).surcharges || {}
        if ((profRow as any).team_owner_id && Object.keys(rawSurcharges).length === 0) {
          const { data: ownerProf } = await supabase
            .from('profiles').select('surcharges').eq('id', (profRow as any).team_owner_id).single()
          rawSurcharges = (ownerProf as any)?.surcharges || {}
        }
        if (Object.keys(rawSurcharges).length > 0) {
          setCustomPricing(prev => ({ ...prev, surcharges: rawSurcharges }))
        }
      }

      const { data: paletteRows } = paletteResult
      if (paletteRows && paletteRows.length > 0) {
        type RawEntry = { id: string; name: string; hex_color: string | null; category: string; price_addon: number | null }
        const rows = paletteRows as RawEntry[]

        // Visual swatches
        const toEntry = (r: RawEntry) => ({
          id: r.name,
          hex: r.hex_color || '#E5E7EB',
          ring: (r.hex_color || '').toUpperCase() === '#FFFFFF',
        })
        const frameRows = rows.filter(r => r.category !== 'Hardware')
        setPalettes({
          frame: frameRows.length > 0 ? frameRows.map(toEntry) : FRAME_COLOURS,
        })

        // Pricing map: colour name → price_addon
        const colourPalette: Record<string, number> = {}
        rows.forEach(r => { if (r.name && r.price_addon) colourPalette[r.name] = r.price_addon })
        if (Object.keys(colourPalette).length > 0) {
          setCustomPricing(prev => ({ ...prev, colourPalette }))
        }
      }
    }
    load()
  }, [])

  // Load existing estimate for editing
  useEffect(() => {
    if (!editId) return
    async function loadEstimate() {
      const [{ data: est }, { data: ops }] = await Promise.all([
        supabase.from('estimates').select('client_id, client_name, client_email, client_phone, client_address, client_city, client_province, client_postal_code, scope_notes, trim_casing, trim_casing_size, trim_jamb, trim_jamb_extension_depth, trim_jamb_extension_depth_custom, trim_brickmold, trim_brickmold_colour_name, trim_rosettes, trim_caping, trim_nail_fin, trim_drip_cap, trim_blue_skin').eq('id', editId).maybeSingle(),
        supabase.from('estimate_openings').select('*').eq('estimate_id', editId).order('sort_order'),
      ])
      if (!est) return
      const row = est as Record<string, string | null>
      setClientInfo({
        id:         row.client_id    || undefined,
        name:       row.client_name  || '',
        email:      row.client_email || '',
        phone:      row.client_phone || '',
        address:    [row.client_address, row.client_city].filter(Boolean).join(', '),
        city:       row.client_city       || undefined,
        province:   row.client_province   || undefined,
        postalCode: row.client_postal_code || undefined,
      })
      const e = est as Record<string, unknown>
      setTrimState({
        casing:                    String(e.trim_casing                    || 'none'),
        casingSize:                String(e.trim_casing_size               || '2_3_8'),
        jamb:                      String(e.trim_jamb                      || 'none'),
        jambExtensionDepth:        String(e.trim_jamb_extension_depth      || '4-9/16"'),
        jambExtensionDepthCustom:  String(e.trim_jamb_extension_depth_custom || ''),
        brickmold:                 Boolean(e.trim_brickmold),
        brickmoldColourName:       (e.trim_brickmold_colour_name as string | null) || null,
        rosettes:                  String(e.trim_rosettes                  || 'none'),
        caping:                    Boolean(e.trim_caping),
        nailFin:                   Boolean(e.trim_nail_fin),
        dripCap:                   Boolean(e.trim_drip_cap),
        blueSkin:                  Boolean(e.trim_blue_skin),
      })
      setScopeNotes(String(e.scope_notes || ''))
      if (ops && ops.length > 0) {
        setOpenings((ops as Record<string, unknown>[]).map(reverseMapOpeningRow))
      }
    }
    loadEstimate()
  }, [editId])

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

  const trimCost = computeTrimCost(trimState, customPricing?.surcharges ?? {})
  const total = openings.reduce((s, o) => s + computePrice(o, customPricing), 0) + trimCost
  const op = openings[activeIdx]

  const setVal = useCallback((k: string, v: string | number | boolean) => {
    setOpenings(list => list.map((o, i) => i === activeIdx ? { ...o, vals: { ...o.vals, [k]: v } } : o))
  }, [activeIdx])

  const setSub = useCallback((subs: string[]) => {
    const newSub = subs[0]
    setOpenings(list => list.map((o, i) => i === activeIdx ? { ...o, sub: newSub } : o))
  }, [activeIdx])

  const setSections = useCallback((sections: Opening['sections']) => {
    const totalWidth = (Array.isArray(sections) ? sections : []).reduce((s, sec) => s + sec.width, 0)
    setOpenings(list => list.map((o, i) => {
      if (i !== activeIdx) return o
      return { ...o, sections, vals: { ...o.vals, owidth: totalWidth || undefined } }
    }))
  }, [activeIdx])

  const updatePhoto = useCallback((slot: PhotoSlot, url: string | null) => {
    const keyMap = {
      interior: 'interiorPhotoUrl', exterior: 'exteriorPhotoUrl',
      photo3: 'photo3Url', photo4: 'photo4Url',
    } as const
    setOpenings(list => list.map((o, i) => i === activeIdx ? { ...o, [keyMap[slot]]: url } : o))
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
      const fresh = makeOpening(typeId)
      fresh.tempId = o.tempId
      fresh.interiorPhotoUrl = o.interiorPhotoUrl
      fresh.exteriorPhotoUrl = o.exteriorPhotoUrl
      fresh.photo3Url = o.photo3Url
      fresh.photo4Url = o.photo4Url
      const preserve = ['width', 'height', 'owidth', 'oheight', 'qty', 'room', 'floor']
      preserve.forEach(k => { if (o.vals[k] != null) fresh.vals[k] = o.vals[k] })
      return fresh
    }))
  }, [activeIdx])

  const handleTypePick = useCallback((typeId: string) => {
    if (pendingAdd) {
      const n = makeOpening(typeId)
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
      c.tempId = crypto.randomUUID()
      c.interiorPhotoUrl = null
      c.exteriorPhotoUrl = null
      c.photo3Url = null
      c.photo4Url = null
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

      const trimFields = {
        scope_notes:                      scopeNotes || null,
        trim_casing:                      trimState.casing,
        trim_casing_size:                 trimState.casing !== 'none' ? trimState.casingSize : null,
        trim_jamb:                        trimState.jamb,
        trim_jamb_extension_depth:        trimState.jamb !== 'none' ? trimState.jambExtensionDepth : null,
        trim_jamb_extension_depth_custom: trimState.jamb !== 'none' && trimState.jambExtensionDepth === 'Custom'
          ? trimState.jambExtensionDepthCustom || null : null,
        trim_brickmold:                   trimState.brickmold,
        trim_brickmold_colour_name:       trimState.brickmold ? trimState.brickmoldColourName : null,
        trim_rosettes:                    trimState.rosettes,
        trim_caping:                      trimState.caping,
        trim_nail_fin:                    trimState.nailFin,
        trim_drip_cap:                    trimState.dripCap,
        trim_blue_skin:                   trimState.blueSkin,
      }

      const clientFields = {
        client_id:          clientId,
        client_name:        clientInfo.name,
        client_email:       clientInfo.email  || null,
        client_phone:       clientInfo.phone  || null,
        client_address:     clientInfo.address || null,
        client_city:        clientInfo.city    || null,
        client_province:    clientInfo.province || null,
        client_postal_code: clientInfo.postalCode || null,
      }
      const priceFields = {
        subtotal:        Math.round(params.subtotal      * 100) / 100,
        discount_type:   params.discountAmount > 0 ? params.discountType : null,
        discount_value:  params.discountAmount > 0 ? params.discountValue : null,
        discount_amount: Math.round(params.discountAmount * 100) / 100,
        tax_rate:        params.taxRate,
        tax_amount:      Math.round(params.taxAmount     * 100) / 100,
        total:           Math.round(params.total         * 100) / 100,
      }

      let savedId: string

      if (editId) {
        // ── UPDATE existing estimate ──
        const { error: estErr } = await supabase
          .from('estimates')
          .update({ ...clientFields, ...priceFields, ...trimFields })
          .eq('id', editId)
        if (estErr) throw new Error(estErr.message || 'Failed to update estimate')
        savedId = editId

        // Replace openings: delete old, insert new
        const { error: delErr } = await supabase.from('estimate_openings').delete().eq('estimate_id', editId)
        if (delErr) throw new Error('Failed to clear openings: ' + delErr.message)
      } else {
        // ── INSERT new estimate ──
        const { count } = await supabase
          .from('estimates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid)
        const estimateNumber = 'EST-' + String((count || 0) + 1).padStart(4, '0')
        const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

        const { data: est, error: estErr } = await supabase
          .from('estimates')
          .insert({
            user_id:         uid,
            estimate_number: estimateNumber,
            ...clientFields,
            ...priceFields,
            ...trimFields,
            status:          'draft',
            valid_until:     validUntil,
            appointment_id:  apptId || null,
          })
          .select('id')
          .single()
        if (estErr || !est) throw new Error(estErr?.message || 'Failed to save estimate')
        savedId = est.id as string

        // Update appointment if created from one
        if (apptId) {
          await supabase
            .from('appointments')
            .update({ estimate_id: savedId, status: 'completed' })
            .eq('id', apptId)
        }
      }

      // Insert openings (both paths)
      const rows = openings.map((o, i) => buildOpeningRow(o, i, savedId, customPricing))
      const { error: opErr } = await supabase.from('estimate_openings').insert(rows)
      if (opErr) throw new Error('Failed to save openings: ' + opErr.message)

      sessionStorage.removeItem('estimate-draft')
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
          else if (mode === 'list') {
            if (editId) router.push('/dashboard/estimates/' + editId)
            else setMode('client')
          } else router.push('/dashboard/estimates')
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

              <div style={{ marginTop: 16 }}>
                <TrimSection value={trimState} onChange={setTrimState} palette={palettes.frame} openings={openings} />
              </div>
              <div style={{ marginTop: 16 }}>
                <EstimateNotesBlock value={scopeNotes} onChange={setScopeNotes} />
              </div>
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
              userId={userId}
              onPhotoUpdate={updatePhoto}
              onSections={setSections}
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
          trimCost={trimCost}
          trimState={trimState}
          scopeNotes={scopeNotes}
          onEditOpenings={() => setMode('list')}
          onSave={saveEstimate}
          saving={saving}
        />
      )}

      {/* Bottom bar (list mode, only when openings exist) */}
      {mode === 'list' && openings.length > 0 && (
        <>
          {subtypeError && (
            <div style={{ padding: '10px 16px', background: '#FEF2F2', borderTop: '1px solid #FECACA' }}>
              <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{subtypeError}</span>
            </div>
          )}
          <BottomBar
            onBack={() => { setSubtypeError(''); setMode('client') }}
            onContinue={() => {
              const missing = openings.find(o => getType(o.typeId).subs.length > 0 && !o.sub)
              if (missing) { setSubtypeError('Please select a subtype for all openings'); return }
              setSubtypeError('')
              setMode('review')
            }}
            ctaLabel="Continue to details"
          />
        </>
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
