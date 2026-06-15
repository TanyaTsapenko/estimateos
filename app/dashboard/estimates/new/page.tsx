'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { OPENING_TYPES, TAX_RATES, opCost, fmtCAD, dimToSizeBucket, type Opening, type CustomPrices } from '@/lib/pricing'
import { formatPhone, validateName, validatePhone, validateEmail, validateAddress, hasErrors, validateQuantity, validateDimension, validatePositiveNumber, type ClientErrors } from '@/lib/clientValidation'
import AddressAutocomplete from '@/components/AddressAutocomplete'
const estErrStyle: React.CSSProperties = { fontSize: 11, color: '#C0341A', marginTop: 4 }
const estErrBorder = '1.5px solid #C0341A'

type CustomOpeningType = { label: string; base: number; lab: number; category?: string }

interface PaletteEntry {
  id: string
  name: string
  hex_color: string | null
  price_addon: number
  category: string
}

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
  const allItems: Array<{ key: string; name: string; price: number; category: string }> = []
  Object.entries(OPENING_TYPES).forEach(([k, v]) => {
    const cat = k.startsWith('window_') ? 'Windows' : k.startsWith('door_') ? 'Doors' : 'Other'
    const dbPrice = customPrices?.types?.[k]
    const price = dbPrice ? dbPrice.base + dbPrice.lab : v.base + v.lab
    allItems.push({ key: k, name: v.name, price, category: cat })
  })
  if (customOpeningTypes) {
    Object.entries(customOpeningTypes).forEach(([k, v]) => {
      if (!allItems.find(i => i.key === k)) {
        allItems.push({ key: k, name: v.label, price: v.base + v.lab, category: v.category || 'Other' })
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
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, flexShrink: 0 }}>{fmtCAD(item.price)}</span>
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
  job_site_address: string; job_site_city: string; job_site_province: string; job_site_postal_code: string
}

const DEFAULT_OPENING: Omit<Opening, 'id'> = {
  type: 'window_dh', qty: 1, width: 'md', width_in: 0, height_in: 0,
  shape: 'rect', colour: 'white', glass: 'clear', frame: 'none',
  install: 'retrofit', floor: 'first', room: '', sidelight: 0, transom: 0, screen: 0, has_screen: false,
  material: 'vinyl', hardware_colour: 'white', grid_pattern: 'none', brand: '', notes: '',
  tilt_clean: false, opening_direction: '', panels_count: '', bay_angle: '',
  transom_panes: '', sidelight_left: 0, sidelight_right: 0, transom_above: false,
  glass_type: '', core_type: '', handle_type: '', combo_sections: null,
  custom_shape_label: '', custom_colour_label: '',
  interior_photo_url: null, exterior_photo_url: null, photo_3_url: null, photo_4_url: null,
}

function getTypeSpecificOptions(type: string) {
  const windows_with_screen = ['window_dh', 'window_sh', 'window_cas', 'window_awn', 'window_sl']
  const tilt_windows = ['window_dh', 'window_sh']
  const directional = ['window_cas']
  const multi_panel = ['window_sl', 'door_patio']
  const bay_bow = ['window_bay']
  const transom = ['window_trans']
  const door_entry = ['door_entry', 'door_french', 'door_double']
  const storm = ['door_storm']
  const interior = ['door_int']
  const garden = ['door_garden']
  return {
    showScreen: windows_with_screen.includes(type),
    showTiltClean: tilt_windows.includes(type),
    showDirection: directional.includes(type),
    showPanels: multi_panel.includes(type),
    showBayOptions: bay_bow.includes(type),
    showTransomPanes: transom.includes(type),
    showSidelights: door_entry.includes(type),
    showTransomAbove: door_entry.includes(type) || garden.includes(type),
    showGlassType: storm.includes(type),
    showCoreType: interior.includes(type),
    showComboSections: type === 'window_combo',
    showHandleType: ['window_cas', 'window_awn', 'window_tilt', 'door_entry', 'door_french', 'door_patio', 'door_garden', 'door_double', 'door_int'].includes(type),
  }
}

interface OpeningCardProps {
  op: Opening
  idx: number
  customOpeningTypes: Record<string, CustomOpeningType>
  customPrices: CustomPrices | undefined
  palette: PaletteEntry[]
  openingsCount: number
  removeOpening: (id: string) => void
  updateOpening: (id: string, k: keyof Opening, v: string | number | boolean | object | null) => void
  duplicateOpening: (id: string) => void
  userId: string | null
}

function GroupHeader({ title, open, onToggle, icon }: { title: string; open: boolean; onToggle: () => void; icon: React.ReactNode }) {
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', marginTop: 8, cursor: 'pointer', borderTop: '1px solid #F1F5F9', userSelect: 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        {title}
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  )
}

type PhotoSlot = 'interior' | 'exterior' | 'photo_3' | 'photo_4'
const SLOT_FIELD: Record<PhotoSlot, keyof Opening> = {
  interior: 'interior_photo_url',
  exterior: 'exterior_photo_url',
  photo_3:  'photo_3_url',
  photo_4:  'photo_4_url',
}
const PHOTO_SLOTS: { slot: PhotoSlot; label: string }[] = [
  { slot: 'interior', label: 'Interior' },
  { slot: 'exterior', label: 'Exterior' },
  { slot: 'photo_3',  label: 'Additional 1' },
  { slot: 'photo_4',  label: 'Additional 2' },
]
const KNOWN_ROOMS = ['Living Room', 'Kitchen', 'Dining Room', 'Bedroom', 'Bathroom', 'Basement', 'Office']

