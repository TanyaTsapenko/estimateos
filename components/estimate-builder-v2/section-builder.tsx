'use client'
import { useState } from 'react'
import { C } from '@/lib/v2/openingTypes'
import { GLASS, FRAME, SEC, DIM, MOV } from '@/components/WindowDiagram'
import type { CombinationSection, CombinationSectionType } from '@/lib/v2/openingTypes'

const SECTION_TYPES: CombinationSectionType[] = [
  'Picture', 'Fixed', 'Casement', 'Awning', 'Slider', 'Single Hung',
]

// ── Presets ────────────────────────────────────────────────────────
type Preset = { label: string; types: CombinationSectionType[] | null }
const PRESETS: Preset[] = [
  { label: 'Picture + Casement',            types: ['Picture', 'Casement'] },
  { label: 'Casement + Picture + Casement', types: ['Casement', 'Picture', 'Casement'] },
  { label: 'Picture + Awning',              types: ['Picture', 'Awning'] },
  { label: 'Awning + Picture + Awning',     types: ['Awning', 'Picture', 'Awning'] },
  { label: 'Single Hung + Picture',         types: ['Single Hung', 'Picture'] },
  { label: 'Slider + Picture',              types: ['Slider', 'Picture'] },
  { label: 'Start from scratch (Custom)',   types: null },
]

const UNIT_OPTS = ['2', '3', '4', '5', 'Custom']

// ── SVG layout ─────────────────────────────────────────────────────
const SVG_W = 430, SVG_H = 200
const FX = 10, FY = 10, FW = 370, FH = 120
const FR = FX + FW, FB = FY + FH
const MID_Y = FY + FH / 2
const SI = 6
const sT = FY + SI, sB = FB - SI
const DIM_Y = FB + 14, TICK = 5
const LBL_Y = DIM_Y + 16, TYPE_Y = LBL_Y + 14
const DIM_R = FR + 10

type SegInfo = { segX: number; segW: number; sL: number; sR: number; sCX: number; sec: CombinationSection }

function buildSegs(sections: CombinationSection[]): SegInfo[] {
  const total = sections.reduce((s, sec) => s + sec.width, 0) || 1
  let cumPx = 0
  return sections.map(sec => {
    const segW = (sec.width / total) * FW
    const segX = FX + cumPx
    cumPx += segW
    return { segX, segW, sL: segX + SI, sR: segX + segW - SI, sCX: segX + segW / 2, sec }
  })
}

