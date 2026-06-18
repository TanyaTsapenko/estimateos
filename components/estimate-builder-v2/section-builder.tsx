'use client'
import { C } from '@/lib/v2/openingTypes'
import type { CombinationSection, CombinationSectionType } from '@/lib/v2/openingTypes'

const SECTION_TYPES: CombinationSectionType[] = ['Casement', 'Fixed', 'Slider', 'Awning', 'Picture']

// ── SVG constants ──────────────────────────────────────────────────
const SVG_W = 300
const SVG_H = 128
const FX = 15          // frame left x
const FY = 10          // frame top y
const FW = 270         // frame width
const FH = 62          // frame height
const MID_Y = FY + FH / 2  // vertical midpoint of frame
const DIM_Y = FY + FH + 12 // dimension line y
const TICK = 5          // half-tick height
const LBL_Y = DIM_Y + 14  // width label y
const TYPE_Y = DIM_Y + 25  // type name y

type SegInfo = { x: number; w: number; sec: CombinationSection }

function buildSegs(sections: CombinationSection[]): SegInfo[] {
  const total = sections.reduce((s, sec) => s + sec.width, 0) || 1
  const segs: SegInfo[] = []
  let cumX = FX
  for (const sec of sections) {
    const w = (sec.width / total) * FW
    segs.push({ x: cumX, w, sec })
    cumX += w
  }
  return segs
}

function SegIndicator({ seg }: { seg: SegInfo }) {
  const { x, w, sec } = seg
  const topY = FY + 2
  const botY = FY + FH - 2
  const cx = x + w / 2
  const lx = x + 2
  const rx = x + w - 2
  const s = { stroke: '#0B1220', strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (sec.type === 'Casement') {
    return (
      <>
        <line x1={lx} y1={MID_Y} x2={rx} y2={topY} {...s} />
        <line x1={lx} y1={MID_Y} x2={rx} y2={botY} {...s} />
      </>
    )
  }
  if (sec.type === 'Awning') {
    return (
      <>
        <line x1={cx} y1={topY} x2={lx} y2={botY} {...s} />
        <line x1={cx} y1={topY} x2={rx} y2={botY} {...s} />
      </>
    )
  }
  if (sec.type === 'Slider') {
    const ax0 = x + w * 0.55
    const ax1 = x + w * 0.84
    return (
      <>
        <line x1={cx} y1={topY + 4} x2={cx} y2={botY - 4} {...s} />
        <line x1={ax0} y1={MID_Y} x2={ax1} y2={MID_Y} {...s} />
        <line x1={ax1 - 5} y1={MID_Y - 4} x2={ax1} y2={MID_Y} {...s} />
        <line x1={ax1 - 5} y1={MID_Y + 4} x2={ax1} y2={MID_Y} {...s} />
      </>
    )
  }
  return null
}

export function CombinationDrawing({ sections }: { sections: CombinationSection[] }) {
  if (!sections.length) return null
  const segs = buildSegs(sections)
  const rightX = FX + FW
  const boundaries = [FX, ...segs.slice(1).map(s => s.x), rightX]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-hidden
    >
      {/* outer frame */}
      <rect x={FX} y={FY} width={FW} height={FH}
        fill="none" stroke="#0B1220" strokeWidth={1.5} />

      {/* vertical segment dividers */}
      {segs.slice(0, -1).map((seg, i) => (
        <line key={i}
          x1={seg.x + seg.w} y1={FY}
          x2={seg.x + seg.w} y2={FY + FH}
          stroke="#0B1220" strokeWidth={0.8} />
      ))}

      {/* type indicators */}
      {segs.map((seg, i) => <SegIndicator key={i} seg={seg} />)}

      {/* dimension line */}
      <line x1={FX} y1={DIM_Y} x2={rightX} y2={DIM_Y}
        stroke="#0B1220" strokeWidth={0.8} />

      {/* boundary ticks */}
      {boundaries.map((bx, i) => (
        <line key={i}
          x1={bx} y1={DIM_Y - TICK}
          x2={bx} y2={DIM_Y + TICK}
          stroke="#0B1220" strokeWidth={0.8} />
      ))}

      {/* width + type labels */}
      {segs.map((seg, i) => {
        const cx = seg.x + seg.w / 2
        return (
          <g key={i}>
            <text x={cx} y={LBL_Y} textAnchor="middle"
              fontSize={8} fontFamily="system-ui, sans-serif" fill="#0B1220" fontWeight={700}>
              {seg.sec.width}&quot;
            </text>
            <text x={cx} y={TYPE_Y} textAnchor="middle"
              fontSize={7} fontFamily="system-ui, sans-serif" fill="#6B7280">
              {seg.sec.type}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── SectionBuilder ────────────────────────────────────────────────
interface SectionBuilderProps {
  sections: CombinationSection[]
  onChange: (sections: CombinationSection[]) => void
}

export function SectionBuilder({ sections, onChange }: SectionBuilderProps) {
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
        <CombinationDrawing sections={sections} />
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
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
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
