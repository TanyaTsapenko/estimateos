'use client'
import { C, F, FRAME_COLOURS, type Opening, type PaletteEntry, type Palettes } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'

// ── Label ─────────────────────────────────────────────────────────
export function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkSoft }}>{children}</span>
      {optional && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.inkFaint }}>Optional</span>}
    </div>
  )
}

// ── SelectBox ─────────────────────────────────────────────────────
export function SelectBox({ value, placeholder, onClick }: { value?: string | null; placeholder?: string; onClick: () => void }) {
  const empty = value == null || value === ''
  return (
    <button onClick={onClick} style={{ width: '100%', height: 46, padding: '0 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left' }}>
      <span style={{ fontSize: 13, fontWeight: empty ? 500 : 600, color: empty ? C.inkFaint : C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empty ? (placeholder || 'Select…') : value}</span>
      <EBIcon name="chev-d" size={16} color={C.inkSoft} />
    </button>
  )
}

// ── DimInput ──────────────────────────────────────────────────────
export function DimInput({ value, unit, ph, onChange }: { value?: string | number; unit?: string; ph?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <input value={value || ''} placeholder={ph} inputMode="decimal" onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 46, padding: '0 34px 0 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums', outline: 'none', boxSizing: 'border-box' }} />
      <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: C.inkFaint }}>{unit}</span>
    </div>
  )
}

// ── Stepper ───────────────────────────────────────────────────────
export function Stepper({ value = 1, onChange }: { value?: number; onChange: (v: number) => void }) {
  const btn: React.CSSProperties = { width: 44, height: 44, borderRadius: 11, border: `1px solid ${C.borderStrong}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(Math.max(1, (value || 1) - 1))} style={btn}><EBIcon name="minus" size={17} color={C.inkMid} /></button>
      <div style={{ minWidth: 40, textAlign: 'center', fontSize: 19, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{value || 1}</div>
      <button onClick={() => onChange((value || 1) + 1)} style={{ ...btn, borderColor: C.blue, background: C.blueSoft, cursor: 'pointer' }}><EBIcon name="plus" size={17} color={C.blue} /></button>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────
export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12, border: `1px solid ${on ? C.blueLine : C.border}`, background: on ? C.blueSoft : C.card, textAlign: 'left', cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ width: 44, height: 26, borderRadius: 99, background: on ? C.blue : '#D7DCE5', position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .15s' }} />
      </div>
    </button>
  )
}

// ── Swatches ──────────────────────────────────────────────────────
function fieldPalette(_palette: string): PaletteEntry[] {
  return FRAME_COLOURS
}

export function Swatches({ palette, entries, value, onChange }: { palette: string; entries?: PaletteEntry[]; value?: string; onChange: (v: string) => void }) {
  const list = entries ?? fieldPalette(palette)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
      {list.map(c => {
        const sel = value === c.id
        const lightSwatch = c.hex === '#FFFFFF' || c.hex === '#D7DBDF' || c.hex === '#ECE3CE' || c.hex === '#B8BCC0'
        return (
          <button key={c.id} onClick={() => onChange(c.id)} title={c.id}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: c.hex, boxShadow: sel ? `0 0 0 2px ${C.blue}, 0 0 0 4px ${C.card}` : c.ring ? `inset 0 0 0 1px ${C.borderStrong}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sel && <EBIcon name="check" size={16} color={lightSwatch ? C.blue : '#fff'} />}
            </span>
            <span style={{ fontSize: 9.5, fontWeight: sel ? 700 : 500, color: sel ? C.ink : C.inkSoft, textAlign: 'center', lineHeight: 1.15 }}>{c.id}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Photos stub ───────────────────────────────────────────────────
export function PhotosField({ count = 0, onAdd }: { count?: number; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
      <button onClick={onAdd} style={{ width: 70, height: 70, borderRadius: 12, border: `1.5px dashed ${C.borderStrong}`, background: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: C.inkSoft, cursor: 'pointer' }}>
        <EBIcon name="camera" size={20} color={C.inkSoft} />
        <span style={{ fontSize: 10, fontWeight: 700 }}>Add</span>
      </button>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: 70, height: 70, borderRadius: 12, background: `repeating-linear-gradient(135deg, ${C.blueSoft} 0 7px, #E4ECFF 7px 14px)`, border: `1px solid ${C.border}` }} />
      ))}
    </div>
  )
}

// ── Notes ─────────────────────────────────────────────────────────
export function NotesField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Anything the installer should know…" rows={3}
      style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 14, fontWeight: 500, color: C.ink, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
  )
}

// ── Picker types ──────────────────────────────────────────────────
export type PickerState = {
  def: { label: string; opts: string[] }
  value?: string
  onPick: (v: string) => void
} | null