function SegContent({ info }: { info: SegInfo }) {
  const { sL, sR, sCX, segX, segW, sec } = info

  if (sec.type === 'Picture' || sec.type === 'Fixed') {
    return (
      <>
        <line x1={sL} y1={sT} x2={sR} y2={sB} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1={sR} y1={sT} x2={sL} y2={sB} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
      </>
    )
  }
  if (sec.type === 'Casement') {
    return (
      <>
        <line x1={sL} y1={sT} x2={sL} y2={sB} stroke={SEC} strokeWidth="1.5"/>
        <path d={`M${sL},${sB} Q${sR},${sB} ${sR},${sT}`} stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <line x1={sL} y1={sT} x2={sR} y2={sT} stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <line x1={sL} y1={sB} x2={sR} y2={sT} stroke={MOV} strokeWidth="1.5"/>
        <rect x={sR - 5} y={MID_Y - 4} width={4} height={8} rx="1.5" fill={SEC}/>
      </>
    )
  }
  if (sec.type === 'Awning') {
    return (
      <>
        <line x1={sL} y1={sT} x2={sR} y2={sT} stroke={SEC} strokeWidth="1.5"/>
        <path d={`M${sL},${sT} Q${sL},${sB} ${sCX},${sB} Q${sR},${sB} ${sR},${sT}`} stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <line x1={sL} y1={sT} x2={sCX} y2={sB} stroke={MOV} strokeWidth="1.5"/>
        <line x1={sR} y1={sT} x2={sCX} y2={sB} stroke={MOV} strokeWidth="1.5"/>
        <rect x={sCX - 5} y={sB - 4} width={10} height={4} rx="1.5" fill={SEC}/>
      </>
    )
  }
  if (sec.type === 'Slider') {
    const arrTip = segX + segW * 0.62, arrLine = segX + segW * 0.26
    return (
      <>
        <rect x={sL} y={sT} width={Math.max(1, sR - sL)} height={Math.max(1, sB - sT)} fill="none" stroke={MOV} strokeWidth="1.5"/>
        <path d={`M${arrTip},${MID_Y} L${arrTip-7},${MID_Y-5} L${arrTip-5},${MID_Y} L${arrTip-7},${MID_Y+5}Z`} fill={MOV}/>
        <line x1={arrLine} y1={MID_Y} x2={arrTip - 5} y2={MID_Y} stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <rect x={sR - 5} y={MID_Y - 6} width={4} height={12} rx="2" fill={SEC}/>
      </>
    )
  }
  if (sec.type === 'Single Hung') {
    const midSectY = (sT + sB) / 2
    const arrTip  = midSectY + (sB - midSectY) * 0.22
    const arrLine = midSectY + (sB - midSectY) * 0.72
    return (
      <>
        {/* fixed top: dashed X */}
        <line x1={sL} y1={sT} x2={sR} y2={midSectY} stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1={sR} y1={sT} x2={sL} y2={midSectY} stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {/* separator */}
        <line x1={sL} y1={midSectY} x2={sR} y2={midSectY} stroke={FRAME} strokeWidth="1.5"/>
        {/* moving bottom: MOV border */}
        <rect x={sL} y={midSectY} width={Math.max(1, sR - sL)} height={Math.max(1, sB - midSectY)} fill="none" stroke={MOV} strokeWidth="1.5"/>
        {/* upward arrow */}
        <path d={`M${sCX},${arrTip} L${sCX-5},${arrTip+8} L${sCX},${arrTip+6} L${sCX+5},${arrTip+8}Z`} fill={MOV}/>
        <line x1={sCX} y1={arrTip+6} x2={sCX} y2={arrLine} stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
      </>
    )
  }
  return null
}

// ── CombinationDrawing ─────────────────────────────────────────────
export function CombinationDrawing({ sections, heightIn }: { sections: CombinationSection[]; heightIn?: number }) {
  if (!sections.length) return null
  const segs = buildSegs(sections)
  const hLabel = heightIn ? `${heightIn}"` : 'H'
  const boundaries = [FX, ...segs.slice(1).map(s => s.segX), FR]

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden>
      <rect x={FX} y={FY} width={FW} height={FH} rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
      {segs.slice(0, -1).map((seg, i) => (
        <line key={i} x1={seg.segX + seg.segW} y1={FY} x2={seg.segX + seg.segW} y2={FB} stroke={FRAME} strokeWidth="1.5"/>
      ))}
      {segs.map((seg, i) => <SegContent key={i} info={seg} />)}
      <line x1={FX} y1={DIM_Y} x2={FR} y2={DIM_Y} stroke={SEC} strokeWidth="1"/>
      {boundaries.map((bx, i) => (
        <line key={i} x1={bx} y1={DIM_Y - TICK} x2={bx} y2={DIM_Y + TICK} stroke={SEC} strokeWidth="1.5"/>
      ))}
      {segs.map((seg, i) => (
        <g key={i}>
          <text x={seg.sCX} y={LBL_Y} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill={DIM}>
            {seg.sec.width}&quot;
          </text>
          <text x={seg.sCX} y={TYPE_Y} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="9" fill={SEC}>
            {seg.sec.type}
          </text>
        </g>
      ))}
      <line x1={DIM_R} y1={FY} x2={DIM_R} y2={FB} stroke={SEC} strokeWidth="1"/>
      <line x1={DIM_R - 4} y1={FY} x2={DIM_R + 4} y2={FY} stroke={SEC} strokeWidth="1.5"/>
      <line x1={DIM_R - 4} y1={FB} x2={DIM_R + 4} y2={FB} stroke={SEC} strokeWidth="1.5"/>
      <text x={DIM_R + 6} y={MID_Y + 4} textAnchor="start" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill={DIM}>
        {hLabel}
      </text>
    </svg>
  )
}

