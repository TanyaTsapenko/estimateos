'use client'
import { useState } from 'react'
import { C, F, SECTIONS, getType, type Opening, type Palettes } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { MiniDiagram } from './diagram'
import { FieldLabel, SelectBox, FieldGrid, type PickerState } from './primitives'
import { SectionTitle } from './builder-header'

// Groups the type's fields into sections
function groupSections(op: Opening) {
  const t = getType(op.typeId)
  return SECTIONS
    .map(s => ({ ...s, keys: t.fields.filter(k => F[k] && F[k].sec === s.id) }))
    .filter(s => s.keys.length > 0)
}

// Type + Subtype header, always visible
function EssentialsHead({ op, openType, onSub }: {
  op: Opening
  openType: () => void
  onSub: (subs: string[]) => void
}) {
  const t = getType(op.typeId)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <FieldLabel>Product type</FieldLabel>
        <button onClick={openType} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 13, border: `1px solid ${C.blueLine}`, background: C.blueSoft, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MiniDiagram typeId={op.typeId} size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{t.name}</div>
            <div style={{ fontSize: 11.5, color: C.blueDeep, fontWeight: 600 }}>{t.cat === 'window' ? 'Window' : 'Door'} · tap to change</div>
          </div>
          <EBIcon name="chev-r" size={18} color={C.blue} />
        </button>
      </div>
      <div>
        <FieldLabel>Subtype</FieldLabel>
        <SelectBox value={op.sub} onClick={() => onSub(t.subs)} />
      </div>
    </div>
  )
}

type Props = {
  op: Opening
  onVal: (k: string, v: string | number | boolean) => void
  onSub: (subs: string[]) => void
  openType: () => void
  openPicker: (k: string, def: { label: string; opts: string[] }, value: string | undefined, onPick: (v: string) => void) => void
  setPicker: (p: PickerState) => void
  palettes?: Palettes
}

export function OpeningEditor({ op, onVal, onSub, openType, openPicker, setPicker, palettes }: Props) {
  const groups = groupSections(op)
  const basics = groups.find(g => g.id === 'basics')
  const rest = groups.filter(g => g.id !== 'basics')

  const [openSecs, setOpenSecs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (rest[0]) init[rest[0].id] = true
    return init
  })
  const toggle = (id: string) => setOpenSecs(o => ({ ...o, [id]: !o[id] }))

  const openSubPicker = (subs: string[]) => {
    setPicker({
      def: { label: 'Subtype', opts: subs },
      value: op.sub,
      onPick: (s) => onSub([s]),
    })
  }

  return (
    <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <EssentialsHead op={op} openType={openType} onSub={openSubPicker} />
      <div style={{ height: 1, background: C.border, margin: '16px 0 6px' }} />

      {basics && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px 12px' }}>
            <EBIcon name={basics.icon} size={15} color={C.inkMid} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.inkSoft }}>{basics.label}</span>
          </div>
          <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
        </>
      )}

      <div style={{ marginTop: 8 }}>
        {rest.map(g => (
          <div key={g.id} style={{ borderTop: `1px solid ${C.border}` }}>
            <SectionTitle icon={g.icon} label={g.label} open={!!openSecs[g.id]} onToggle={() => toggle(g.id)} />
            {openSecs[g.id] && (
              <div style={{ padding: '2px 0 18px' }}>
                <FieldGrid keys={g.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
