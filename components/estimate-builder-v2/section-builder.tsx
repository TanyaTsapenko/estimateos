'use client'
import { GLASS, FRAME, SEC, DIM, MOV } from '@/components/WindowDiagram'
import type { CombinationSection, CombinationSectionType } from '@/lib/v2/openingTypes'

const SECTION_TYPES: CombinationSectionType[] = ['Casement', 'Fixed', 'Slider', 'Awning', 'Picture']

// ── SVG layout ─────────────────────────────────────────────────────
const SVG_W = 430
const SVG_H = 200

const FX = 10        // frame left x
const FY = 10        // frame top y
const FW = 370       // frame width  → right edge = 380
const FH = 120       // frame height → bottom edge = 130
const FR = FX + FW   // 380
const FB = FY + FH   // 130
const MID_Y = FY + FH / 2  // 70

const SI = 6         // inset inside each segment
const sT = FY + SI   // shared top inset y   = 16
const sB = FB - SI   // shared bottom inset y = 124

const DIM_Y  = FB + 14       // 144  width dimension line y
const TICK   = 5             // half-tick height
const LBL_Y  = DIM_Y + 16   // 160  segment width label
const TYPE_Y = LBL_Y + 14   // 174  segment type label

const DIM_R  = FR + 10      // 390  height dimension x

// ── Segment geometry ───────────────────────────────────────────────
type SegInfo = {
  segX: number
  segW: number
  sL: number   // left inset x
  sR: number   // right inset x
  sCX: number  // horizontal center x
  sec: CombinationSection
}

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

// ── Per-segment type indicators (scaled from WindowDiagram patterns) ──
function SegContent({ info }: { info: SegInfo }) {
  const { sL, sR, sCX, segX, segW, sec } = info

  if (sec.type === 'Picture' || sec.type === 'Fixed') {
    // dashed cross, identical to window_fix
    return (
      <>
        <line x1={sL} y1={sT} x2={sR} y2={sB} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1={sR} y1={sT} x2={sL} y2={sB} stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
      </>
    )
  }

  if (sec.type === 'Casement') {
    // hinge left — geometry from window_cas, scaled to segment width
    return (
      <>
        {/* hinge line */}
        <line x1={sL} y1={sT} x2={sL} y2={sB} stroke={SEC} strokeWidth="1.5"/>
        {/* dashed sweep arc: bottom-hinge → top-right */}
        <path d={`M${sL},${sB} Q${sR},${sB} ${sR},${sT}`}
          stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        {/* dashed top edge (sash top in open position) */}
        <line x1={sL} y1={sT} x2={sR} y2={sT}
          stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {/* solid diagonal: sash leading edge when open */}
        <line x1={sL} y1={sB} x2={sR} y2={sT} stroke={MOV} strokeWidth="1.5"/>
        {/* handle near opposite edge */}
        <rect x={sR - 5} y={MID_Y - 4} width={4} height={8} rx="1.5" fill={SEC}/>
      </>
    )
  }

  if (sec.type === 'Awning') {
    // hinge top — geometry from window_awn, scaled to segment width
    return (
      <>
        {/* hinge line */}
        <line x1={sL} y1={sT} x2={sR} y2={sT} stroke={SEC} strokeWidth="1.5"/>
        {/* dashed arc: top-left → bottom-centre → top-right */}
        <path d={`M${sL},${sT} Q${sL},${sB} ${sCX},${sB} Q${sR},${sB} ${sR},${sT}`}
          stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        {/* left diagonal */}
        <line x1={sL} y1={sT} x2={sCX} y2={sB} stroke={MOV} strokeWidth="1.5"/>
        {/* right diagonal */}
        <line x1={sR} y1={sT} x2={sCX} y2={sB} stroke={MOV} strokeWidth="1.5"/>
        {/* handle bottom-centre */}
        <rect x={sCX - 5} y={sB - 4} width={10} height={4} rx="1.5" fill={SEC}/>
      </>
    )
  }

  if (sec.type === 'Slider') {
    // moving sash — geometry from window_sl (moving half only)
    const arrTip  = segX + segW * 0.62
    const arrLine = segX + segW * 0.26
    return (
      <>
        {/* MOV border: whole segment is the moving sash */}
        <rect x={sL} y={sT} width={Math.max(1, sR - sL)} height={Math.max(1, sB - sT)}
          fill="none" stroke={MOV} strokeWidth="1.5"/>
        {/* arrowhead pointing right */}
        <path d={`M${arrTip},${MID_Y} L${arrTip-7},${MID_Y-5} L${arrTip-5},${MID_Y} L${arrTip-7},${MID_Y+5}Z`}
          fill={MOV}/>
        {/* dashed movement line */}
        <line x1={arrLine} y1={MID_Y} x2={arrTip - 5} y2={MID_Y}
          stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {/* handle */}
        <rect x={sR - 5} y={MID_Y - 6} width={4} height={12} rx="2" fill={SEC}/>
      </>
    )
  }

  return null
}

