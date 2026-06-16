'use client'
import { useState } from 'react'
import { C, CATALOG } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { MiniDiagram } from './diagram'

type Props = {
  open: boolean
  current?: string
  onPick: (typeId: string) => void
  onClose: () => void
}

export function TypePickerSheet({ open, current, onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 75, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,0.32)' }} />
      <div style={{ position: 'relative', background: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'max(22px, env(safe-area-inset-bottom))', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.22)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: C.borderStrong, margin: '9px auto 4px' }} />
        <div style={{ padding: '6px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>Choose product type</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <EBIcon name="x" size={16} color={C.inkMid} />
          </button>
        </div>
        <div style={{ padding: '0 18px 10px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <EBIcon name="search" size={16} color={C.inkSoft} />
            </span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search types…"
              style={{ width: '100%', height: 42, padding: '0 12px 0 36px', borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 18px 4px' }}>
          {Object.entries(CATALOG).map(([cat, group]) => {
            const types = Object.entries(group.types).filter(([, t]) => !q || t.name.toLowerCase().includes(q.toLowerCase()))
            if (!types.length) return null
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 2px 9px' }}>
                  <EBIcon name={group.icon} size={15} color={C.inkSoft} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.inkSoft }}>{group.label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  {types.map(([id, t]) => {
                    const sel = current === id
                    return (
                      <button key={id} onClick={() => { onPick(id); onClose() }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 11px', borderRadius: 13, border: `1px solid ${sel ? C.blue : C.border}`, background: sel ? C.blueSoft : C.card, textAlign: 'left', cursor: 'pointer' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: sel ? C.card : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MiniDiagram typeId={id} size={32} color={sel ? C.blue : C.inkMid} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sel ? C.blueDeep : C.ink, lineHeight: 1.2 }}>{t.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
