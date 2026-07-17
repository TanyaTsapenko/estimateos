'use client'
import { useState } from 'react'
import { C, type PaletteEntry, type Opening } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { FieldLabel, Toggle, Swatches } from './primitives'

export type TrimState = {
  casing: string
  casingSize: string
  casingCustomName: string
  jamb: string
  jambExtensionDepth: string
  jambExtensionDepthCustom: string
  jambCustomName: string
  brickmold: boolean
  brickmoldColourName: string | null
  rosettes: string
  caping: boolean
  nailFin: boolean
  dripCap: boolean
  blueSkin: boolean
}

export const TRIM_DEFAULTS: TrimState = {
  casing: 'none', casingSize: '2_3_8', casingCustomName: '',
  jamb: 'none', jambExtensionDepth: '4-9/16"', jambExtensionDepthCustom: '', jambCustomName: '',
  brickmold: false, brickmoldColourName: null,
  rosettes: 'none', caping: false, nailFin: false, dripCap: false, blueSkin: false,
}

type Props = {
  value: TrimState
  onChange: (v: TrimState) => void
  palette: PaletteEntry[]
  openings?: Opening[]
  surcharges?: Record<string, number>
  showErrors?: boolean
}

const selWrap: React.CSSProperties = { position: 'relative' }
const selEl: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 36px 0 13px',
  borderRadius: 12, border: `1px solid ${C.borderStrong}`,
  background: C.card, fontSize: 13, fontWeight: 600, color: C.ink,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' as never,
}
const selChev: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
}

function Sel({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={selWrap}>
      <select value={value} onChange={e => onChange(e.target.value)} style={selEl}>{children}</select>
      <span style={selChev}><EBIcon name="chev-d" size={15} color={C.inkSoft} /></span>
    </div>
  )
}

const inputEl: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 13px',
  borderRadius: 12, border: `1px solid ${C.borderStrong}`,
  background: C.card, fontSize: 13, fontWeight: 600, color: C.ink,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

