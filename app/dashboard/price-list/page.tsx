'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'
import ConfirmModal from '@/components/ConfirmModal'

interface PriceItem {
  key: string
  label: string
  base: number
  lab: number
  category: string
}

const PRESET_CATEGORIES = ['Windows', 'Doors', 'Other']
const F = '"Inter", system-ui, -apple-system, sans-serif'

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px',
  border: '1.5px solid #E2E5EA', borderRadius: 10, fontSize: 14,
  fontFamily: F, color: '#0A1628', outline: 'none',
}

export default function PriceListPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [items,        setItems]        = useState<PriceItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [error,        setError]        = useState('')
  const [deletingItem, setDeletingItem] = useState<PriceItem | null>(null)

  // Modal
  const [showModal,          setShowModal]          = useState(false)
  const [editingItem,        setEditingItem]        = useState<PriceItem | null>(null)
  const [modalName,          setModalName]          = useState('')
  const [modalBase,          setModalBase]          = useState('')
  const [modalLab,           setModalLab]           = useState('')
  const [modalCategory,      setModalCategory]      = useState('Windows')
  const [modalCustomCategory,setModalCustomCategory] = useState('')
  const [modalSaving,        setModalSaving]        = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('price_lists')
        .select('*')
        .eq('user_id', user.id)
        .neq('opening_type', '_sizes')
        .order('category', { ascending: true, nullsFirst: false })
        .order('custom_label', { ascending: true, nullsFirst: false })
      if (data) {
        setItems(data.map(r => ({
          key:      r.opening_type,
          label:    r.custom_label || r.opening_type,
          base:     r.base_price   || 0,
          lab:      r.labour_price || 0,
          category: r.category     || 'Other',
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  function openAddModal(defaultCategory = 'Windows') {
    setEditingItem(null)
    setModalName('')
    setModalBase('')
    setModalLab('')
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
    const isPreset = PRESET_CATEGORIES.includes(item.category)
    setModalCategory(isPreset ? item.category : 'new')
    setModalCustomCategory(isPreset ? '' : item.category)
    setError('')
    setShowModal(true)
  }

  async function saveModal() {
    if (!modalName.trim() || !userId) return
    const category = modalCategory === 'new'
      ? (modalCustomCategory.trim() || 'Other')
      : modalCategory
    const base = parseFloat(modalBase) || 0
    const lab  = parseFloat(modalLab)  || 0
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
          updated_at:   new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('opening_type', editingItem.key)
      if (e) { setError(e.message); setModalSaving(false); return }
      setItems(prev =>
        prev.map(it => it.key === editingItem.key
          ? { ...it, label: modalName.trim(), base, lab, category }
          : it
        ).sort((a, b) =>
          a.category.localeCompare(b.category) || a.label.localeCompare(b.label)
        )
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
          updated_at:   new Date().toISOString(),
        })
      if (e) { setError(e.message); setModalSaving(false); return }
      setItems(prev =>
        [...prev, { key, label: modalName.trim(), base, lab, category }]
          .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label))
      )
    }

    setModalSaving(false)
    setShowModal(false)
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

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)', fontFamily: F }}
        >
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                onKeyDown={e => { if (e.key === 'Enter') saveModal() }}
                placeholder="e.g. Casement Window"
                style={inputStyle}
              />
            </div>

            {/* Prices */}
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
          {hasItems && (
            <button
              onClick={() => openAddModal()}
              style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
            >
              + Add Item
            </button>
          )}
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: '8px 16px 100px' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
          )}

          {!loading && !hasItems && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>No items yet</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
                Add the windows, doors, and other products you install. They'll appear in your estimate form.
              </div>
              <button
                onClick={() => openAddModal()}
                style={{ padding: '12px 28px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
              >
                + Add First Item
              </button>
            </div>
          )}

          {!loading && hasItems && Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} style={{ marginBottom: 4 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 2px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: '#2563EB', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    {category}
                  </span>
                </div>
                <button
                  onClick={() => openAddModal(category)}
                  style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, padding: '4px 0' }}
                >
                  + Add item
                </button>
              </div>

              {/* Items card */}
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
                {catItems.map((item, i) => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '13px 16px',
                      borderBottom: i < catItems.length - 1 ? '1px solid #EEF0F4' : 'none',
                    }}
                  >
                    <div
                      onClick={() => openEditModal(item)}
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginRight: 14, flexShrink: 0 }}>
                      {fmtCAD(item.base + item.lab)}
                    </div>
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
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>

        <BottomNav />
      </div>
    </>
  )
}