// ── FieldControl ──────────────────────────────────────────────────
type FCProps = {
  k: string
  op: Opening
  onVal: (k: string, v: string | number | boolean) => void
  openPicker: (k: string, def: { label: string; opts: string[] }, value: string | undefined, onPick: (v: string) => void) => void
  palettes?: Palettes
}

export function FieldControl({ k, op, onVal, openPicker, palettes }: FCProps) {
  const def = F[k]
  if (!def) return null
  const v = op.vals[k]
  switch (def.kind) {
    case 'qty':
      return <div><FieldLabel>{def.label}</FieldLabel><Stepper value={v as number} onChange={x => onVal(k, x)} /></div>
    case 'dim':
      return <div><FieldLabel>{def.label}</FieldLabel><DimInput value={v as string} unit={def.unit} ph={def.ph} onChange={x => onVal(k, x)} /></div>
    case 'text':
      return (
        <div>
          <FieldLabel>{def.label}</FieldLabel>
          <input value={(v as string) || ''} placeholder={def.ph || ''} onChange={e => onVal(k, e.target.value)}
            style={{ width: '100%', height: 46, padding: '0 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
      )
    case 'select': {
      const customKey = `${k}Custom`
      const showCustomInput = (v as string) === 'Custom' && !!F[customKey]
      const pickerOpts = def.optional ? ['', ...(def.opts ?? [])] : (def.opts ?? [])
      return (
        <div>
          <FieldLabel optional={def.optional}>{def.label}</FieldLabel>
          <SelectBox value={v as string} placeholder={def.optional ? 'Not set' : 'Select…'} onClick={() => openPicker(k, { label: def.label, opts: pickerOpts }, v as string | undefined, x => onVal(k, x))} />
          {showCustomInput && <div style={{ marginTop: 8 }}><FieldControl k={customKey} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} /></div>}
        </div>
      )
    }
    case 'color':
      return <div><FieldLabel>{def.label}</FieldLabel><Swatches palette={def.palette!} entries={palettes?.frame} value={v as string} onChange={x => onVal(k, x)} /></div>
    case 'toggle':
      return <Toggle on={!!v} onChange={x => onVal(k, x)} label={def.label} sub={def.sub} />
    case 'photos':
      return null  // rendered by PhotosUpload in opening-editor.tsx
    case 'notes':
      return <div><FieldLabel>{def.label}</FieldLabel><NotesField value={v as string} onChange={x => onVal(k, x)} /></div>
    default:
      return null
  }
}

// ── FieldGrid ─────────────────────────────────────────────────────
type FGProps = {
  keys: string[]
  op: Opening
  onVal: (k: string, v: string | number | boolean) => void
  openPicker: FCProps['openPicker']
  gap?: number
  palettes?: Palettes
}

export function FieldGrid({ keys, op, onVal, openPicker, gap = 16, palettes }: FGProps) {
  const visibleKeys = keys.filter(k => {
    const def = F[k]
    if (!def?.visibleWhen) return true
    return op.vals[def.visibleWhen.field] === def.visibleWhen.value
  })
  const rows: React.ReactNode[] = []
  for (let i = 0; i < visibleKeys.length; i++) {
    const k = visibleKeys[i], def = F[k]
    const nextKey = visibleKeys[i + 1]
    const nextDef = nextKey ? F[nextKey] : undefined
    if (def?.half && nextDef?.half) {
      rows.push(
        <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FieldControl k={k} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
          <FieldControl k={nextKey!} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
        </div>
      )
      i++
    } else {
      rows.push(<FieldControl key={k} k={k} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />)
    }
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{rows}</div>
}

// ── PickerSheet ───────────────────────────────────────────────────
export function PickerSheet({ picker, onClose }: { picker: PickerState; onClose: () => void }) {
  if (!picker) return null
  const { def, value, onPick } = picker
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,0.32)' }} />
      <div style={{ position: 'relative', background: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '8px 0 34px', maxHeight: '64vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: C.borderStrong, margin: '8px auto 6px' }} />
        <div style={{ padding: '6px 20px 12px', fontSize: 15, fontWeight: 800, color: C.ink }}>{def.label}</div>
        <div style={{ overflowY: 'auto', padding: '0 12px' }}>
          {def.opts.map(o => {
            const sel = value === o || (o === '' && (value == null || value === ''))
            const isEmpty = o === ''
            return (
              <button key={isEmpty ? '__unset' : o} onClick={() => { onPick(o); onClose() }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderRadius: 12, border: 'none', background: sel ? C.blueSoft : 'transparent', textAlign: 'left', cursor: 'pointer', marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: sel ? 700 : 500, color: sel ? C.blueDeep : isEmpty ? C.inkFaint : C.ink }}>{isEmpty ? '— Not set —' : o}</span>
                {sel && <EBIcon name="check" size={18} color={C.blue} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
