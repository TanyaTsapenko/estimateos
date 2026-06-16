'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { C } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { FieldLabel } from './primitives'
import { formatPhone } from '@/lib/clientValidation'

export type ClientInfo = {
  id?: string
  name: string
  email: string
  phone: string
  address: string
}

type ClientRow = { id: string; name: string; email: string | null; phone: string | null; address: string | null; city: string | null }
type SubMode = 'browse' | 'create' | 'selected'

type Props = {
  value: ClientInfo
  onChange: (c: ClientInfo) => void
  onContinue: () => void
}

export function ClientStep({ value, onChange, onContinue }: Props) {
  const supabase = createClient()
  const [subMode, setSubMode] = useState<SubMode>(value.id ? 'selected' : value.name ? 'create' : 'browse')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [nameErr, setNameErr] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, phone, address, city')
        .eq('owner_id', user.id)
        .order('name')
        .limit(200)
      setClients(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search.trim()
    ? clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : clients

  const selectClient = (c: ClientRow) => {
    onChange({ id: c.id, name: c.name, email: c.email || '', phone: c.phone || '', address: [c.address, c.city].filter(Boolean).join(', ') })
    setSubMode('selected')
    setSearch('')
  }

  const startCreate = () => {
    onChange({ name: '', email: '', phone: '', address: '' })
    setSubMode('create')
  }

  const backToBrowse = () => {
    onChange({ name: '', email: '', phone: '', address: '' })
    setNameErr('')
    setSubMode('browse')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  const handleContinue = () => {
    if (subMode === 'create' && !value.name.trim()) { setNameErr('Name is required'); return }
    setNameErr('')
    onContinue()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 46, padding: '0 13px', borderRadius: 12,
    border: `1px solid ${C.borderStrong}`, background: C.card,
    fontSize: 13, fontWeight: 600, color: C.ink,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Selected client card ── */}
      {subMode === 'selected' && (
        <div>
          <FieldLabel>Client</FieldLabel>
          <div style={{ borderRadius: 14, border: `1px solid ${C.blueLine}`, background: C.blueSoft, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 99, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {value.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{value.name}</div>
              {(value.phone || value.email) && (
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>
                  {[value.phone, value.email].filter(Boolean).join(' · ')}
                </div>
              )}
              {value.address && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>{value.address}</div>}
            </div>
            <button
              onClick={backToBrowse}
              style={{ flexShrink: 0, background: 'transparent', border: `1px solid ${C.blueLine}`, borderRadius: 9, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.blueDeep, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* ── Browse mode ── */}
      {subMode === 'browse' && (
        <>
          <div>
            <FieldLabel>Find existing client</FieldLabel>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <EBIcon name="search" size={16} color={C.inkSoft} />
              </span>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone or email…"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>

            {loading ? (
              <div style={{ fontSize: 13, color: C.inkSoft, padding: '10px 4px' }}>Loading clients…</div>
            ) : (clients.length > 0 || search.trim()) ? (
              <div style={{ marginTop: 8, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
                {filtered.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => selectClient(c)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 99, background: C.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: C.blue }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{c.name}</div>
                      {c.phone && <div style={{ fontSize: 12, color: C.inkSoft }}>{c.phone}</div>}
                    </div>
                    <EBIcon name="chev-r" size={16} color={C.inkFaint} />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: '16px', fontSize: 13, color: C.inkSoft, textAlign: 'center' }}>
                    No clients match &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <button
            onClick={startCreate}
            style={{ width: '100%', height: 48, borderRadius: 12, border: `1.5px dashed ${C.blueLine}`, background: C.card, color: C.blue, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
          >
            <EBIcon name="plus" size={16} color={C.blue} />New client
          </button>
        </>
      )}

      {/* ── Create mode ── */}
      {subMode === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={backToBrowse}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.inkMid, fontSize: 13, fontWeight: 700, padding: 0, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
          >
            <EBIcon name="back" size={16} color={C.inkMid} />Search clients
          </button>

          <div>
            <FieldLabel>Name *</FieldLabel>
            <input
              value={value.name}
              placeholder="Andriy Koval"
              onChange={e => { onChange({ ...value, name: e.target.value }); if (nameErr) setNameErr('') }}
              style={{ ...inputStyle, border: nameErr ? `1.5px solid ${C.red}` : `1px solid ${C.borderStrong}` }}
            />
            {nameErr && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{nameErr}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={value.email}
                placeholder="andriy@email.com"
                onChange={e => onChange({ ...value, email: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input
                type="tel"
                value={value.phone}
                placeholder="(403) 555-0100"
                onChange={e => onChange({ ...value, phone: formatPhone(e.target.value) })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Address</FieldLabel>
            <input
              value={value.address}
              placeholder="123 Maple St, Calgary, AB"
              onChange={e => onChange({ ...value, address: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* ── Continue / Skip ── */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleContinue}
          style={{ width: '100%', height: 50, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: '0 6px 20px rgba(59,108,255,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Continue to openings →
        </button>
        {subMode === 'browse' && (
          <button
            onClick={onContinue}
            style={{ display: 'block', width: '100%', marginTop: 10, background: 'transparent', border: 'none', fontSize: 13, color: C.inkSoft, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}
          >
            Skip — add client later
          </button>
        )}
      </div>
    </div>
  )
}