// ── CombinationDrawing ─────────────────────────────────────────────
interface CombinationDrawingProps {
  sections: CombinationSection[]
  heightIn?: number
}

export function CombinationDrawing({ sections, heightIn }: CombinationDrawingProps) {
  if (!sections.length) return null
  const segs = buildSegs(sections)
  const hLabel = heightIn ? `${heightIn}"` : 'H'
  // all boundary x positions including both frame edges
  const boundaries = [FX, ...segs.slice(1).map(s => s.segX), FR]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-hidden
    >
      {/* outer frame */}
      <rect x={FX} y={FY} width={FW} height={FH}
        rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>

      {/* internal segment dividers (not at frame edges) */}
      {segs.slice(0, -1).map((seg, i) => (
        <line key={i}
          x1={seg.segX + seg.segW} y1={FY}
          x2={seg.segX + seg.segW} y2={FB}
          stroke={FRAME} strokeWidth="1.5"/>
      ))}

      {/* type indicators */}
      {segs.map((seg, i) => <SegContent key={i} info={seg} />)}

      {/* ── Width dimension line ── */}
      <line x1={FX} y1={DIM_Y} x2={FR} y2={DIM_Y} stroke={SEC} strokeWidth="1"/>
      {boundaries.map((bx, i) => (
        <line key={i}
          x1={bx} y1={DIM_Y - TICK} x2={bx} y2={DIM_Y + TICK}
          stroke={SEC} strokeWidth="1.5"/>
      ))}
      {segs.map((seg, i) => (
        <g key={i}>
          <text x={seg.sCX} y={LBL_Y} textAnchor="middle"
            fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill={DIM}>
            {seg.sec.width}&quot;
          </text>
          <text x={seg.sCX} y={TYPE_Y} textAnchor="middle"
            fontFamily="system-ui, sans-serif" fontSize="9" fill={SEC}>
            {seg.sec.type}
          </text>
        </g>
      ))}

      {/* ── Height dimension line (right) ── */}
      <line x1={DIM_R} y1={FY} x2={DIM_R} y2={FB} stroke={SEC} strokeWidth="1"/>
      <line x1={DIM_R - 4} y1={FY} x2={DIM_R + 4} y2={FY} stroke={SEC} strokeWidth="1.5"/>
      <line x1={DIM_R - 4} y1={FB} x2={DIM_R + 4} y2={FB} stroke={SEC} strokeWidth="1.5"/>
      <text x={DIM_R + 6} y={MID_Y + 4} textAnchor="start"
        fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="700" fill={DIM}>
        {hLabel}
      </text>
    </svg>
  )
}

// ── SectionBuilder ─────────────────────────────────────────────────
import { C } from '@/lib/v2/openingTypes'

interface SectionBuilderProps {
  sections: CombinationSection[]
  heightIn?: number
  onChange: (sections: CombinationSection[]) => void
}

export function SectionBuilder({ sections, heightIn, onChange }: SectionBuilderProps) {
  const totalWidth = sections.reduce((s, sec) => s + sec.width, 0)

  const updateType = (i: number, type: CombinationSectionType) =>
    onChange(sections.map((sec, j) => j === i ? { ...sec, type } : sec))

  const updateWidth = (i: number, raw: string) => {
    const w = Math.max(1, parseFloat(raw) || 1)
    onChange(sections.map((sec, j) => j === i ? { ...sec, width: w } : sec))
  }

  const remove = (i: number) => {
    if (sections.length <= 1) return
    onChange(sections.filter((_, j) => j !== i))
  }

  const add = () => onChange([...sections, { type: 'Picture', width: 24 }])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* live drawing */}
      <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: '12px 10px 8px' }}>
        <CombinationDrawing sections={sections} heightIn={heightIn} />
      </div>

      {/* list header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkSoft }}>
          Sections
        </span>
        <span style={{ fontSize: 11, color: C.inkSoft }}>
          Overall: <strong style={{ color: C.ink }}>{totalWidth}&quot;</strong> (auto)
        </span>
      </div>

      {/* section rows */}
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

            {/* width input */}
            <div style={{ position: 'relative', width: 72, flexShrink: 0 }}>
              <input
                type="number"
                min="1"
                step="0.5"
                value={sec.width}
                onChange={e => updateWidth(i, e.target.value)}
                style={{ width: '100%', height: 38, padding: '0 20px 0 8px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: C.inkSoft, pointerEvents: 'none' }}>&quot;</span>
            </div>

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
