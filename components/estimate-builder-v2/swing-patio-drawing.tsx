'use client'
import { GLASS, FRAME, SEC, MOV, DIM } from '@/components/WindowDiagram'

const X1 = 10, Y1 = 10, X2 = 190, Y2 = 220
const SIDELITE_W = 32
const DOOR_FILL = '#C5CBD4'

function DimLines({ wL, hL }: { wL: string; hL: string }) {
  return (
    <>
      <line x1={X1} y1="227" x2={X2} y2="227" stroke={SEC} strokeWidth="1"/>
      <line x1={X1} y1="222" x2={X1} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <line x1={X2} y1="222" x2={X2} y2="232" stroke={SEC} strokeWidth="1.5"/>
      <text x={(X1+X2)/2} y="244" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{wL}</text>
      <line x1="197" y1={Y1} x2="197" y2={Y2} stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1={Y1} x2="201" y2={Y1} stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1={Y2} x2="201" y2={Y2} stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y={Math.round((Y1+Y2)/2)+4} textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{hL}</text>
    </>
  )
}

function DoorPanel({ x1, y1, x2, y2, hingeLeft, fr }: {
  x1: number; y1: number; x2: number; y2: number; hingeLeft: boolean; fr: string
}) {
  const my = (y1 + y2) / 2
  return (
    <g>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={DOOR_FILL} stroke={fr} strokeWidth="2.5"/>
      {hingeLeft ? <>
        {/* Hinge bar on left */}
        <line x1={x1+3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
        {/* Swing diagonal + arc */}
        <line x1={x1+3} y1={y2-3} x2={x2-3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
        <path d={`M${x1+3} ${y2-3} Q${x2-3} ${y2-3} ${x2-3} ${y1+3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        {/* Handle on right */}
        <rect x={x2-10} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
      </> : <>
        {/* Hinge bar on right */}
        <line x1={x2-3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1.5"/>
        {/* Swing diagonal + arc */}
        <line x1={x2-3} y1={y2-3} x2={x1+3} y2={y1+3} stroke={MOV} strokeWidth="1.2"/>
        <path d={`M${x2-3} ${y2-3} Q${x1+3} ${y2-3} ${x1+3} ${y1+3}`}
          stroke={MOV} strokeWidth="1.2" strokeDasharray="4 2" fill="none"/>
        {/* Handle on left */}
        <rect x={x1+4} y={my-10} width="6" height="20" rx="2" fill={SEC}/>
      </>}
    </g>
  )
}

function Sidelite({ x1, y1, x2, y2, fr }: {
  x1: number; y1: number; x2: number; y2: number; fr: string
}) {
  return (
    <g>
      <rect x={x1} y={y1} width={x2-x1} height={y2-y1} fill={GLASS} stroke={fr} strokeWidth="2"/>
      <line x1={x1+3} y1={y1+3} x2={x2-3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
      <line x1={x2-3} y1={y1+3} x2={x1+3} y2={y2-3} stroke={SEC} strokeWidth="1" strokeDasharray="5 3"/>
    </g>
  )
}

export function SwingPatioDrawing({ sub, widthIn, heightIn, uid }: {
  sub: string
  widthIn?: number
  heightIn?: number
  uid?: string
}) {
  const wL = widthIn  ? `${widthIn}"` : 'W'
  const hL = heightIn ? `${heightIn}"` : 'H'
  const FR = FRAME
  const s = sub.toLowerCase()

  const hasSidelites = s.includes('sidelite')
  const isDouble     = s.includes('double')

  if (!isDouble && !hasSidelites) {
    // Single swing — one door, hinge left
    return (
      <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
        <DoorPanel x1={X1} y1={Y1} x2={X2} y2={Y2} hingeLeft={true} fr={FR}/>
        <DimLines wL={wL} hL={hL}/>
      </svg>
    )
  }

  if (isDouble && !hasSidelites) {
    // Double swing — two equal panels, outer hinges
    const cx = (X1 + X2) / 2
    return (
      <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
        <DoorPanel x1={X1} y1={Y1} x2={cx} y2={Y2} hingeLeft={true}  fr={FR}/>
        <DoorPanel x1={cx} y1={Y1} x2={X2} y2={Y2} hingeLeft={false} fr={FR}/>
        <DimLines wL={wL} hL={hL}/>
      </svg>
    )
  }

  if (!isDouble && hasSidelites) {
    // Single + sidelites — sidelite left, door, sidelite right
    const doorX1 = X1 + SIDELITE_W
    const doorX2 = X2 - SIDELITE_W
    return (
      <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
        <Sidelite x1={X1}    y1={Y1} x2={doorX1} y2={Y2} fr={FR}/>
        <DoorPanel x1={doorX1} y1={Y1} x2={doorX2} y2={Y2} hingeLeft={true} fr={FR}/>
        <Sidelite x1={doorX2} y1={Y1} x2={X2}    y2={Y2} fr={FR}/>
        <DimLines wL={wL} hL={hL}/>
      </svg>
    )
  }

  // Double + sidelites — sidelite + two door panels + sidelite
  const doorX1 = X1 + SIDELITE_W
  const doorX2 = X2 - SIDELITE_W
  const cx = (doorX1 + doorX2) / 2
  return (
    <svg viewBox="0 0 215 255" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}>
      <Sidelite  x1={X1}    y1={Y1} x2={doorX1} y2={Y2} fr={FR}/>
      <DoorPanel x1={doorX1} y1={Y1} x2={cx}    y2={Y2} hingeLeft={true}  fr={FR}/>
      <DoorPanel x1={cx}    y1={Y1} x2={doorX2} y2={Y2} hingeLeft={false} fr={FR}/>
      <Sidelite  x1={doorX2} y1={Y1} x2={X2}    y2={Y2} fr={FR}/>
      <DimLines wL={wL} hL={hL}/>
    </svg>
  )
}