// ── SectionBuilder ─────────────────────────────────────────────────
interface SectionBuilderProps {
  sections: CombinationSection[]
  heightIn?: number
  onChange: (sections: CombinationSection[]) => void
}

export function SectionBuilder({ sections, heightIn, onChange }: SectionBuilderProps) {
  const totalSum = sections.reduce((s, sec) => s + sec.width, 0)

  // Width mode: 'equal' = one total width input, computed per-section; 'custom' = individual inputs
  const [widthMode, setWidthMode] = useState<'equal' | 'custom'>(() => {
    if (sections.length <= 1) return 'equal'
    const w0 = sections[0]?.width ?? 0
    return sections.every(s => s.width === w0) ? 'equal' : 'custom'
  })

  // Total width for equal mode (string for controlled input)
  const [equalTotal, setEqualTotal] = useState<string>(() => String(totalSum || 72))

  const eqW = (total: number, n: number) => Math.max(1, Math.round(total / n))
  const parsedTotal = parseFloat(equalTotal) || 72
  const displayW = eqW(parsedTotal, sections.length)

  // ── Presets ──────────────────────────────────────────────────────
  const handlePreset = (preset: Preset) => {
    const total = parsedTotal
    if (!preset.types) {
      // "Start from scratch" → single Picture section
      onChange([{ type: 'Picture', width: total }])
      setEqualTotal(String(total))
      setWidthMode('equal')
      return
    }
    const types = preset.types
    const w = eqW(total, types.length)
    onChange(types.map(type => ({ type, width: w })))
    setEqualTotal(String(total))
    setWidthMode('equal')
  }

  // ── Unit count ───────────────────────────────────────────────────
  const unitCountVal = sections.length >= 2 && sections.length <= 5 ? String(sections.length) : 'Custom'

  const handleUnitCount = (val: string) => {
    if (val === 'Custom') return
    const n = parseInt(val)
    if (n === sections.length) return
    if (widthMode === 'equal') {
      const w = eqW(parsedTotal, n)
      onChange(Array.from({ length: n }, (_, i) => ({ type: sections[i]?.type ?? 'Picture', width: w })))
    } else {
      const avgW = Math.max(1, Math.round(totalSum / sections.length) || 24)
      if (n > sections.length) {
        onChange([...sections, ...Array.from({ length: n - sections.length }, () => ({ type: 'Picture' as CombinationSectionType, width: avgW }))])
      } else {
        onChange(sections.slice(0, n))
      }
    }
  }

  // ── Width mode toggle ────────────────────────────────────────────
  const switchMode = (newMode: 'equal' | 'custom') => {
    if (newMode === widthMode) return
    if (newMode === 'equal') {
      const total = totalSum || 72
      setEqualTotal(String(total))
      onChange(sections.map(s => ({ ...s, width: eqW(total, sections.length) })))
    }
    // custom → equal: sections already have materialized widths from equal mode, no re-emit needed
    setWidthMode(newMode)
  }

  // ── Equal total width change ──────────────────────────────────────
  const handleEqualTotal = (raw: string) => {
    setEqualTotal(raw)
    const total = parseFloat(raw)
    if (!total || total <= 0) return
    onChange(sections.map(s => ({ ...s, width: eqW(total, sections.length) })))
  }

  // ── Per-section edit ─────────────────────────────────────────────
  const updateType = (i: number, type: CombinationSectionType) =>
    onChange(sections.map((sec, j) => j === i ? { ...sec, type } : sec))

  const updateWidth = (i: number, raw: string) => {
    const w = Math.max(1, parseFloat(raw) || 1)
    onChange(sections.map((sec, j) => j === i ? { ...sec, width: w } : sec))
  }

  const remove = (i: number) => {
    if (sections.length <= 1) return
    const next = sections.filter((_, j) => j !== i)
    if (widthMode === 'equal') {
      onChange(next.map(s => ({ ...s, width: eqW(parsedTotal, next.length) })))
    } else {
      onChange(next)
    }
  }

  const add = () => {
    if (widthMode === 'equal') {
      const n = sections.length + 1
      const w = eqW(parsedTotal, n)
      onChange([...sections, { type: 'Picture' as CombinationSectionType, width: w }].map(s => ({ ...s, width: w })))
    } else {
      const avgW = Math.max(1, Math.round(totalSum / sections.length) || 24)
      onChange([...sections, { type: 'Picture', width: avgW }])
    }
  }

  // ── Styles ───────────────────────────────────────────────────────
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    height: 34, padding: '0 12px', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
    background: active ? C.blue : 'transparent',
    color: active ? '#fff' : C.inkMid,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* drawing */}
      <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: '12px 10px 8px' }}>
        <CombinationDrawing sections={sections} heightIn={heightIn} />
      </div>

      {/* presets card */}
      <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
        <div style={{ padding: '11px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>Presets</div>
            <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 1 }}>Tap to fill in sections, then customize</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePreset(preset)}
              style={{
                width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent',
                border: 'none', borderBottom: i < PRESETS.length - 1 ? `1px solid ${C.border}` : 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                color: preset.types === null ? C.inkSoft : C.ink,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* controls row: unit count + width mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, whiteSpace: 'nowrap' }}>Units</span>
        <select
          value={unitCountVal}
          onChange={e => handleUnitCount(e.target.value)}
          style={{ flex: 1, height: 34, padding: '0 8px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: 'inherit', outline: 'none' }}
        >
          {UNIT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div style={{ display: 'flex', borderRadius: 9, border: `1px solid ${C.borderStrong}`, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => switchMode('equal')} style={toggleBtn(widthMode === 'equal')}>Equal</button>
          <button onClick={() => switchMode('custom')} style={toggleBtn(widthMode === 'custom')}>Custom</button>
        </div>
      </div>

      {/* equal mode: total width input */}
      {widthMode === 'equal' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 500, whiteSpace: 'nowrap' }}>Total width</span>
          <div style={{ position: 'relative', width: 84 }}>
            <input
              type="number" min="1" step="1" value={equalTotal}
              onChange={e => handleEqualTotal(e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 18px 0 8px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.inkSoft, pointerEvents: 'none' }}>&quot;</span>
          </div>
          <span style={{ fontSize: 12, color: C.inkSoft }}>→ {displayW}&quot; each</span>
        </div>
      )}

      {/* custom mode: overall width summary */}
      {widthMode === 'custom' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: C.inkSoft }}>
            Overall: <strong style={{ color: C.ink }}>{totalSum}&quot;</strong> (auto)
          </span>
        </div>
      )}

      {/* section list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sections.map((sec, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* numbered badge */}
            <div style={{ width: 22, height: 22, borderRadius: 99, background: C.blueSoft, border: `1px solid ${C.blueLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.blue }}>
              {i + 1}
            </div>

            {/* type select */}
            <select
              value={sec.type}
              onChange={e => updateType(i, e.target.value as CombinationSectionType)}
              style={{ flex: 1, height: 38, padding: '0 8px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            >
              {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* width: editable in custom mode, read-only in equal mode */}
            {widthMode === 'custom' ? (
              <div style={{ position: 'relative', width: 72, flexShrink: 0 }}>
                <input
                  type="number" min="1" step="0.5" value={sec.width}
                  onChange={e => updateWidth(i, e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 20px 0 8px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.inkSoft, pointerEvents: 'none' }}>&quot;</span>
              </div>
            ) : (
              <div style={{ width: 72, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 10, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.inkMid }}>{displayW}</span>
                <span style={{ fontSize: 11, color: C.inkFaint }}>&quot;</span>
              </div>
            )}

            {/* delete */}
            <button
              onClick={() => remove(i)}
              disabled={sections.length <= 1}
              aria-label="Remove section"
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: sections.length <= 1 ? C.bg : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sections.length <= 1 ? 'not-allowed' : 'pointer', flexShrink: 0 }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke={sections.length <= 1 ? C.inkFaint : C.red}
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        ))}

        <button
          onClick={add}
          style={{ width: '100%', height: 38, borderRadius: 9, border: `1.5px dashed ${C.blueLine}`, background: C.card, color: C.blue, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 2 }}
        >
          + Add section
        </button>
      </div>
    </div>
  )
}
