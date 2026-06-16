'use client'
import { C, getType, type Opening } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { MiniDiagram } from './diagram'

function sizeStr(op: Opening): string | null {
  const v = op.vals
  const w = v.width || v.owidth
  const h = v.height || v.oheight
  if (w && h) return `${w}" × ${h}"`
  return null
}

function summaryChips(op: Opening): string[] {
  const v = op.vals
  const out: string[] = []
  const push = (val: string | null | undefined) => { if (val && val !== 'None') out.push(val) }
  push((v.material || v.doorMaterial) as string)
  push(v.glassType ? `${v.glassType}${v.pane === 'Triple' ? ' · triple' : ''}` : null)
  push(v.doorStyle && v.doorStyle !== 'Flush' ? v.doorStyle as string : null)
  if (v.lowE) out.push('Low-E')
  if (v.argon) out.push('Argon')
  if (v.tempered) out.push('Tempered')
  push(v.screen && v.screen !== 'None' ? `${v.screen} screen` : null)
  if (v.extColour && v.extColour !== 'White') push(v.extColour as string)
  return out.slice(0, 4)
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
        <div style={{ width: 42, height: 42, borderRadius: 10, background: C.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MiniDiagram typeId={op.typeId} size={36} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {op.sub}
            {(op.vals.qty as number || 1) > 1 && <span style={{ color: C.inkSoft, fontWeight: 600 }}> × {op.vals.qty}</span>}
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.name}{sz ? ` · ${sz}` : ''}{op.vals.room ? ` · ${op.vals.room}` : ''}
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
            <span key={i} style={{ height: 21, padding: '0 8px', borderRadius: 6, background: C.bg, color: C.inkMid, fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>{c}</span>
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