function OpeningCard({ op, idx, customOpeningTypes, customPrices, palette, openingsCount, removeOpening, updateOpening, duplicateOpening, userId }: OpeningCardProps) {
  const category = op.type.startsWith('window_') ? 'Windows'
    : op.type.startsWith('door_') ? 'Doors'
    : (customOpeningTypes[op.type]?.category || 'Other')
  const categoryPalette = palette.filter(c => c.category === category)
  const hasPalette = categoryPalette.length > 0
  const opts = getTypeSpecificOptions(op.type)
  const hasTypeSpecific = Object.values(opts).some(Boolean)

  const [isExpanded, setIsExpanded] = useState(true)
  const [photoUploading, setPhotoUploading] = useState({ interior: false, exterior: false, photo_3: false, photo_4: false })
  const [photoKeys, setPhotoKeys] = useState(() => { const t = Date.now(); return { interior: t, exterior: t, photo_3: t, photo_4: t } })
  const [photoError, setPhotoError] = useState('')
  const [otherRoomSelected, setOtherRoomSelected] = useState(() => op.room !== '' && !KNOWN_ROOMS.includes(op.room))

  const [openGroup, setOpenGroup] = useState(() => ({
    appearance: true,
    glass: op.glass !== 'clear',
    installation: op.install !== 'retrofit' || op.frame !== 'none' || op.material !== 'vinyl' ||
      !!op.opening_direction || !!op.panels_count || !!op.bay_angle || !!op.transom_panes ||
      op.sidelight_left > 0 || op.sidelight_right > 0 || op.transom_above || op.has_screen ||
      op.tilt_clean || !!op.glass_type || !!op.core_type || !!op.handle_type || !!op.combo_sections,
    notes: !!(op.notes || op.brand || op.interior_photo_url || op.exterior_photo_url || op.photo_3_url || op.photo_4_url),
  }))
  const toggle = (g: keyof typeof openGroup) => setOpenGroup(p => ({ ...p, [g]: !p[g] }))

  async function handlePhotoUpload(slot: PhotoSlot, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowed.includes(file.type)) { setPhotoError('Only JPG, PNG or WebP allowed'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Max 5 MB per photo'); return }
    setPhotoError('')
    setPhotoUploading(p => ({ ...p, [slot]: true }))
    const supabase = createClient()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg')
    const path = `${userId}/${op.id}/${slot}.${ext}`
    const { error } = await supabase.storage.from('opening-photos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setPhotoError('Upload failed: ' + error.message); setPhotoUploading(p => ({ ...p, [slot]: false })); return }
    const { data: urlData } = supabase.storage.from('opening-photos').getPublicUrl(path)
    updateOpening(op.id, SLOT_FIELD[slot], urlData.publicUrl)
    setPhotoKeys(p => ({ ...p, [slot]: Date.now() }))
    setPhotoUploading(p => ({ ...p, [slot]: false }))
  }

  async function handlePhotoDelete(slot: PhotoSlot) {
    const url = op[SLOT_FIELD[slot]] as string | null | undefined
    if (!url || !userId) return
    const supabase = createClient()
    const marker = '/object/public/opening-photos/'
    const markerIdx = url.indexOf(marker)
    if (markerIdx !== -1) {
      const path = decodeURIComponent(url.slice(markerIdx + marker.length).split('?')[0])
      await supabase.storage.from('opening-photos').remove([path])
    }
    updateOpening(op.id, SLOT_FIELD[slot], null)
  }

  const selStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', background: '#fff' } as const
  const lblStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#94A3B8', marginBottom: 6, display: 'block' } as const

  const typeName = OPENING_TYPES[op.type]?.name || customOpeningTypes[op.type]?.label || 'Opening'
  const incomplete = !op.width_in || !op.height_in

  if (!isExpanded) {
    const dimStr = op.width_in && op.height_in ? ` — ${op.width_in}×${op.height_in}"` : ''
    const colourDisplay = op.colour_name || (op.colour !== 'white' ? op.colour : '')
    const colourStr = colourDisplay ? ` · ${colourDisplay}` : ''
    const roomStr = op.room ? ` · ${op.room}` : ''
    return (
      <div className="op-card" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setIsExpanded(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <div className="op-badge" style={{ flexShrink: 0 }}>{idx + 1}</div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--jet)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeName}{dimStr}{colourStr}{roomStr}
            </div>
          </div>
          {(op.interior_photo_url || op.exterior_photo_url || op.photo_3_url || op.photo_4_url) && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: incomplete ? '#D97706' : 'var(--amber)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {incomplete ? '⚠ incomplete' : fmtCAD(opCost(op, customPrices))}
          </div>
          <button onClick={() => duplicateOpening(op.id)} title="Duplicate"
            style={{ background: 'rgba(37,99,235,0.07)', border: 'none', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          {openingsCount > 1 && (
            <button onClick={() => removeOpening(op.id)}
              style={{ background: 'rgba(239,68,68,.1)', border: 'none', borderRadius: 6, padding: '4px 7px', fontSize: 11, color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}>✕</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="op-card">
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, minWidth: 0 }} onClick={() => setIsExpanded(false)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <div className="op-badge" style={{ flexShrink: 0 }}>{idx + 1}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--jet)' }}>
            {typeName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{fmtCAD(opCost(op, customPrices))}</div>
          <button onClick={() => duplicateOpening(op.id)} title="Duplicate"
            style={{ background: 'rgba(37,99,235,0.07)', border: 'none', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          {openingsCount > 1 && (
            <button onClick={() => removeOpening(op.id)}
              style={{ background: 'rgba(239,68,68,.1)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer' }}>✕</button>
          )}
        </div>
      </div>

      {/* ── GROUP 1: Basic Info (always visible) ── */}
      <div className="r2" style={{ marginBottom: 8 }}>
        <div className="f"><label>Type</label>
          <OpeningTypeSelect value={op.type} onChange={v => updateOpening(op.id, 'type', v)} customOpeningTypes={customOpeningTypes} customPrices={customPrices} /></div>
        <div className="f"><label>Qty</label>
          <select value={op.qty} onChange={e => updateOpening(op.id, 'qty', Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select></div>
      </div>
      <div className="r2" style={{ marginBottom: 8 }}>
        <div className="f"><label>Width</label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="1" step="0.5"
              placeholder={op.type?.includes('door') || op.type?.includes('entry') || op.type?.includes('patio') ? '36' : '32'}
              value={op.width_in || ''}
              onChange={e => updateOpening(op.id, 'width_in', e.target.value ? parseFloat(e.target.value) : 0)}
              style={{ paddingRight: 28 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ash)', pointerEvents: 'none' }}>in</span>
          </div></div>
        <div className="f"><label>Height</label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="1" step="0.5"
              placeholder={op.type?.includes('door') || op.type?.includes('entry') || op.type?.includes('patio') ? '80' : '48'}
              value={op.height_in || ''}
              onChange={e => updateOpening(op.id, 'height_in', e.target.value ? parseFloat(e.target.value) : 0)}
              style={{ paddingRight: 28 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ash)', pointerEvents: 'none' }}>in</span>
          </div></div>
      </div>
      <div className="r2" style={{ marginBottom: 4 }}>
        <div className="f"><label>Room (optional)</label>
          <select value={otherRoomSelected ? 'Other' : op.room} onChange={e => {
            const val = e.target.value
            if (val === 'Other') {
              setOtherRoomSelected(true)
              if (KNOWN_ROOMS.includes(op.room)) updateOpening(op.id, 'room', '')
            } else {
              setOtherRoomSelected(false)
              updateOpening(op.id, 'room', val)
            }
          }}>
            <option value="">— select room —</option>
            {KNOWN_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
            <option value="Other">Other</option>
          </select>
          {otherRoomSelected && (
            <input style={{ marginTop: 6 }} placeholder="e.g. Garage, Hallway" value={op.room}
              onChange={e => updateOpening(op.id, 'room', e.target.value)} />
          )}</div>
        <div className="f"><label>Floor</label>
          <select value={op.floor} onChange={e => updateOpening(op.id, 'floor', e.target.value)}>
            <option value="first">Ground floor</option>
            <option value="second">Second floor{customPrices?.surcharges?.second_floor ? ` (+$${customPrices.surcharges.second_floor})` : ''}</option>
            <option value="third">Third floor{customPrices?.surcharges?.third_floor ? ` (+$${customPrices.surcharges.third_floor})` : ''}</option>
          </select></div>
      </div>

      {/* ── GROUP 2: Appearance ── */}
      <GroupHeader title="Appearance" open={openGroup.appearance} onToggle={() => toggle('appearance')} icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      } />
      {openGroup.appearance && (
        <div style={{ paddingTop: 6 }}>
          <div className="r2" style={{ marginBottom: 8 }}>
            <div className="f"><label>Shape</label>
              <select value={op.shape} onChange={e => updateOpening(op.id, 'shape', e.target.value)} disabled={op.type === 'window_combo'} style={{ opacity: op.type === 'window_combo' ? 0.4 : 1, cursor: op.type === 'window_combo' ? 'not-allowed' : 'pointer' }}>
                <option value="rect">Rectangle</option>
                <option value="arch">Arch{customPrices?.surcharges?.arch_pct ? ` (+${customPrices.surcharges.arch_pct}%)` : ''}</option>
                <option value="custom">Custom shape{customPrices?.surcharges?.custom_shape_pct ? ` (+${customPrices.surcharges.custom_shape_pct}%)` : ''}</option>
              </select></div>
            {!hasPalette && (
              <div className="f"><label>Colour</label>
                <select value={op.colour} onChange={e => updateOpening(op.id, 'colour', e.target.value)}>
                  <option value="white">White</option>
                  <option value="black">Black{customPrices?.surcharges?.black_grey ? ` (+$${customPrices.surcharges.black_grey})` : ''}</option>
                  <option value="grey">Grey{customPrices?.surcharges?.black_grey ? ` (+$${customPrices.surcharges.black_grey})` : ''}</option>
                  <option value="custom">Custom colour{customPrices?.surcharges?.custom_colour ? ` (+$${customPrices.surcharges.custom_colour})` : ''}</option>
                </select></div>
            )}
          </div>
          {op.shape === 'custom' && (
            <div style={{ marginBottom: 8 }}>
              <input value={op.custom_shape_label} onChange={e => updateOpening(op.id, 'custom_shape_label', e.target.value)}
                placeholder="Describe the shape (e.g. Half-circle, Triangle…)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', outline: 'none' }} />
            </div>
          )}
          {hasPalette ? (
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Colour</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {categoryPalette.map(c => {
                  const selected = op.colour_palette_id === c.id
                  return (
                    <button key={c.id} type="button" onClick={() => {
                      updateOpening(op.id, 'colour_palette_id', c.id)
                      updateOpening(op.id, 'colour_name', c.name)
                    }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 8px', borderRadius: 10, border: `2px solid ${selected ? '#2563EB' : 'transparent'}`, background: selected ? '#EFF4FF' : 'var(--surface)', cursor: 'pointer' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: c.hex_color || '#E5E7EB', border: '1.5px solid rgba(0,0,0,.1)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,.5))' }}><polyline points="2 7 5.5 10.5 12 3.5"/></svg>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: selected ? 700 : 500, color: selected ? '#2563EB' : 'var(--jet)', maxWidth: 56, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{c.name}</span>
                      {c.price_addon > 0 && <span style={{ fontSize: 9, color: '#94A3B8' }}>+${c.price_addon}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            op.colour === 'custom' && (
              <div style={{ marginBottom: 8 }}>
                <input value={op.custom_colour_label} onChange={e => updateOpening(op.id, 'custom_colour_label', e.target.value)}
                  placeholder="Describe the colour (e.g. Bronze, Dark green…)"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', outline: 'none' }} />
              </div>
            )
          )}
          <div className="r2">
            <div><div style={lblStyle}>Grid pattern</div>
              <select style={selStyle} value={op.grid_pattern} onChange={e => updateOpening(op.id, 'grid_pattern', e.target.value)}>
                <option value="none">None</option>
                <option value="colonial">Colonial</option>
                <option value="prairie">Prairie</option>
                <option value="diamond">Diamond</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div><div style={lblStyle}>Hardware colour</div>
              <select style={selStyle} value={op.hardware_colour} onChange={e => updateOpening(op.id, 'hardware_colour', e.target.value)}>
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="chrome">Chrome</option>
                <option value="brass">Brass</option>
                <option value="bronze">Bronze</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── GROUP 3: Glass & Performance ── */}
      <GroupHeader title="Glass & Performance" open={openGroup.glass} onToggle={() => toggle('glass')} icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      } />
      {openGroup.glass && (
        <div style={{ paddingTop: 6 }}>
          <div className="f"><label>Glass</label>
            <select value={op.glass} onChange={e => updateOpening(op.id, 'glass', e.target.value)}>
              <option value="clear">Clear</option>
              <option value="lowe">Low-E{customPrices?.surcharges?.lowe ? ` (+$${customPrices.surcharges.lowe})` : ''}</option>
              <option value="frosted">Frosted{customPrices?.surcharges?.frosted ? ` (+$${customPrices.surcharges.frosted})` : ''}</option>
              <option value="tinted">Tinted{customPrices?.surcharges?.tinted ? ` (+$${customPrices.surcharges.tinted})` : ''}</option>
              <option value="tempered">Tempered{customPrices?.surcharges?.tempered ? ` (+$${customPrices.surcharges.tempered})` : ''}</option>
            </select>
          </div>
        </div>
      )}

      {/* ── GROUP 4: Installation & Details ── */}
      <GroupHeader title="Installation & Details" open={openGroup.installation} onToggle={() => toggle('installation')} icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
      } />
      {openGroup.installation && (
        <div style={{ paddingTop: 6 }}>
          <div className="r1" style={{ marginBottom: 8 }}>
            <div className="f"><label>Installation</label>
              <select value={op.install} onChange={e => updateOpening(op.id, 'install', e.target.value)}>
                <option value="retrofit">Retrofit</option>
                <option value="fullframe">Full Frame{customPrices?.surcharges?.fullframe ? ` (+$${customPrices.surcharges.fullframe})` : ''}</option>
                <option value="stud_to_stud">Stud to Stud{customPrices?.surcharges?.stud_to_stud ? ` (+$${customPrices.surcharges.stud_to_stud})` : ''}</option>
              </select></div>
          </div>
          <div className="r1" style={{ marginBottom: 8 }}>
            <div className="f"><label>Existing Opening Condition</label>
              <select value={op.frame} onChange={e => updateOpening(op.id, 'frame', e.target.value)}>
                <option value="none">Good</option>
                <option value="repair">Needs repair{customPrices?.surcharges?.frame_repair ? ` (+$${customPrices.surcharges.frame_repair})` : ''}</option>
                <option value="rotted">Rotted{customPrices?.surcharges?.frame_rotted ? ` (+$${customPrices.surcharges.frame_rotted})` : ''}</option>
              </select></div>
          </div>
          <div className="r1" style={{ marginBottom: hasTypeSpecific ? 10 : 0 }}>
            <div><div style={lblStyle}>Material</div>
              <select style={selStyle} value={op.material} onChange={e => updateOpening(op.id, 'material', e.target.value)}>
                <option value="vinyl">Vinyl</option>
                <option value="wood">Wood</option>
                <option value="fiberglass">Fiberglass</option>
                <option value="aluminum">Aluminum</option>
                <option value="composite">Composite</option>
              </select>
            </div>
          </div>

          {hasTypeSpecific && (
            <div style={{ paddingTop: 4, borderTop: '0.5px solid #F1F5F9' }}>
              {opts.showScreen && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>Screen included</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Insect screen</div>
                  </div>
                  <div onClick={() => updateOpening(op.id, 'has_screen', !op.has_screen)}
                    style={{ width: 40, height: 22, borderRadius: 99, background: op.has_screen ? '#2563EB' : '#E2E5EA', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: op.has_screen ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
              )}
              {opts.showTiltClean && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>Tilt-in for cleaning</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Both sashes tilt in</div>
                  </div>
                  <div onClick={() => updateOpening(op.id, 'tilt_clean', !op.tilt_clean)}
                    style={{ width: 40, height: 22, borderRadius: 99, background: op.tilt_clean ? '#2563EB' : '#E2E5EA', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: op.tilt_clean ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
              )}
              {opts.showDirection && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Opening direction</div>
                  <select value={op.opening_direction} onChange={e => updateOpening(op.id, 'opening_direction', e.target.value)}
                    style={{ ...selStyle, color: op.opening_direction ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    <option value='left'>Left</option>
                    <option value='right'>Right</option>
                    <option value='both'>Both (double casement)</option>
                  </select>
                </div>
              )}
              {opts.showPanels && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Number of panels</div>
                  <select value={op.panels_count} onChange={e => updateOpening(op.id, 'panels_count', e.target.value)}
                    style={{ ...selStyle, color: op.panels_count ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    <option value='2'>2 panels</option>
                    <option value='3'>3 panels</option>
                  </select>
                </div>
              )}
              {opts.showBayOptions && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Sections</div>
                  <select value={op.panels_count} onChange={e => updateOpening(op.id, 'panels_count', e.target.value)}
                    style={{ ...selStyle, color: op.panels_count ? '#0A1628' : '#94A3B8', marginBottom: 8 }}>
                    <option value=''>Select...</option>
                    <option value='3'>3 sections</option>
                    <option value='5'>5 sections</option>
                    <option value='7'>7 sections</option>
                  </select>
                  <div style={lblStyle}>Angle</div>
                  <select value={op.bay_angle} onChange={e => updateOpening(op.id, 'bay_angle', e.target.value)}
                    style={{ ...selStyle, color: op.bay_angle ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    <option value='30'>30°</option>
                    <option value='45'>45°</option>
                    <option value='60'>60°</option>
                  </select>
                </div>
              )}
              {opts.showTransomPanes && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Number of panes</div>
                  <select value={op.transom_panes} onChange={e => updateOpening(op.id, 'transom_panes', e.target.value)}
                    style={{ ...selStyle, color: op.transom_panes ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    <option value='2'>2 panes</option>
                    <option value='3'>3 panes</option>
                    <option value='4'>4 panes</option>
                  </select>
                </div>
              )}
              {opts.showSidelights && (
                <>
                  <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                    <div style={lblStyle}>Left sidelight width (in)</div>
                    <input type="number" min="0" value={op.sidelight_left || ''} placeholder="0 = none"
                      onChange={e => updateOpening(op.id, 'sidelight_left', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', background: '#fff' }} />
                  </div>
                  <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                    <div style={lblStyle}>Right sidelight width (in)</div>
                    <input type="number" min="0" value={op.sidelight_right || ''} placeholder="0 = none"
                      onChange={e => updateOpening(op.id, 'sidelight_right', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', background: '#fff' }} />
                  </div>
                </>
              )}
              {opts.showTransomAbove && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0A1628' }}>Transom above</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Window above door</div>
                  </div>
                  <div onClick={() => updateOpening(op.id, 'transom_above', !op.transom_above)}
                    style={{ width: 40, height: 22, borderRadius: 99, background: op.transom_above ? '#2563EB' : '#E2E5EA', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: op.transom_above ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
              )}
              {opts.showGlassType && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Glass coverage</div>
                  <select value={op.glass_type} onChange={e => updateOpening(op.id, 'glass_type', e.target.value)}
                    style={{ ...selStyle, color: op.glass_type ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    <option value='full'>Full glass</option>
                    <option value='half'>Half glass</option>
                  </select>
                </div>
              )}
              {opts.showCoreType && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Core type</div>
                  <select value={op.core_type} onChange={e => updateOpening(op.id, 'core_type', e.target.value)}
                    style={{ ...selStyle, color: op.core_type ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    <option value='hollow'>Hollow core</option>
                    <option value='solid'>Solid core</option>
                  </select>
                </div>
              )}
              {opts.showHandleType && (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #F1F5F9' }}>
                  <div style={lblStyle}>Handle type</div>
                  <select value={op.handle_type || ''} onChange={e => updateOpening(op.id, 'handle_type', e.target.value)}
                    style={{ ...selStyle, color: op.handle_type ? '#0A1628' : '#94A3B8' }}>
                    <option value=''>Select...</option>
                    {['window_cas', 'window_awn', 'window_tilt'].includes(op.type) ? <>
                      <option value='casement_lever'>Casement lever</option>
                      <option value='tilt_latch'>Tilt latch</option>
                      <option value='lift_rail'>Lift rail</option>
                      <option value='push_bar'>Push bar</option>
                    </> : <>
                      <option value='lever'>Lever handle</option>
                      <option value='knob'>Knob</option>
                      <option value='pull_bar'>Pull bar</option>
                      <option value='passage_set'>Passage set</option>
                      <option value='deadbolt_lever'>Deadbolt + lever</option>
                      <option value='dummy'>Dummy handle</option>
                    </>}
                  </select>
                </div>
              )}
              {opts.showComboSections && (() => {
                const sections: { type: string; width: number }[] = op.combo_sections || [{ type: 'window_fix', width: 24 }, { type: 'window_cas', width: 14 }]
                const typeLabels: Record<string, string> = { window_dh: 'D-Hung', window_sh: 'S-Hung', window_cas: 'Casement', window_awn: 'Awning', window_sl: 'Slider', window_fix: 'Fixed', window_trans: 'Transom' }
                return (
                  <div style={{ padding: '8px 0' }}>
                    <div style={lblStyle}>Sections</div>
                    <div style={{ display: 'flex', gap: 3, height: 48, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
                      {sections.map((s, i) => (
                        <div key={i} style={{ flex: s.width, border: '1.5px solid #E2E8F0', borderRadius: 6, background: s.type === 'window_fix' ? '#F8FAFC' : '#EEF4FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: s.type === 'window_fix' ? '#334155' : '#2563EB' }}>{typeLabels[s.type] || s.type}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>{s.width}"</div>
                        </div>
                      ))}
                      <div onClick={() => updateOpening(op.id, 'combo_sections' as any, [...sections, { type: 'window_fix', width: 14 }])}
                        style={{ width: 28, border: '1.5px dashed #E2E8F0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563EB', fontSize: 18, flexShrink: 0 }}>+</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 }}>
                      {sections.map((s, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ width: 20, height: 20, background: '#F1F5F9', borderRadius: 5, fontSize: 12, fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                            <select value={s.type} onChange={e => updateOpening(op.id, 'combo_sections' as any, sections.map((sec, j) => j === i ? { ...sec, type: e.target.value } : sec))}
                              style={{ flex: 1, padding: '9px 10px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', background: '#fff' }}>
                              <option value="window_fix">Fixed</option>
                              <option value="window_dh">Double-Hung</option>
                              <option value="window_cas">Casement</option>
                              <option value="window_awn">Awning</option>
                              <option value="window_sl">Slider</option>
                              <option value="window_trans">Transom</option>
                            </select>
                            {sections.length > 1 && (
                              <div onClick={() => updateOpening(op.id, 'combo_sections' as any, sections.filter((_, j) => j !== i))}
                                style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 10px' }}>
                            <input type="number" min="1" value={s.width}
                              onChange={e => updateOpening(op.id, 'combo_sections' as any, sections.map((sec, j) => j === i ? { ...sec, width: parseFloat(e.target.value) || 0 } : sec))}
                              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}/>
                            <span style={{ fontSize: 9, color: '#94A3B8', flexShrink: 0 }}>in</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, padding: '6px 8px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12, color: '#64748B' }}>
                      <span style={{ color: '#94A3B8' }}>Config: </span>
                      <span style={{ color: '#0A1628', fontWeight: 600 }}>{sections.map(s => `${typeLabels[s.type] || s.type} ${s.width}"`).join(' + ')}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── GROUP 5: Notes & Photos ── */}
      <GroupHeader title="Notes & Photos" open={openGroup.notes} onToggle={() => toggle('notes')} icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      } />
      {openGroup.notes && (
        <div style={{ paddingTop: 6 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={lblStyle}>Manufacturer (optional)</div>
            <input style={{ ...selStyle, boxSizing: 'border-box' as const }} value={op.brand}
              onChange={e => updateOpening(op.id, 'brand', e.target.value)} placeholder="e.g. Pella, North Star, Gentek" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={lblStyle}>Notes (this opening)</div>
            <textarea value={op.notes} onChange={e => updateOpening(op.id, 'notes', e.target.value)}
              placeholder="e.g. Remove existing trim, custom colour match" rows={2}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#0A1628', background: '#fff', resize: 'vertical', boxSizing: 'border-box' as const }} />
          </div>

          {/* ── Photos ── */}
          <div>
            <div style={lblStyle}>Photos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PHOTO_SLOTS.map(({ slot, label }) => {
                const url = op[SLOT_FIELD[slot]] as string | null | undefined
                const loading = photoUploading[slot]
                const inputId = `photo-${op.id}-${slot}`
                return (
                  <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                      {label}
                    </div>
                    {url ? (
                      <div style={{ position: 'relative' }}>
                        <img src={`${url}?v=${photoKeys[slot]}`} alt={label}
                          style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 3 }}>
                          <label htmlFor={`${inputId}-replace`} title="Replace"
                            style={{ background: 'rgba(0,0,0,0.52)', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="3"/>
                            </svg>
                            <input id={`${inputId}-replace`} type="file" accept="image/*" capture="environment"
                              style={{ display: 'none' }} onChange={e => handlePhotoUpload(slot, e)} />
                          </label>
                          <button onClick={() => handlePhotoDelete(slot)} title="Remove"
                            style={{ background: 'rgba(220,38,38,0.7)', border: 'none', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor={inputId}
                        style={{ aspectRatio: '1 / 1', borderRadius: 8, border: '2px dashed #CBD5E1', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: loading ? 'default' : 'pointer', gap: 5, opacity: loading ? 0.55 : 1 }}>
                        {loading ? (
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>Uploading…</div>
                        ) : (
                          <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                            <span style={{ fontSize: 9, color: '#94A3B8', textAlign: 'center', lineHeight: 1.2 }}>Take photo</span>
                          </>
                        )}
                        <input id={inputId} type="file" accept="image/*" capture="environment"
                          style={{ display: 'none' }} disabled={loading} onChange={e => handlePhotoUpload(slot, e)} />
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
            {photoError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>{photoError}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function formatPostal(v: string): string {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  return raw.length > 3 ? `${raw.slice(0, 3)} ${raw.slice(3)}` : raw
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
    job_site_address: '', job_site_city: '', job_site_province: '', job_site_postal_code: '',
  })

  const [openings, setOpenings] = useState<Opening[]>(() => [{ id: crypto.randomUUID(), ...DEFAULT_OPENING }])
  const [profile, setProfile] = useState<{ province: string; default_valid_days?: number } | null>(null)
  const [customPrices, setCustomPrices] = useState<CustomPrices | undefined>(undefined)
  const [customOpeningTypes, setCustomOpeningTypes] = useState<Record<string, CustomOpeningType>>({})
  const [palette, setPalette] = useState<PaletteEntry[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('')
  const [clientErrors, setClientErrors] = useState<ClientErrors>({})
  const [jobSiteSameAsClient, setJobSiteSameAsClient] = useState(true)
  const userIdRef     = useRef<string | null>(null)
  const priceUserIdRef = useRef<string | null>(null)

  const setCErr = (k: keyof ClientErrors, v: string | null) => setClientErrors(p => ({ ...p, [k]: v }))
  const clearCErr = (k: keyof ClientErrors) => setCErr(k, null)

  function applyPriceRows(priceRows: any[] | null) {
    if (!priceRows || priceRows.length === 0) return
    const types: Record<string, { base: number; lab: number }> = {}
    priceRows.filter((r: any) => r.opening_type !== '_sizes').forEach((r: any) => {
      types[r.opening_type] = { base: r.base_price, lab: r.labour_price }
    })
    setCustomPrices(prev => ({ colourPalette: prev?.colourPalette, surcharges: prev?.surcharges, types }))
    const customTypesMap: Record<string, CustomOpeningType> = {}
    priceRows.filter((r: any) => r.opening_type !== '_sizes' && r.custom_label).forEach((r: any) => {
      customTypesMap[r.opening_type] = {
        label:    r.custom_label,
        base:     r.base_price,
        lab:      r.labour_price,
        category: r.category || 'Other',
      }
    })
    setCustomOpeningTypes(customTypesMap)
  }

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || !priceUserIdRef.current) return
      const { data: priceRows } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', priceUserIdRef.current)
      applyPriceRows(priceRows)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      userIdRef.current = sanitizedId

      // Load profile first to resolve team_owner_id before fetching pricing data
      const { data: prof } = await supabase
        .from('profiles')
        .select('province, role, team_owner_id, default_valid_days')
        .eq('id', sanitizedId)
        .single()

      // Team members use their owner's price list, surcharges, and colour palette
      const pricingId = (prof as any)?.team_owner_id || sanitizedId
      priceUserIdRef.current = pricingId

      const [{ data: priceRows }, { data: profSurcharges }, { data: paletteRows }] = await Promise.all([
        supabase.from('price_lists').select('*').eq('user_id', pricingId).order('category', { nullsFirst: false }).order('custom_label', { nullsFirst: false }),
        supabase.from('profiles').select('surcharges').eq('id', pricingId).single(),
        supabase.from('color_palette').select('id, name, hex_color, price_addon, category').eq('user_id', pricingId).order('sort_order').order('created_at'),
      ])
      if (prof) {
        setProfile(prof)
      }
      if (profSurcharges?.surcharges) {
        setCustomPrices(prev => ({ types: prev?.types || {}, surcharges: profSurcharges.surcharges }))
      }
      if (paletteRows) {
        setPalette(paletteRows as PaletteEntry[])
        const palMap: Record<string, number> = {}
        ;(paletteRows as any[]).forEach(c => { palMap[c.id] = c.price_addon || 0 })
        setCustomPrices(prev => ({ ...(prev || { types: {} }), colourPalette: palMap }))
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
            job_site_address:   (est as any).job_site_address || '',
            job_site_city:      (est as any).job_site_city || '',
            job_site_province:  (est as any).job_site_province || '',
            job_site_postal_code: (est as any).job_site_postal_code || '',
          })
          setJobSiteSameAsClient((est as any).job_site_same_as_client !== false)
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
            sidelight: op.sidelight, transom: op.transom, screen: op.screen, has_screen: op.has_screen || false,
            material: op.material || 'vinyl', hardware_colour: op.hardware_colour || 'white',
            grid_pattern: op.grid_pattern || 'none', brand: op.brand || '', notes: op.notes || '',
            tilt_clean: op.tilt_clean || false, opening_direction: op.opening_direction || '',
            panels_count: op.panels_count || '', bay_angle: op.bay_angle || '',
            transom_panes: op.transom_panes || '', sidelight_left: op.sidelight_left || 0,
            sidelight_right: op.sidelight_right || 0, transom_above: op.transom_above || false,
            glass_type: op.glass_type || '', core_type: op.core_type || '',
            handle_type: (op as any).handle_type || '',
            combo_sections: (op as any).combo_sections || null,
            custom_shape_label: (op as any).custom_shape_label || '',
            custom_colour_label: (op as any).custom_colour_label || '',
            colour_palette_id: (op as any).colour_palette_id || null,
            colour_name: (op as any).colour_name || null,
            interior_photo_url: (op as any).interior_photo_url || null,
            exterior_photo_url: (op as any).exterior_photo_url || null,
            photo_3_url: (op as any).photo_3_url || null,
            photo_4_url: (op as any).photo_4_url || null,
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

  const province = client.client_province || profile?.province || 'AB'
  const [taxRate, taxLabel] = TAX_RATES[province] || [0.05, 'GST (5%)']
  const subtotal = openings.reduce((s, op) => s + opCost(op, customPrices), 0)
  const discountAmt = discountValue
    ? discountType === 'percent'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0
  const afterDiscount = subtotal - discountAmt
  const taxAmount = afterDiscount * taxRate
  const total = afterDiscount + taxAmount

  function addOpening() {
    setOpenings(p => [...p, { id: crypto.randomUUID(), ...DEFAULT_OPENING }])
  }
  function removeOpening(id: string) {
    if (openings.length <= 1) return
    setOpenings(p => p.filter(o => o.id !== id))
  }
  function duplicateOpening(id: string) {
    setOpenings(p => {
      const idx = p.findIndex(o => o.id === id)
      if (idx === -1) return p
      const dupe = { ...p[idx], id: crypto.randomUUID() }
      return [...p.slice(0, idx + 1), dupe, ...p.slice(idx + 1)]
    })
  }
  function updateOpening(id: string, k: keyof Opening, v: string | number | boolean | object | null) {
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
    const missingDimensions = openings.some(op => !op.width_in || !op.height_in)
    if (missingDimensions) { setError('Please enter width and height for all openings'); return }

    for (const op of openings) {
      const qtyErr = validateQuantity(op.qty)
      if (qtyErr) { setError(qtyErr); return }
      const wErr = validateDimension(op.width_in as number, 'Width')
      if (wErr) { setError(wErr); return }
      const hErr = validateDimension(op.height_in as number, 'Height')
      if (hErr) { setError(hErr); return }
    }
    if (discountValue) {
      const discErr = validatePositiveNumber(parseFloat(discountValue), 'Discount')
      if (discErr) { setError(discErr); return }
    }

    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

    const estimateFields = {
      ...client,
      job_site_same_as_client: jobSiteSameAsClient,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_type: discountAmt > 0 ? discountType : null,
      discount_value: discountAmt > 0 ? parseFloat(discountValue) : null,
      discount_amount: Math.round(discountAmt * 100) / 100,
      tax_rate: taxRate,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }

    // Resolve client_id — from appointment or find-or-create
    let clientId: string | null = null
    if (apptId) {
      const { data: apptRow } = await supabase.from('appointments').select('client_id').eq('id', apptId).single()
      clientId = (apptRow as any)?.client_id || null
    } else {
      try {
        const phone = client.client_phone.trim() || null
        const email = client.client_email.trim() || null
        if (phone) {
          const { data: byPhone } = await supabase.from('clients').select('id').eq('owner_id', sanitizedId).eq('phone', phone).maybeSingle()
          clientId = byPhone?.id ?? null
        }
        if (!clientId && email) {
          const { data: byEmail } = await supabase.from('clients').select('id').eq('owner_id', sanitizedId).eq('email', email).maybeSingle()
          clientId = byEmail?.id ?? null
        }
        if (!clientId) {
          const { data: created } = await supabase.from('clients').insert({
            owner_id:    sanitizedId,
            name:        client.client_name.trim(),
            phone:       phone,
            email:       email,
            address:     client.client_address.trim() || null,
            city:        client.client_city.trim() || null,
            province:    client.client_province || null,
            postal_code: client.client_postal_code.trim() || null,
          }).select('id').maybeSingle()
          clientId = created?.id ?? null
        }
      } catch {}
    }

    let savedId: string

    if (editId) {
      const { error: estErr } = await supabase.from('estimates').update(estimateFields).eq('id', editId)
      if (estErr) { setError(estErr.message); setSaving(false); return }
      savedId = editId
    } else {
      const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('user_id', sanitizedId)
      const num = `EST-${String((count || 0) + 1).padStart(4, '0')}`
      const { data: est, error: estErr } = await supabase.from('estimates').insert({
        user_id: sanitizedId,
        estimate_number: num,
        ...estimateFields,
        client_id: clientId,
        status: 'draft',
        valid_until: new Date(Date.now() + (profile?.default_valid_days || 30) * 86400000).toISOString().slice(0, 10),
        appointment_id: apptId || null,
      }).select('id').single()
      if (estErr || !est) { setError(estErr?.message || 'Failed to save'); setSaving(false); return }
      savedId = est.id
    }

    const rows = openings.map((op, i) => ({
      id: op.id,
      estimate_id: savedId,
      type: op.type, qty: op.qty,
      width: (op.width_in && op.height_in) ? dimToSizeBucket(op.width_in, op.height_in) : op.width,
      width_in: op.width_in || null,
      height_in: op.height_in || null,
      shape: op.shape, colour: op.colour, glass: op.glass, frame: op.frame,
      install: op.install, floor: op.floor, room: op.room,
      sidelight: op.sidelight, transom: op.transom,
      has_screen: Boolean(op.has_screen),
      material: (op as any).material || 'vinyl',
      hardware_colour: (op as any).hardware_colour || 'white',
      grid_pattern: (op as any).grid_pattern || 'none',
      brand: (op as any).brand || '',
      notes: (op as any).notes || '',
      tilt_clean: op.tilt_clean === true || op.tilt_clean === ('true' as any) ? true : false,
      opening_direction: op.opening_direction || '',
      panels_count: op.panels_count || '',
      bay_angle: op.bay_angle || '',
      transom_panes: op.transom_panes || '',
      sidelight_left: Number(op.sidelight_left) || 0,
      sidelight_right: Number(op.sidelight_right) || 0,
      transom_above: op.transom_above === true || op.transom_above === ('true' as any) ? true : false,
      glass_type: op.glass_type || '',
      core_type: op.core_type || '',
      handle_type: op.handle_type || '',
      combo_sections: (op as any).combo_sections ? JSON.stringify((op as any).combo_sections) : null,
      custom_shape_label: op.custom_shape_label || null,
      custom_colour_label: op.custom_colour_label || null,
      colour_palette_id: op.colour_palette_id || null,
      colour_name: op.colour_name || null,
      interior_photo_url: op.interior_photo_url || null,
      exterior_photo_url: op.exterior_photo_url || null,
      photo_3_url: op.photo_3_url || null,
      photo_4_url: op.photo_4_url || null,
      unit_cost: Math.round(opCost({ ...op, qty: 1 }, customPrices) * 100) / 100,
      total_cost: Math.round(opCost(op, customPrices) * 100) / 100,
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
        <div className="page-hd" style={{
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
                  onSelect={({ street, city, province, postalCode }) => {
                    clearCErr('client_address')
                    setClient(p => ({
                      ...p,
                      client_address: street,
                      ...(city       && { client_city: city }),
                      ...(province   && TAX_RATES[province] && { client_province: province }),
                      ...(postalCode && { client_postal_code: formatPostal(postalCode) }),
                    }))
                  }}
                />
                {clientErrors.client_address && <div style={estErrStyle}>{clientErrors.client_address}</div>}
              </div></div>
              <div className="r2">
                <div className="f"><label>City</label>
                  <input placeholder="Calgary" value={client.client_city}
                    onChange={e => setClient(p => ({ ...p, client_city: e.target.value }))} />
                </div>
                <div className="f"><label>Province</label>
                  <select value={client.client_province}
                    onChange={e => setClient(p => ({ ...p, client_province: e.target.value }))}>
                    {Object.entries(TAX_RATES).sort().map(([k, [, lbl]]) => (
                      <option key={k} value={k}>{k} — {lbl}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="r1"><div className="f"><label>Postal Code</label>
                <input placeholder="A1A 1A1" value={client.client_postal_code}
                  onChange={e => setClient(p => ({ ...p, client_postal_code: formatPostal(e.target.value) }))} />
              </div></div>

              {/* Job Site Address */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>Job site is the same as client's address</div>
                  <div
                    onClick={() => setJobSiteSameAsClient(p => !p)}
                    style={{ width: 44, height: 24, borderRadius: 999, flexShrink: 0,
                      background: jobSiteSameAsClient ? '#2563EB' : '#E2E5EA',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: jobSiteSameAsClient ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                  </div>
                </div>
                {!jobSiteSameAsClient && (
                  <>
                    <div className="r1"><div className="f">
                      <label>Job Site Address</label>
                      <AddressAutocomplete
                        value={client.job_site_address}
                        placeholder="456 Work Site Ave"
                        onChange={v => setClient(p => ({ ...p, job_site_address: v }))}
                        onSelect={({ street, city, province, postalCode }) => {
                          setClient(p => ({
                            ...p,
                            job_site_address: street,
                            ...(city && { job_site_city: city }),
                            ...(province && { job_site_province: province }),
                            ...(postalCode && { job_site_postal_code: formatPostal(postalCode) }),
                          }))
                        }}
                      />
                    </div></div>
                    <div className="r2">
                      <div className="f"><label>City</label>
                        <input placeholder="Calgary" value={client.job_site_city}
                          onChange={e => setClient(p => ({ ...p, job_site_city: e.target.value }))} />
                      </div>
                      <div className="f"><label>Province</label>
                        <select value={client.job_site_province || 'AB'}
                          onChange={e => setClient(p => ({ ...p, job_site_province: e.target.value }))}>
                          {Object.entries(TAX_RATES).sort().map(([k, [, lbl]]) => (
                            <option key={k} value={k}>{k} — {lbl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="r1"><div className="f"><label>Postal Code</label>
                      <input placeholder="A1A 1A1" value={client.job_site_postal_code}
                        onChange={e => setClient(p => ({ ...p, job_site_postal_code: formatPostal(e.target.value) }))} />
                    </div></div>
                  </>
                )}
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
                    <span>{fmtCAD(opCost(op, customPrices))}</span>
                  </div>
                ))}
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
                    customOpeningTypes={customOpeningTypes} customPrices={customPrices} palette={palette}
                    openingsCount={openings.length} removeOpening={removeOpening} updateOpening={updateOpening} duplicateOpening={duplicateOpening} userId={userIdRef.current} />
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
  const pills = [1, 2, 4]
  const stepLabels = ['Client', 'Openings', 'Review']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page-hd" style={{
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
                onSelect={({ street, city, province, postalCode }) => {
                  clearCErr('client_address')
                  setClient(p => ({
                    ...p,
                    client_address: street,
                    ...(city       && { client_city: city }),
                    ...(province   && TAX_RATES[province] && { client_province: province }),
                    ...(postalCode && { client_postal_code: formatPostal(postalCode) }),
                  }))
                }}
              />
              {clientErrors.client_address && <div style={estErrStyle}>{clientErrors.client_address}</div>}
            </div></div>
            <div className="r2">
              <div className="f"><label>City</label>
                <input placeholder="Calgary" value={client.client_city}
                  onChange={e => setClient(p => ({ ...p, client_city: e.target.value }))} />
              </div>
              <div className="f"><label>Province</label>
                <select value={client.client_province}
                  onChange={e => setClient(p => ({ ...p, client_province: e.target.value }))}>
                  {Object.entries(TAX_RATES).sort().map(([k, [, lbl]]) => (
                    <option key={k} value={k}>{k} — {lbl}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="r1"><div className="f"><label>Postal Code</label>
              <input placeholder="A1A 1A1" value={client.client_postal_code}
                onChange={e => setClient(p => ({ ...p, client_postal_code: formatPostal(e.target.value) }))} />
            </div></div>

            {/* Job Site Address */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>Job site is the same as client's address</div>
                <div
                  onClick={() => setJobSiteSameAsClient(p => !p)}
                  style={{ width: 44, height: 24, borderRadius: 999, flexShrink: 0,
                    background: jobSiteSameAsClient ? '#2563EB' : '#E2E5EA',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <div style={{ position: 'absolute', top: 3, left: jobSiteSameAsClient ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
              {!jobSiteSameAsClient && (
                <>
                  <div className="r1"><div className="f">
                    <label>Job Site Address</label>
                    <AddressAutocomplete
                      value={client.job_site_address}
                      placeholder="456 Work Site Ave"
                      onChange={v => setClient(p => ({ ...p, job_site_address: v }))}
                      onSelect={({ street, city, province, postalCode }) => {
                        setClient(p => ({
                          ...p,
                          job_site_address: street,
                          ...(city && { job_site_city: city }),
                          ...(province && { job_site_province: province }),
                          ...(postalCode && { job_site_postal_code: formatPostal(postalCode) }),
                        }))
                      }}
                    />
                  </div></div>
                  <div className="r2">
                    <div className="f"><label>City</label>
                      <input placeholder="Calgary" value={client.job_site_city}
                        onChange={e => setClient(p => ({ ...p, job_site_city: e.target.value }))} />
                    </div>
                    <div className="f"><label>Province</label>
                      <select value={client.job_site_province || 'AB'}
                        onChange={e => setClient(p => ({ ...p, job_site_province: e.target.value }))}>
                        {Object.entries(TAX_RATES).sort().map(([k, [, lbl]]) => (
                          <option key={k} value={k}>{k} — {lbl}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="r1"><div className="f"><label>Postal Code</label>
                    <input placeholder="A1A 1A1" value={client.job_site_postal_code}
                      onChange={e => setClient(p => ({ ...p, job_site_postal_code: formatPostal(e.target.value) }))} />
                  </div></div>
                </>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="info-box">Add each window or door as a separate opening. Quantities and options affect the price.</div>
            {openings.map((op, idx) => <OpeningCard key={op.id} op={op} idx={idx}
              customOpeningTypes={customOpeningTypes} customPrices={customPrices} palette={palette}
              openingsCount={openings.length} removeOpening={removeOpening} updateOpening={updateOpening} duplicateOpening={duplicateOpening} userId={userIdRef.current} />)}
            <button onClick={addOpening}
              style={{ width: '100%', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 12, padding: 13, fontSize: 13, fontWeight: 600, color: 'var(--ash)', cursor: 'pointer', marginBottom: 14 }}>
              + Add another opening
            </button>
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
                  <span>{fmtCAD(opCost(op, customPrices))}</span>
                </div>
              ))}
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
