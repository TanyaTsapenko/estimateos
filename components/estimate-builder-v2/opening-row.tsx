'use client'
import { C, F, getType, type Opening } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { MiniDiagram } from './diagram'

function sizeStr(op: Opening): string | null {
  const v = op.vals
  const w = v.width || v.owidth
  const h = v.height || v.oheight
  if (w && h) return `${w}" × ${h}"`
  return null
}

// Fields shown inline in the card header/subtitle — no need to repeat as chips
const CHIP_SKIP = new Set(['width','height','owidth','oheight','qty','room','floor','customShapeDesc','photos','notes'])
// Default colour value — not worth showing as a chip
const DEFAULT_COLOURS = new Set(['White','white'])

function summaryChips(op: Opening): string[] {
  const t = getType(op.typeId)
  const v = op.vals
  const chips: string[] = []

  // Include base fields + subtype-conditional extras + value-conditional extras
  const extraKeys = t.extraFieldsBySubtype?.[op.sub] ?? []
  const valueExtraKeys = t.extraFieldsByValue
    ? Object.entries(t.extraFieldsByValue)
        .filter(([condKey, cond]) => {
          const condVal = v[condKey]
          if (cond.notEmpty) return !!condVal
          return condVal === cond.value
        })
        .map(([, cond]) => cond.field)
    : []
  const allKeys = [...t.fields, ...extraKeys, ...valueExtraKeys].filter((k, i, arr) => arr.indexOf(k) === i)

  for (const key of allKeys) {
    if (CHIP_SKIP.has(key)) continue
    const def = F[key]
    if (!def) continue

    switch (def.kind) {
      case 'toggle': {
        if (v[key] === true) chips.push(def.label)
        break
      }
      case 'select': {
        const val = v[key] as string | undefined
        if (val && val !== 'None' && val !== '') chips.push(val)
        break
      }
      case 'color': {
        const val = v[key] as string | undefined
        if (!val || DEFAULT_COLOURS.has(val)) break
        if (key === 'extColour' || key === 'doorExt') { chips.push(`Ext: ${val}`); break }
        if (key === 'intColour' || key === 'doorInt') {
          const extVal = (v.extColour || v.doorExt) as string | undefined
          if (val !== extVal) chips.push(`Int: ${val}`)
          break
        }
        chips.push(val)
        break
      }
      // dim / qty / text / photos / notes — skip
    }
  }

  return chips
}

type Props = {
  index: number
  op: Opening
  price: string
  onEdit: () => void
  onDup: () => void
  onDel: () => void
}

export function OpeningRow({ index, op, price, onEdit, onDup, onDel }: Props) {
  const t = getType(op.typeId)
  const sz = sizeStr(op)
  const chips = summaryChips(op)
  return (
    <div style={{ background: C.card, borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.05)', overflow: 'hidden' }}>
      <button onClick={onEdit} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{index}</div>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: C.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          <MiniDiagram typeId={op.typeId} size={36} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.name}
            {(op.vals.qty as number || 1) > 1 && <span style={{ color: C.inkSoft, fontWeight: 600 }}> × {op.vals.qty}</span>}
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {op.sub || ''}{op.sub && sz ? ` · ${sz}` : sz || ''}{op.vals.room ? ` · ${op.vals.room}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{price}</div>
          <EBIcon name="chev-r" size={16} color={C.inkSoft} />
        </div>
      </button>
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 10px 70px' }}>
          {chips.map((c, i) => (
            <span key={i} style={{ height: 21, padding: '0 8px', borderRadius: 6, background: '#EEF3FF', color: '#1D4ED8', fontSize: 10.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>{c}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
        <button onClick={onDup} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 0', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: C.inkMid, cursor: 'pointer', borderRight: `1px solid ${C.border}` }}>
          <EBIcon name="dup" size={14} color={C.inkMid} />Duplicate
        </button>
        <button onClick={onDel} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 0', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: C.red, cursor: 'pointer' }}>
          <EBIcon name="trash" size={14} color={C.red} />Remove
        </button>
      </div>
    </div>
  )
}
