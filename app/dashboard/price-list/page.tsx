'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD, OPENING_TYPES } from '@/lib/pricing'
import ConfirmModal from '@/components/ConfirmModal'
import { ClipboardList, ArrowLeft } from 'lucide-react'
import { usePermissions } from '@/lib/usePermissions'
import AppTopBar from '@/components/AppTopBar'

interface PriceItem {
  key: string
  label: string
  base: number
  lab: number
  category: string
  description: string
}

interface ColorEntry {
  id: string
  name: string
  hex_color: string | null
  manufacturer_code: string | null
  price_addon: number
  sort_order: number
  category: string
}

const PRESET_CATEGORIES = ['Windows', 'Doors', 'Other', 'Hardware']
const F = '"Inter", system-ui, -apple-system, sans-serif'

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px',
  border: '1.5px solid #E2E5EA', borderRadius: 10, fontSize: 14,
  fontFamily: F, color: '#0A1628', outline: 'none',
}

export default function PriceListPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { role, loading: roleLoading, permissions } = usePermissions()

  const [items,        setItems]        = useState<PriceItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [pricingUserId, setPricingUserId] = useState<string | null>(null)
  const [error,        setError]        = useState('')
  const [deletingItem, setDeletingItem] = useState<PriceItem | null>(null)
  const [activeTab,    setActiveTab]    = useState<'items' | 'surcharges' | 'colours'>('items')
  const [surcharges, setSurcharges] = useState({
    arch_pct: 0, custom_shape_pct: 0,
    black_grey: 0, custom_colour: 0,
    lowe: 0, frosted: 0, tinted: 0, tempered: 0, obscure: 0, triple_pane: 0, egress_required: 0,
    fullframe: 0, stud_to_stud: 0,
    second_floor: 0, third_floor: 0,
    frame_repair: 0, frame_rotted: 0,
    casing_oak: 0, casing_vinyl: 0, casing_mdf: 0, casing_custom: 0,
    casing_size_3_3_8: 0,
    jamb_oak: 0, jamb_wood: 0, jamb_vinyl: 0, jamb_plywood: 0, jamb_custom: 0,
    brickmold: 0,
    rosettes_round: 0, rosettes_45: 0, rosettes_flat: 0,
    caping: 0, nail_fin: 0, drip_cap: 0, blue_skin: 0,
  })
  const [savingSurcharges, setSavingSurcharges] = useState(false)
  const [isOwner, setIsOwner] = useState(true)
  const [search, setSearch] = useState('')

  // Modal — base fields
  const [showModal,           setShowModal]           = useState(false)
  const [editingItem,         setEditingItem]         = useState<PriceItem | null>(null)
  const [modalName,           setModalName]           = useState('')
  const [modalBase,           setModalBase]           = useState('')
  const [modalLab,            setModalLab]            = useState('')
  const [modalCategory,       setModalCategory]       = useState('Windows')
  const [modalCustomCategory, setModalCustomCategory] = useState('')
  const [modalDescription,    setModalDescription]    = useState('')
  const [modalSaving,         setModalSaving]         = useState(false)
  const [surchargeSearch,     setSurchargeSearch]     = useState('')

  const [paletteItems,      setPaletteItems]      = useState<ColorEntry[]>([])
  const [paletteLoaded,     setPaletteLoaded]     = useState(false)
  const [paletteLoading,    setPaletteLoading]    = useState(false)
  const [activeColourCat,   setActiveColourCat]   = useState('Windows')
  const [showColourModal,   setShowColourModal]   = useState(false)
  const [editingColour,     setEditingColour]     = useState<ColorEntry | null>(null)
  const [colourModalName,   setColourModalName]   = useState('')
  const [colourModalHex,    setColourModalHex]    = useState('#FFFFFF')
  const [colourModalCode,   setColourModalCode]   = useState('')
  const [colourModalAddon,  setColourModalAddon]  = useState('0')
  const [colourModalSaving, setColourModalSaving] = useState(false)
  const [deletingColour,    setDeletingColour]    = useState<ColorEntry | null>(null)
  const [colourError,       setColourError]       = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
      const { data: profData } = await supabase.from('profiles').select('role, team_owner_id, surcharges').eq('id', sanitizedId).single()
      // admin/manager with price_list permission get edit access, not just read-only
      const ownerFlag = profData?.role === 'owner'
        || ((profData?.role === 'admin' || profData?.role === 'manager') && permissions?.price_list === true)
      setIsOwner(ownerFlag)
      // team members (any role) always read from the owner's data
      const queryUserId = profData?.team_owner_id || sanitizedId
      setUserId(queryUserId)   // writes go to owner's records for admin/manager too
      setPricingUserId(queryUserId)
      let { data } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', queryUserId)
        .neq('opening_type', '_sizes')
        .order('category', { ascending: true, nullsFirst: false })
        .order('custom_label', { ascending: true, nullsFirst: false })
      // only seed defaults for the actual account owner (no team_owner_id)
      if (data && data.length === 0 && !profData?.team_owner_id) {
        const seeds = Object.entries(OPENING_TYPES).map(([key, val]) => ({
          user_id:      queryUserId,
          type:         key,
          opening_type: key,
          custom_label: val.name,
          base_price:   val.base,
          labour_price: val.lab,
          category:     key.startsWith('window') ? 'Windows' : 'Doors',
        }))
        await supabase.from('price_lists').insert(seeds)
        const { data: refetched } = await supabase
          .from('price_lists')
          .select('*')
          .eq('user_id', queryUserId)
          .neq('opening_type', '_sizes')
          .order('category', { ascending: true, nullsFirst: false })
          .order('custom_label', { ascending: true, nullsFirst: false })
        data = refetched
      }
      if (data) {
        setItems(data.map(r => ({
          key:         r.opening_type,
          label:       r.custom_label || r.opening_type,
          base:        r.base_price   || 0,
          lab:         r.labour_price || 0,
          category:    r.category     || 'Other',
          description: (r as any).description || '',
        })))
      }
      // actual owner: surcharges are on their own profile; team members: fetch from owner
      if (!profData?.team_owner_id) {
        if (profData?.surcharges && Object.keys(profData.surcharges).length > 0) {
          setSurcharges(prev => ({ ...prev, ...profData.surcharges }))
        }
      } else {
        const { data: ownerProf } = await supabase.from('profiles').select('surcharges').eq('id', queryUserId).single()
        if (ownerProf?.surcharges && Object.keys(ownerProf.surcharges).length > 0) {
          setSurcharges(prev => ({ ...prev, ...ownerProf.surcharges }))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (activeTab !== 'colours' || paletteLoaded || !pricingUserId) return
    async function loadPalette() {
      setPaletteLoading(true)
      const { data } = await supabase.from('color_palette').select('*').eq('user_id', pricingUserId).order('sort_order').order('created_at')
      setPaletteItems((data || []).map((r: any) => ({
        id: r.id, name: r.name, hex_color: r.hex_color, manufacturer_code: r.manufacturer_code,
        price_addon: r.price_addon || 0, sort_order: r.sort_order || 0, category: r.category,
      })))
      setPaletteLoaded(true)
      setPaletteLoading(false)
    }
    loadPalette()
  }, [activeTab, pricingUserId, paletteLoaded])

  function openAddModal(defaultCategory = 'Windows') {
    setEditingItem(null)
    setModalName('')
    setModalBase('')
    setModalLab('')
    setModalDescription('')
    const isPreset = PRESET_CATEGORIES.includes(defaultCategory)
    setModalCategory(isPreset ? defaultCategory : 'new')
    setModalCustomCategory(isPreset ? '' : defaultCategory)
    setError('')
    setShowModal(true)
  }

  function openEditModal(item: PriceItem) {
    setEditingItem(item)
    setModalName(item.label)
    setModalBase(item.base ? String(item.base) : '')
    setModalLab(item.lab ? String(item.lab) : '')
    setModalDescription(item.description || '')
    const isPreset = PRESET_CATEGORIES.includes(item.category)
    setModalCategory(isPreset ? item.category : 'new')
    setModalCustomCategory(isPreset ? '' : item.category)
    setError('')
    setShowModal(true)
  }

  async function saveModal() {
    if (!modalName.trim() || !userId) return

    // Empty custom category
    if (modalCategory === 'new' && !modalCustomCategory.trim()) {
      setError('Please enter a category name.')
      return
    }

    const rawCategory = modalCategory === 'new' ? modalCustomCategory.trim() : modalCategory
    // Normalize to an existing category name (case-insensitive) to prevent near-duplicate categories
    const allCategories = [...PRESET_CATEGORIES, ...Object.keys(grouped)]
    const matchedCategory = allCategories.find(c => c.toLowerCase() === rawCategory.toLowerCase())
    const category = matchedCategory || rawCategory

    const base = parseFloat(modalBase) || 0
    const lab  = parseFloat(modalLab)  || 0

    // Negative price check
    if (base < 0 || lab < 0) {
      setError('Price cannot be negative.')
      return
    }

    // Duplicate item name in same category
    const duplicateExists = items.some(it =>
      it.label.toLowerCase() === modalName.trim().toLowerCase() &&
      it.category.toLowerCase() === category.toLowerCase() &&
      it.key !== (editingItem?.key ?? '')
    )
    if (duplicateExists) {
      setError('An item with this name already exists in this category.')
      return
    }

    setModalSaving(true)
    setError('')

    if (editingItem) {
      const { error: e } = await supabase
        .from('price_lists')
        .update({
          custom_label: modalName.trim(),
          base_price:   base,
          labour_price: lab,
          category,
          description:  modalDescription.trim() || null,
          updated_at:   new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('opening_type', editingItem.key)
      if (e) { setError(e.message); setModalSaving(false); return }
      setItems(prev =>
        prev.map(it => it.key === editingItem.key
          ? { ...it, label: modalName.trim(), base, lab, category, description: modalDescription.trim() }
          : it
        ).sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label))
      )
    } else {
      const key = 'custom_' + Date.now()
      const { error: e } = await supabase
        .from('price_lists')
        .insert({
          user_id:      userId,
          opening_type: key,
          custom_label: modalName.trim(),
          base_price:   base,
          labour_price: lab,
          category,
          description:  modalDescription.trim() || null,
          type:         'custom',
          updated_at:   new Date().toISOString(),
        })
      if (e) { setError(e.message); setModalSaving(false); return }
      setItems(prev =>
        [...prev, { key, label: modalName.trim(), base, lab, category, description: modalDescription.trim() }]
          .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label))
      )
    }

    setModalSaving(false)
    setShowModal(false)
  }

  const [flashMsg, setFlashMsg] = useState('')
  const [flashErr, setFlashErr] = useState('')
  function flash(msg: string) { setFlashMsg(msg); setTimeout(() => setFlashMsg(''), 2500) }
  function flashError(msg: string) { setFlashErr(msg); setTimeout(() => setFlashErr(''), 3000) }

  async function saveSurchargesHandler() {
    if (!userId) return
    if (Object.values(surcharges).some(v => v < 0)) {
      flashError('Surcharge values cannot be negative.')
      return
    }
    setSavingSurcharges(true)
    await supabase.from('profiles').update({ surcharges }).eq('id', userId)
    setSavingSurcharges(false)
    flash('Surcharges saved!')
  }

  function openAddColour() {
    setEditingColour(null)
    setColourModalName('')
    setColourModalHex('#FFFFFF')
    setColourModalCode('')
    setColourModalAddon('0')
    setColourError('')
    setShowColourModal(true)
  }
  function openEditColour(c: ColorEntry) {
    setEditingColour(c)
    setColourModalName(c.name)
    setColourModalHex(c.hex_color || '#FFFFFF')
    setColourModalCode(c.manufacturer_code || '')
    setColourModalAddon(String(c.price_addon))
    setColourError('')
    setShowColourModal(true)
  }
  async function saveColour() {
    if (!colourModalName.trim() || !userId) return
    setColourModalSaving(true); setColourError('')
    const addon = parseFloat(colourModalAddon) || 0
    if (editingColour) {
      const { error: e } = await supabase.from('color_palette').update({
        name: colourModalName.trim(), hex_color: colourModalHex || null,
        manufacturer_code: colourModalCode.trim() || null, price_addon: addon,
      }).eq('id', editingColour.id)
      if (e) { setColourError(e.message); setColourModalSaving(false); return }
      setPaletteItems(prev => prev.map(p => p.id === editingColour.id
        ? { ...p, name: colourModalName.trim(), hex_color: colourModalHex, manufacturer_code: colourModalCode.trim() || null, price_addon: addon }
        : p))
    } else {
      const catItems = paletteItems.filter(p => p.category === activeColourCat)
      const nextOrder = catItems.length > 0 ? Math.max(...catItems.map(p => p.sort_order)) + 1 : 0
      const { data: created, error: e } = await supabase.from('color_palette').insert({
        user_id: userId, category: activeColourCat,
        name: colourModalName.trim(), hex_color: colourModalHex || null,
        manufacturer_code: colourModalCode.trim() || null,
        price_addon: addon, sort_order: nextOrder,
      }).select().single()
      if (e || !created) { setColourError(e?.message || 'Failed'); setColourModalSaving(false); return }
      setPaletteItems(prev => [...prev, {
        id: (created as any).id, name: (created as any).name, hex_color: (created as any).hex_color,
        manufacturer_code: (created as any).manufacturer_code, price_addon: (created as any).price_addon || 0,
        sort_order: (created as any).sort_order || 0, category: (created as any).category,
      }])
    }
    setColourModalSaving(false)
    setShowColourModal(false)
  }
  async function deleteColour(c: ColorEntry) {
    if (!userId) return
    const { count } = await supabase.from('estimate_openings').select('id', { count: 'exact', head: true }).eq('colour_palette_id', c.id)
    if (count && count > 0) {
      setColourError(`Cannot delete: colour is used in ${count} existing opening(s). Remove it from estimates first.`)
      setDeletingColour(null); return
    }
    await supabase.from('color_palette').delete().eq('id', c.id)
    setPaletteItems(prev => prev.filter(p => p.id !== c.id))
    setDeletingColour(null)
  }
  async function moveColour(c: ColorEntry, direction: 'up' | 'down') {
    if (!userId) return
    const catItems = paletteItems.filter(p => p.category === c.category).sort((a, b) => a.sort_order - b.sort_order)
    const idx = catItems.findIndex(p => p.id === c.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= catItems.length) return
    const reordered = [...catItems]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    await Promise.all(reordered.map((item, i) => supabase.from('color_palette').update({ sort_order: i }).eq('id', item.id)))
    setPaletteItems(prev => {
      const others = prev.filter(p => p.category !== c.category)
      return [...others, ...reordered.map((item, i) => ({ ...item, sort_order: i }))]
    })
  }

  async function deleteItem(item: PriceItem) {
    if (!userId) return
    await supabase.from('price_lists').delete().eq('user_id', userId).eq('opening_type', item.key)
    setItems(prev => prev.filter(i => i.key !== item.key))
    setDeletingItem(null)
  }

  const grouped = items.reduce<Record<string, PriceItem[]>>((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const hasItems = Object.keys(grouped).length > 0

  const displayGrouped = search.trim()
    ? Object.fromEntries(
        Object.entries(grouped)
          .map(([cat, catItems]) => [cat, catItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))] as [string, PriceItem[]])
          .filter(([, catItems]) => catItems.length > 0)
      )
    : grouped

  const allColourCategories = [...new Set([...PRESET_CATEGORIES, ...Object.keys(grouped)])]

  if (roleLoading) return null
  if (role === 'estimator') return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', fontFamily: F }}>
      <AppTopBar onBack={() => router.push('/dashboard/settings')} title="Price List" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>Access restricted</div>
        <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>Price List is managed by your account owner or manager.</div>
        <button onClick={() => router.push('/dashboard/settings')} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
          Back to Settings
        </button>
      </div>
    </div>
  )

  return (
    <>
      <ConfirmModal
        open={!!deletingItem}
        icon="trash"
        title={`Delete ${deletingItem?.label ?? ''}?`}
        body="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingItem && deleteItem(deletingItem)}
        onCancel={() => setDeletingItem(null)}
      />

      <ConfirmModal
        open={!!deletingColour}
        icon="trash"
        title={`Delete "${deletingColour?.name ?? ''}"?`}
        body="This colour will be removed from your palette. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingColour && deleteColour(deletingColour)}
        onCancel={() => setDeletingColour(null)}
      />

      {/* ── COLOUR MODAL ── */}
      {showColourModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowColourModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', fontFamily: F }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>{editingColour ? 'Edit Colour' : 'Add Colour'}</div>
              <button onClick={() => setShowColourModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
            </div>
            {colourError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{colourError}</div>}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Colour swatch</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: colourModalHex, border: '2px solid #E2E5EA' }} />
                  <input type="color" value={colourModalHex} onChange={e => setColourModalHex(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                </label>
                <input value={colourModalHex} onChange={e => setColourModalHex(e.target.value)} placeholder="#FFFFFF" maxLength={7}
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', textTransform: 'uppercase' }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Name</div>
              <input autoFocus value={colourModalName} onChange={e => setColourModalName(e.target.value)} placeholder="e.g. White, Bronze, RAL 7016" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Manufacturer code <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </div>
              <input value={colourModalCode} onChange={e => setColourModalCode(e.target.value)} placeholder="e.g. RAL 7016, SW 6258" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Price add-on ($)</div>
              <input type="number" min="0" step="5" value={colourModalAddon} onChange={e => setColourModalAddon(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowColourModal(false)} style={{ flex: 1, padding: 13, background: '#F5F6F8', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: F }}>Cancel</button>
              <button onClick={saveColour} disabled={!colourModalName.trim() || colourModalSaving}
                style={{ flex: 2, padding: 13, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: F,
                  background: !colourModalName.trim() ? '#CBD5E1' : '#2563EB',
                  cursor: !colourModalName.trim() || colourModalSaving ? 'not-allowed' : 'pointer' }}>
                {colourModalSaving ? 'Saving…' : 'Save Colour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', fontFamily: F }}
        >
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A1628' }}>{editingItem ? 'Edit Item' : 'Add Item'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>
            )}

            {/* Item Name */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Item Name</div>
              <input
                autoFocus
                value={modalName}
                onChange={e => setModalName(e.target.value)}
                placeholder="e.g. Casement Window"
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
              <textarea
                value={modalDescription}
                onChange={e => setModalDescription(e.target.value)}
                placeholder="e.g. Includes installation and hardware"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              />
            </div>

            {/* Price input */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Materials ($)</div>
                <input
                  type="number" min="0" step="10"
                  value={modalBase}
                  onChange={e => setModalBase(e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Labour ($)</div>
                <input
                  type="number" min="0" step="10"
                  value={modalLab}
                  onChange={e => setModalLab(e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Category chips */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Category</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[...PRESET_CATEGORIES, 'new'].map(cat => {
                  const active = modalCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setModalCategory(cat)}
                      style={{
                        padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${active ? '#2563EB' : '#E2E5EA'}`,
                        background: active ? 'rgba(37,99,235,0.08)' : '#fff',
                        color: active ? '#2563EB' : '#64748B',
                        cursor: 'pointer', fontFamily: F,
                      }}
                    >
                      {cat === 'new' ? '+ New' : cat}
                    </button>
                  )
                })}
              </div>
              {modalCategory === 'new' && (
                <input
                  autoFocus
                  value={modalCustomCategory}
                  onChange={e => setModalCustomCategory(e.target.value)}
                  placeholder="e.g. Skylights"
                  style={{ ...inputStyle, marginTop: 10, border: '1.5px solid #2563EB' }}
                />
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: 13, background: '#F5F6F8', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: F }}
              >
                Cancel
              </button>
              <button
                onClick={saveModal}
                disabled={!modalName.trim() || modalSaving}
                style={{
                  flex: 2, padding: 13, border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: F,
                  background: !modalName.trim() ? '#CBD5E1' : '#2563EB',
                  cursor: !modalName.trim() || modalSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {modalSaving ? 'Saving…' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: F }}>

        {/* ── TOPBAR ── */}
        <AppTopBar
          onBack={() => router.push('/dashboard/settings')}
          backLabel="Settings"
          eyebrow="BUSINESS"
          title="Price List"
          right={hasItems && isOwner && activeTab === 'items' ? (
            <button
              onClick={() => openAddModal()}
              style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
            >
              + Add Item
            </button>
          ) : undefined}
        />

        {/* ── TAB SWITCHER ── */}
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, margin: '12px 16px 0', gap: 2 }}>
          {(['items', 'surcharges', 'colours'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: F,
              fontSize: 13, fontWeight: 600,
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#0A1628' : '#64748B',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              {tab === 'items' ? 'Items' : tab === 'surcharges' ? 'Surcharges' : 'Colours'}
            </button>
          ))}
        </div>

        {flashMsg && (
          <div style={{ margin: '10px 16px 0', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
            {flashMsg}
          </div>
        )}
        {flashErr && (
          <div style={{ margin: '10px 16px 0', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#DC2626' }}>
            {flashErr}
          </div>
        )}

        {/* ── BODY ── */}
        {activeTab === 'items' && <div style={{ padding: '8px 16px 100px' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
          )}

          {!loading && !hasItems && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: 48, height: 48, background: 'rgba(37,99,235,.08)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <ClipboardList size={22} color="#2563EB" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>No items yet</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
                Add the windows, doors, and other products you install. They'll appear in your estimate form.
              </div>
              {isOwner && (
                <button
                  onClick={() => openAddModal()}
                  style={{ padding: '12px 28px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
                >
                  + Add First Item
                </button>
              )}
            </div>
          )}

          {!loading && hasItems && (
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search items..."
                style={{ ...inputStyle, paddingLeft: 36, marginBottom: 0 }}
              />
            </div>
          )}

          {!loading && hasItems && search.trim() && Object.keys(displayGrouped).length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: 13 }}>
              No items match &ldquo;{search}&rdquo;
            </div>
          )}

          {!loading && hasItems && Object.entries(displayGrouped).map(([category, catItems]) => {
            const isHardware = category === 'Hardware'
            return (
            <div key={category} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 2px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: isHardware ? '#CBD5E1' : '#2563EB', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isHardware ? '#94A3B8' : '#94A3B8' }}>
                    {category}
                  </span>
                </div>
                {isOwner && (
                  <button
                    onClick={() => openAddModal(category)}
                    style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: '4px 0' }}
                  >
                    + Add Item
                  </button>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: isHardware ? '1.5px dashed #CBD5E1' : '0.5px solid #E5E7EB', overflow: 'hidden' }}>
                {catItems.map((item, i) => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '13px 16px',
                      borderBottom: i < catItems.length - 1 ? (isHardware ? '1px dashed #E2E8F0' : '1px solid #F1F5F9') : 'none',
                    }}
                  >
                    <div onClick={() => isOwner && openEditModal(item)} style={{ flex: 1, minWidth: 0, cursor: isOwner ? 'pointer' : 'default' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isHardware ? '#64748B' : '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </div>
                      {item.description && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>}
                    </div>
                    <div style={{ marginRight: isOwner ? 14 : 0, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>{fmtCAD(item.base + item.lab)}</span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setDeletingItem(item)}
                        style={{
                          background: 'rgba(220,38,38,0.08)', border: 'none', borderRadius: 8,
                          width: 32, height: 32, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
          })}

        </div>}

        {activeTab === 'surcharges' && (
          <div style={{ padding: '12px 16px 100px' }}>
            <div style={{ marginBottom: 12 }}>
              <input
                value={surchargeSearch}
                onChange={e => setSurchargeSearch(e.target.value)}
                placeholder="Search surcharges…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid #E2E5EA', borderRadius: 10, fontSize: 14, fontFamily: F, color: '#0A1628', background: '#fff', outline: 'none' }}
              />
            </div>
            {[
              { label: 'Shape', fields: [
                { key: 'arch_pct', label: 'Arch', unit: '%' },
                { key: 'custom_shape_pct', label: 'Custom shape', unit: '%' },
              ]},
              { label: 'Colour', fields: [
                { key: 'black_grey', label: 'Black / Grey', unit: '$' },
                { key: 'custom_colour', label: 'Custom colour', unit: '$' },
              ]},
              { label: 'Glass', fields: [
                { key: 'triple_pane', label: 'Triple Pane upgrade', unit: '$' },
                { key: 'lowe', label: 'Low-E', unit: '$' },
                { key: 'tempered', label: 'Tempered', unit: '$' },
                { key: 'frosted', label: 'Frosted', unit: '$' },
                { key: 'tinted', label: 'Tinted', unit: '$' },
                { key: 'obscure', label: 'Obscure', unit: '$' },
                { key: 'egress_required', label: 'Egress Required', unit: '$' },
              ]},
              { label: 'Installation', fields: [
                { key: 'fullframe', label: 'Full Frame', unit: '$' },
                { key: 'stud_to_stud', label: 'Stud to Stud', unit: '$' },
              ]},
              { label: 'Floor', fields: [
                { key: 'second_floor', label: '2nd floor', unit: '$' },
                { key: 'third_floor', label: '3rd floor', unit: '$' },
              ]},
              { label: 'Frame condition', fields: [
                { key: 'frame_repair', label: 'Needs repair', unit: '$' },
                { key: 'frame_rotted', label: 'Rotted frame', unit: '$' },
              ]},
              { label: 'Trim & Accessories — Casing', fields: [
                { key: 'casing_oak', label: 'Oak casing', unit: '$' },
                { key: 'casing_vinyl', label: 'Vinyl casing', unit: '$' },
                { key: 'casing_mdf', label: 'MDF casing', unit: '$' },
                { key: 'casing_custom', label: 'Custom casing', unit: '$' },
                { key: 'casing_size_3_3_8', label: '3-3/8" size upcharge', unit: '$' },
              ]},
              { label: 'Trim & Accessories — Jamb', fields: [
                { key: 'jamb_oak', label: 'Oak jamb', unit: '$' },
                { key: 'jamb_wood', label: 'Wood jamb', unit: '$' },
                { key: 'jamb_vinyl', label: 'Vinyl jamb', unit: '$' },
                { key: 'jamb_plywood', label: 'Plywood jamb', unit: '$' },
                { key: 'jamb_custom', label: 'Custom jamb', unit: '$' },
              ]},
              { label: 'Trim & Accessories — Brickmold & Rosettes', fields: [
                { key: 'brickmold', label: 'Brickmold', unit: '$' },
                { key: 'rosettes_round', label: 'Round rosettes', unit: '$' },
                { key: 'rosettes_45', label: '45° rosettes', unit: '$' },
                { key: 'rosettes_flat', label: 'Flat rosettes', unit: '$' },
              ]},
              { label: 'Trim & Accessories — Other', fields: [
                { key: 'caping', label: 'Caping', unit: '$' },
                { key: 'nail_fin', label: 'Nail fin', unit: '$' },
                { key: 'drip_cap', label: 'Drip cap', unit: '$' },
                { key: 'blue_skin', label: 'Blue skin', unit: '$' },
              ]},
            ].filter(({ label, fields }) => {
              if (!surchargeSearch.trim()) return true
              const q = surchargeSearch.toLowerCase()
              return label.toLowerCase().includes(q) || fields.some(f => f.label.toLowerCase().includes(q))
            }).map(({ label, fields }) => (
              <div key={label} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 2px 8px' }}>
                  <div style={{ width: 3, height: 14, background: '#2563EB', borderRadius: 2, marginRight: 8 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8' }}>{label}</span>
                </div>
                <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    {fields.map(({ key, label: fieldLabel, unit }, i) => (
                      <div key={key} style={{ padding: '12px 14px', borderBottom: i < fields.length - 2 ? '1px solid #F1F5F9' : 'none', borderRight: i % 2 === 0 ? '1px solid #F1F5F9' : 'none' }}>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>{fieldLabel}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px' }}>
                          {unit === '$' && <span style={{ fontSize: 12, color: '#94A3B8' }}>$</span>}
                          <input
                            type="number" min="0"
                            value={surcharges[key as keyof typeof surcharges]}
                            onChange={e => setSurcharges(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0A1628', textAlign: 'right', outline: 'none', fontFamily: F }}
                          />
                          {unit === '%' && <span style={{ fontSize: 12, color: '#94A3B8' }}>%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isOwner && (
              <button onClick={saveSurchargesHandler} disabled={savingSurcharges}
                style={{ width: '100%', marginTop: 16, background: savingSurcharges ? '#93C5FD' : '#2563EB', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F }}>
                {savingSurcharges ? 'Saving…' : 'Save surcharges'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'colours' && (
          <div style={{ padding: '12px 16px 100px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
              {allColourCategories.map(cat => (
                <button key={cat} onClick={() => setActiveColourCat(cat)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                  border: `1.5px solid ${activeColourCat === cat ? '#2563EB' : '#E2E5EA'}`,
                  background: activeColourCat === cat ? '#EFF4FF' : '#fff',
                  color: activeColourCat === cat ? '#2563EB' : '#64748B',
                  cursor: 'pointer', fontFamily: F,
                }}>{cat}</button>
              ))}
            </div>
            {colourError && !showColourModal && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{colourError}</div>
            )}
            {isOwner && (
              <button onClick={openAddColour} style={{
                width: '100%', padding: '12px', background: '#EFF4FF', border: '1.5px dashed #93C5FD',
                borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#2563EB',
                cursor: 'pointer', fontFamily: F, marginBottom: 12,
              }}>+ Add colour</button>
            )}
            {paletteLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
            ) : (() => {
              const catItems = paletteItems.filter(p => p.category === activeColourCat).sort((a, b) => a.sort_order - b.sort_order)
              if (catItems.length === 0) return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
                  No colours for {activeColourCat} yet.{isOwner ? ' Tap "+ Add colour" above to build your palette.' : ''}
                </div>
              )
              return (
                <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', overflow: 'hidden' }}>
                  {catItems.map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: i < catItems.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: c.hex_color || '#E5E7EB', border: '1px solid rgba(0,0,0,.1)', flexShrink: 0 }} />
                      <div onClick={() => isOwner && openEditColour(c)} style={{ flex: 1, minWidth: 0, cursor: isOwner ? 'pointer' : 'default' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        {c.manufacturer_code && <div style={{ fontSize: 11, color: '#94A3B8' }}>{c.manufacturer_code}</div>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', flexShrink: 0 }}>
                        {c.price_addon > 0 ? `+$${c.price_addon}` : 'No fee'}
                      </div>
                      {isOwner && (
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          <button onClick={() => moveColour(c, 'up')} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: i === 0 ? '#F8FAFC' : '#fff', color: i === 0 ? '#CBD5E1' : '#64748B', fontSize: 11, cursor: i === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                          <button onClick={() => moveColour(c, 'down')} disabled={i === catItems.length - 1} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: i === catItems.length - 1 ? '#F8FAFC' : '#fff', color: i === catItems.length - 1 ? '#CBD5E1' : '#64748B', fontSize: 11, cursor: i === catItems.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
                          <button onClick={() => { setColourError(''); setDeletingColour(c) }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(220,38,38,0.08)', color: '#DC2626', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </>
  )
}