export function TrimSection({ value, onChange, palette, openings, surcharges, showErrors }: Props) {
  const [open, setOpen] = useState(false)
  const [depthTouched, setDepthTouched] = useState(false)
  const set = <K extends keyof TrimState>(k: K, v: TrimState[K]) => onChange({ ...value, [k]: v })

  const casingCustomWarn = value.casing === 'custom' && (surcharges?.casing_custom ?? 0) === 0
  const jambCustomWarn   = value.jamb   === 'custom' && (surcharges?.jamb_custom   ?? 0) === 0
  const depthError = (depthTouched || showErrors) &&
    value.jambExtensionDepth === 'Custom' && !value.jambExtensionDepthCustom.trim()

  // Nail Fin only applies to full-frame / stud-to-stud installations
  const showNailFin = !openings || openings.length === 0
    ? false
    : openings.some(o => o.vals.install && o.vals.install !== 'Retrofit')

  const hasAny = value.casing !== 'none' || value.jamb !== 'none' || value.brickmold ||
    value.rosettes !== 'none' || value.caping || value.nailFin || value.dripCap || value.blueSkin

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>

      {/* ── Collapsible header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 9, background: open ? C.blueSoft : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <EBIcon name="tool" size={16} color={open ? C.blue : C.inkMid} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, letterSpacing: '0.01em' }}>Trim &amp; Finishing</span>
          <div style={{ fontSize: 11, color: hasAny ? C.blue : C.inkFaint, marginTop: 1 }}>
            {open ? 'Applied to all openings' : hasAny ? 'Configured · tap to edit' : 'Not configured · tap to set up'}
          </div>
        </div>
        <EBIcon name={open ? 'chev-u' : 'chev-d'} size={17} color={C.inkSoft} />
      </button>

      {/* ── Body ── */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 14px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Casing */}
          <div>
            <FieldLabel>Casing</FieldLabel>
            <Sel value={value.casing} onChange={v => set('casing', v)}>
              <option value="none">None</option>
              <option value="oak">Oak</option>
              <option value="vinyl">Vinyl</option>
              <option value="mdf">MDF</option>
              <option value="custom">Custom</option>
            </Sel>
            {casingCustomWarn && (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#B45309' }}>Custom price not set in price list</div>
            )}
            {value.casing === 'custom' && (
              <div style={{ marginTop: 8 }}>
                <FieldLabel optional>Material name</FieldLabel>
                <input
                  style={inputEl}
                  value={value.casingCustomName}
                  placeholder="e.g. PVC trim, Exotic wood"
                  maxLength={40}
                  onChange={e => set('casingCustomName', e.target.value)}
                />
              </div>
            )}
            {value.casing !== 'none' && (
              <div style={{ marginTop: 10 }}>
                <FieldLabel>Casing size</FieldLabel>
                <Sel value={value.casingSize} onChange={v => set('casingSize', v)}>
                  <option value="2_3_8">2-3/8&quot;</option>
                  <option value="3_3_8">3-3/8&quot;</option>
                </Sel>
              </div>
            )}
          </div>

          {/* Jamb */}
          <div>
            <FieldLabel>Jamb extension</FieldLabel>
            <Sel value={value.jamb} onChange={v => set('jamb', v)}>
              <option value="none">None</option>
              <option value="oak">Oak</option>
              <option value="wood">Wood</option>
              <option value="vinyl">Vinyl</option>
              <option value="plywood">Plywood</option>
              <option value="custom">Custom</option>
            </Sel>
            {jambCustomWarn && (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: '#B45309' }}>Custom price not set in price list</div>
            )}
            {value.jamb === 'custom' && (
              <div style={{ marginTop: 8 }}>
                <FieldLabel optional>Material name</FieldLabel>
                <input
                  style={inputEl}
                  value={value.jambCustomName}
                  placeholder="e.g. PVC profile, Client material"
                  maxLength={40}
                  onChange={e => set('jambCustomName', e.target.value)}
                />
              </div>
            )}
            {value.jamb !== 'none' && (
              <div style={{ marginTop: 10 }}>
                <FieldLabel>Depth</FieldLabel>
                <Sel value={value.jambExtensionDepth} onChange={v => set('jambExtensionDepth', v)}>
                  <option value='4-9/16"'>4-9/16&quot;</option>
                  <option value='6-9/16"'>6-9/16&quot;</option>
                  <option value="Custom">Custom</option>
                </Sel>
                {value.jambExtensionDepth === 'Custom' && (
                  <div style={{ marginTop: 8 }}>
                    <FieldLabel>Specify depth</FieldLabel>
                    <input
                      style={{ ...inputEl, borderColor: depthError ? C.red : undefined }}
                      value={value.jambExtensionDepthCustom}
                      placeholder='e.g. 5-1/4"'
                      maxLength={20}
                      onChange={e => set('jambExtensionDepthCustom', e.target.value)}
                      onBlur={() => setDepthTouched(true)}
                    />
                    {depthError && (
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: C.red }}>Please enter a custom depth</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Brickmold */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle on={value.brickmold} onChange={v => set('brickmold', v)} label="Brickmold" sub="Applied around exterior of frame" />
            {value.brickmold && palette.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <FieldLabel optional>Brickmold colour</FieldLabel>
                  {value.brickmoldColourName && (
                    <button
                      onClick={() => set('brickmoldColourName', null)}
                      style={{ fontSize: 10, fontWeight: 700, color: C.inkMid, background: 'transparent', border: `1px solid ${C.borderStrong}`, borderRadius: 7, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Swatches palette="frame" entries={palette} value={value.brickmoldColourName || undefined} onChange={name => set('brickmoldColourName', name)} />
              </div>
            )}
          </div>

          {/* Rosettes */}
          <div>
            <FieldLabel>Rosettes</FieldLabel>
            <Sel value={value.rosettes} onChange={v => set('rosettes', v)}>
              <option value="none">None</option>
              <option value="round">Round</option>
              <option value="45">45°</option>
              <option value="flat">Flat</option>
            </Sel>
          </div>

          {/* Extras */}
          <div>
            <FieldLabel>Extras</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { label: 'Caping',    key: 'caping'   },
                showNailFin ? { label: 'Nail fin', key: 'nailFin' } : null,
                { label: 'Drip cap',  key: 'dripCap'  },
                { label: 'Self-Adhesive Flashing Membrane', key: 'blueSkin' },
              ] as ({ label: string; key: 'caping' | 'nailFin' | 'dripCap' | 'blueSkin' } | null)[])
                .filter(Boolean)
                .map(item => {
                  const { label, key } = item!
                  return <Toggle key={key} on={value[key]} onChange={v => set(key, v)} label={label} />
                })}
            </div>
            {!showNailFin && (
              <div style={{ marginTop: 6, fontSize: 11, color: C.inkFaint }}>
                Nail fin not applicable for retrofit installations
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
