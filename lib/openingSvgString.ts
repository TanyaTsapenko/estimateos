// Generates plain SVG markup for each opening type — no React dependency.
// Colors and geometry match the v2 React drawing components exactly.

const G  = '#EEF4FF'
const FR = '#334155'
const SE = '#94A3B8'
const MV = '#2563EB'
const DI = '#475569'
const DF = '#C5CBD4'

export type OpeningForSvg = {
  type: string
  window_subtype?: string | null
  width_in?: number | null
  height_in?: number | null
  bay_angle?: string | null
  opening_direction?: string | null
  glass_type?: string | null
  sidelight_left?: number | null
  sidelight_right?: number | null
  transom_above?: boolean | null
  shape?: string | null
  sections?: any[] | null
}

const WF = `<rect x="10" y="10" width="180" height="210" rx="3" fill="${G}" stroke="${FR}" stroke-width="2.5"/>`

function makeDimLines(wLabel: string, hLabel: string): string {
  return `<line x1="10" y1="226" x2="190" y2="226" stroke="${SE}" stroke-width="1"/>` +
    `<line x1="10" y1="221" x2="10" y2="231" stroke="${SE}" stroke-width="1.5"/>` +
    `<line x1="190" y1="221" x2="190" y2="231" stroke="${SE}" stroke-width="1.5"/>` +
    `<text x="100" y="243" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="${DI}">${wLabel}</text>` +
    `<line x1="197" y1="10" x2="197" y2="220" stroke="${SE}" stroke-width="1"/>` +
    `<line x1="193" y1="10" x2="201" y2="10" stroke="${SE}" stroke-width="1.5"/>` +
    `<line x1="193" y1="220" x2="201" y2="220" stroke="${SE}" stroke-width="1.5"/>` +
    `<text x="204" y="119" text-anchor="start" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="${DI}">${hLabel}</text>`
}

function bayDimLines(lx1: number, rx2: number, yT: number, yB: number, lean: number, wLabel: string, hLabel: string): string {
  const dimY = yB + lean + 12
  const my = Math.round((yT + yB) / 2)
  return `<line x1="${lx1}" y1="${dimY}" x2="${rx2}" y2="${dimY}" stroke="${SE}" stroke-width="1"/>` +
    `<line x1="${lx1}" y1="${dimY-5}" x2="${lx1}" y2="${dimY+5}" stroke="${SE}" stroke-width="1.5"/>` +
    `<line x1="${rx2}" y1="${dimY-5}" x2="${rx2}" y2="${dimY+5}" stroke="${SE}" stroke-width="1.5"/>` +
    `<text x="${Math.round((lx1+rx2)/2)}" y="${dimY+16}" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="${DI}">${wLabel}</text>` +
    `<line x1="${rx2+6}" y1="${yT}" x2="${rx2+6}" y2="${yB}" stroke="${SE}" stroke-width="1"/>` +
    `<line x1="${rx2+2}" y1="${yT}" x2="${rx2+10}" y2="${yT}" stroke="${SE}" stroke-width="1.5"/>` +
    `<line x1="${rx2+2}" y1="${yB}" x2="${rx2+10}" y2="${yB}" stroke="${SE}" stroke-width="1.5"/>` +
    `<text x="${rx2+14}" y="${my+4}" text-anchor="start" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="${DI}">${hLabel}</text>`
}

function wrap(body: string, vb = '0 0 215 255'): string {
  return `<svg viewBox="${vb}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
}

function dashedX(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1+4}" y1="${y1+4}" x2="${x2-4}" y2="${y2-4}" stroke="${SE}" stroke-width="1.2" stroke-dasharray="5 3"/>` +
    `<line x1="${x2-4}" y1="${y1+4}" x2="${x1+4}" y2="${y2-4}" stroke="${SE}" stroke-width="1.2" stroke-dasharray="5 3"/>`
}

function doorHinges(x1: number, y1: number, x2: number, y2: number, hingeLeft: boolean): string {
  const H   = y2 - y1
  const hy1 = y1 + Math.round(H * 0.20)
  const hy2 = y1 + Math.round(H * 0.67)
  const hx  = hingeLeft ? x1 + 2 : x2 - 7
  return `<rect x="${hx}" y="${hy1}" width="5" height="10" rx="1" fill="${SE}"/>` +
    `<rect x="${hx}" y="${hy2}" width="5" height="10" rx="1" fill="${SE}"/>`
}

function doorKnob(x1: number, y1: number, x2: number, y2: number, handleLeft: boolean): string {
  const my = Math.round((y1 + y2) / 2)
  if (handleLeft) {
    return `<circle cx="${x1+14}" cy="${my}" r="4" fill="${SE}"/>` +
      `<rect x="${x1+12}" y="${my-9}" width="5" height="18" rx="2" fill="${SE}"/>`
  }
  return `<circle cx="${x2-14}" cy="${my}" r="4" fill="${SE}"/>` +
    `<rect x="${x2-17}" y="${my-9}" width="5" height="18" rx="2" fill="${SE}"/>`
}

function swingArc(x1: number, y1: number, x2: number, y2: number, hingeLeft: boolean): string {
  const arc = hingeLeft
    ? `M${x1+3} ${y2-3} Q${x1+3} ${y1+3} ${x2-3} ${y1+3}`
    : `M${x2-3} ${y2-3} Q${x2-3} ${y1+3} ${x1+3} ${y1+3}`
  return `<path d="${arc}" stroke="${MV}" stroke-width="1" stroke-dasharray="5 3" fill="none"/>`
}

function sidelite(x1: number, y1: number, x2: number, y2: number): string {
  return `<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="${G}" stroke="${FR}" stroke-width="2"/>` +
    `<line x1="${x1+3}" y1="${y1+3}" x2="${x2-3}" y2="${y2-3}" stroke="${SE}" stroke-width="1" stroke-dasharray="5 3"/>` +
    `<line x1="${x2-3}" y1="${y1+3}" x2="${x1+3}" y2="${y2-3}" stroke="${SE}" stroke-width="1" stroke-dasharray="5 3"/>`
}

function doorPanel(x1: number, y1: number, x2: number, y2: number, hingeLeft: boolean): string {
  return `<rect x="${x1}" y="${y1}" width="${x2-x1}" height="${y2-y1}" fill="${DF}" stroke="${FR}" stroke-width="2.5"/>` +
    doorHinges(x1, y1, x2, y2, hingeLeft) +
    doorKnob(x1, y1, x2, y2, !hingeLeft) +
    swingArc(x1, y1, x2, y2, hingeLeft)
}

export function openingSvgString(op: OpeningForSvg | string): string {
  if (typeof op === 'string') op = { type: op }

  const t   = op.type.toLowerCase().replace(/[_\s-]+/g, '')
  const sub = (op.window_subtype ?? '').toLowerCase().replace(/[_\s-]+/g, '')
  const dir = (op.opening_direction ?? '').toLowerCase()
  const shp = (op.shape ?? '').toLowerCase().replace(/[_\s-]+/g, '')

  const wLabel = op.width_in  ? `${op.width_in}"` : 'W'
  const hLabel = op.height_in ? `${op.height_in}"` : 'H'
  const DL = makeDimLines(wLabel, hLabel)

  switch (t) {
    // ── Windows ────────────────────────────────────────────────────────────

    case 'doublehung':
    case 'windowdh':
      return wrap(
        WF +
        `<line x1="13" y1="115" x2="187" y2="115" stroke="${FR}" stroke-width="1.5"/>` +
        `<path d="M100 14 L95 21 L100 18 L105 21 Z" fill="${MV}"/>` +
        `<line x1="100" y1="18" x2="100" y2="111" stroke="${MV}" stroke-width="1.2" stroke-dasharray="3 2"/>` +
        `<path d="M100 216 L95 209 L100 212 L105 209 Z" fill="${MV}"/>` +
        `<line x1="100" y1="212" x2="100" y2="119" stroke="${MV}" stroke-width="1.2" stroke-dasharray="3 2"/>` +
        DL
      )

    case 'singlehung':
    case 'windowsh': {
      const shpFrame = shp.includes('arch')
        ? `<path d="M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z" fill="${G}" stroke="${FR}" stroke-width="2.5"/>`
        : WF
      return wrap(
        shpFrame +
        `<line x1="13" y1="115" x2="187" y2="115" stroke="${FR}" stroke-width="1.5"/>` +
        `<line x1="14" y1="14" x2="186" y2="113" stroke="${SE}" stroke-width="1" stroke-dasharray="5 3"/>` +
        `<line x1="186" y1="14" x2="14" y2="113" stroke="${SE}" stroke-width="1" stroke-dasharray="5 3"/>` +
        `<path d="M100 216 L95 209 L100 212 L105 209 Z" fill="${MV}"/>` +
        `<line x1="100" y1="212" x2="100" y2="119" stroke="${MV}" stroke-width="1.2" stroke-dasharray="3 2"/>` +
        DL
      )
    }

    case 'casement':
    case 'windowcas': {
      const isRight  = sub.includes('right') || sub === 'r' || (sub.length === 1 && sub === 'r')
      const isFixed  = sub.includes('fixed') || sub.includes('picture')
      const isDouble = sub.includes('double') || sub.includes('twin') || sub === 'oo' || sub === 'lr'

      const isHalfround = shp.includes('halfround') || shp.includes('halfcircle') || shp === 'semi'
      const isArch      = shp.includes('arch')
      const isCircle    = shp.includes('circle') || shp.includes('oval')

      const casFrame = isHalfround
        ? `<path d="M10 220 L10 130 Q10 10 100 10 Q190 10 190 130 L190 220 Z" fill="${FR}" stroke="${FR}" stroke-width="2.5"/>` +
          `<path d="M13 220 L13 130 Q13 16 100 16 Q187 16 187 130 L187 220 Z" fill="${G}" stroke="none"/>`
        : isArch
          ? `<path d="M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z" fill="${G}" stroke="${FR}" stroke-width="2.5"/>`
          : isCircle
            ? `<ellipse cx="100" cy="115" rx="80" ry="100" fill="${G}" stroke="${FR}" stroke-width="2.5"/>`
            : WF

      const casClipShape = isHalfround
        ? `<path d="M10 220 L10 130 Q10 10 100 10 Q190 10 190 130 L190 220 Z"/>`
        : isArch
          ? `<path d="M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z"/>`
          : isCircle
            ? `<ellipse cx="100" cy="115" rx="80" ry="100"/>`
            : `<rect x="10" y="10" width="180" height="210"/>`
      const casDefs = `<defs><clipPath id="cf-clip">${casClipShape}</clipPath></defs>`
      const CL = ` clip-path="url(#cf-clip)"`

      if (isFixed) return wrap(casDefs + casFrame + `<g${CL}>` + dashedX(10, 10, 190, 220) + `</g>` + DL)

      if (isDouble) {
        return wrap(
          casDefs + casFrame +
          `<g${CL}>` +
          `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="2"/>` +
          `<line x1="13" y1="13" x2="13" y2="217" stroke="${SE}" stroke-width="1.5"/>` +
          `<path d="M13 217 Q97 217 97 13" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
          `<line x1="13" y1="217" x2="97" y2="13" stroke="${MV}" stroke-width="1.2"/>` +
          `<rect x="92" y="109" width="5" height="12" rx="1.5" fill="${SE}"/>` +
          `<line x1="187" y1="13" x2="187" y2="217" stroke="${SE}" stroke-width="1.5"/>` +
          `<path d="M187 217 Q103 217 103 13" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
          `<line x1="187" y1="217" x2="103" y2="13" stroke="${MV}" stroke-width="1.2"/>` +
          `<rect x="103" y="109" width="5" height="12" rx="1.5" fill="${SE}"/>` +
          `</g>` +
          DL
        )
      }

      if (isRight) {
        return wrap(
          casDefs + casFrame +
          `<g${CL}>` +
          `<line x1="187" y1="13" x2="187" y2="217" stroke="${SE}" stroke-width="1.5"/>` +
          `<path d="M187 217 Q13 217 13 13" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
          `<line x1="187" y1="217" x2="13" y2="13" stroke="${MV}" stroke-width="1.2"/>` +
          `<rect x="13" y="109" width="5" height="12" rx="1.5" fill="${SE}"/>` +
          `</g>` +
          DL
        )
      }

      // Default: left-hinged
      return wrap(
        casDefs + casFrame +
        `<g${CL}>` +
        `<line x1="13" y1="13" x2="13" y2="217" stroke="${SE}" stroke-width="1.5"/>` +
        `<path d="M13 217 Q187 217 187 13" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
        `<line x1="13" y1="217" x2="187" y2="13" stroke="${MV}" stroke-width="1.2"/>` +
        `<rect x="182" y="109" width="5" height="12" rx="1.5" fill="${SE}"/>` +
        `</g>` +
        DL
      )
    }

    case 'awning':
    case 'windowawn': {
      const sNAwn = sub.replace(/[^a-z]/g, '')
      const isDoubleAwn  = sNAwn === 'doubleawning'
      const isAwningFixed = sNAwn === 'awningfixed'
      const isFixedAwning = sNAwn === 'fixedawning'

      const awningPane = (ax1: number, ay1: number, ax2: number, ay2: number): string => {
        const cx = Math.round((ax1 + ax2) / 2)
        const arcOff = (ay2 - ay1 > 150) ? 25 : 16
        return `<line x1="${ax1+5}" y1="${ay1+5}" x2="${ax2-5}" y2="${ay1+5}" stroke="${SE}" stroke-width="1.5"/>` +
          `<line x1="${ax1+5}" y1="${ay1+5}" x2="${cx}" y2="${ay2-5}" stroke="${MV}" stroke-width="1.2"/>` +
          `<line x1="${ax2-5}" y1="${ay1+5}" x2="${cx}" y2="${ay2-5}" stroke="${MV}" stroke-width="1.2"/>` +
          `<path d="M${ax1+5} ${ay2-5} Q${cx} ${ay2-arcOff} ${ax2-5} ${ay2-5}" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
          `<rect x="${cx-6}" y="${ay2-12}" width="12" height="5" rx="1.5" fill="${SE}"/>`
      }

      if (isDoubleAwn || isAwningFixed || isFixedAwning) {
        const MY = 115
        return wrap(
          WF +
          `<line x1="13" y1="${MY}" x2="187" y2="${MY}" stroke="${FR}" stroke-width="1.5"/>` +
          ((isDoubleAwn || isAwningFixed) ? awningPane(10, 10, 190, MY) : dashedX(10, 10, 190, MY)) +
          ((isDoubleAwn || isFixedAwning) ? awningPane(10, MY, 190, 220) : dashedX(10, MY, 190, 220)) +
          DL
        )
      }

      return wrap(
        WF +
        awningPane(10, 10, 190, 220) +
        DL
      )
    }

    case 'hopper':
      return wrap(
        WF +
        `<rect x="94" y="15" width="12" height="5" rx="1.5" fill="${SE}"/>` +
        `<line x1="15" y1="215" x2="185" y2="215" stroke="${SE}" stroke-width="1.5"/>` +
        `<line x1="15" y1="215" x2="100" y2="65" stroke="${MV}" stroke-width="1.2"/>` +
        `<line x1="185" y1="215" x2="100" y2="65" stroke="${MV}" stroke-width="1.2"/>` +
        `<path d="M15 215 Q100 65 185 215" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
        DL
      )

    case 'slider':
    case 'windowsl':
    case 'windowsliding': {
      const isOX = sub.startsWith('ox') && !sub.startsWith('xo')
      const isXX = sub === 'xx' || sub === 'oxo' || sub === 'xox'

      if (isOX) {
        // OX: left fixed, right slides left
        return wrap(
          WF +
          `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
          dashedX(10, 10, 100, 220) +
          `<line x1="110" y1="115" x2="185" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
          `<path d="M110 110 L103 115 L110 120 Z" fill="${MV}"/>` +
          `<rect x="181" y="108" width="5" height="14" rx="1.5" fill="${SE}"/>` +
          DL
        )
      }

      if (isXX) {
        // XX: both panels slide toward center
        return wrap(
          WF +
          `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
          `<line x1="15" y1="115" x2="90" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
          `<path d="M90 110 L97 115 L90 120 Z" fill="${MV}"/>` +
          `<rect x="14" y="108" width="5" height="14" rx="1.5" fill="${SE}"/>` +
          `<line x1="110" y1="115" x2="185" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
          `<path d="M110 110 L103 115 L110 120 Z" fill="${MV}"/>` +
          `<rect x="181" y="108" width="5" height="14" rx="1.5" fill="${SE}"/>` +
          DL
        )
      }

      // Default: XO — left slides right, right fixed
      return wrap(
        WF +
        `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
        `<line x1="15" y1="115" x2="90" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
        `<path d="M90 110 L97 115 L90 120 Z" fill="${MV}"/>` +
        `<rect x="14" y="108" width="5" height="14" rx="1.5" fill="${SE}"/>` +
        dashedX(100, 10, 190, 220) +
        DL
      )
    }

    case 'endvent':
      // 3-panel: sliding | fixed | sliding — panels 60px wide, dividers at x=70 and x=130
      return wrap(
        WF +
        `<line x1="70" y1="10" x2="70" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
        `<line x1="130" y1="10" x2="130" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
        `<line x1="15" y1="115" x2="60" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
        `<path d="M60 110 L67 115 L60 120 Z" fill="${MV}"/>` +
        `<rect x="14" y="108" width="5" height="14" rx="1.5" fill="${SE}"/>` +
        `<line x1="140" y1="115" x2="185" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
        `<path d="M140 110 L133 115 L140 120 Z" fill="${MV}"/>` +
        `<rect x="181" y="108" width="5" height="14" rx="1.5" fill="${SE}"/>` +
        dashedX(70, 10, 130, 220) +
        DL
      )

    case 'picture':
    case 'windowfix':
    case 'windowpicture':
      if (shp.includes('triangle') || shp.includes('peak') || shp.includes('gable')) {
        return wrap(
          `<polygon points="100,10 190,220 10,220" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
          DL
        )
      }
      if (shp.includes('arch')) {
        return wrap(
          `<path d="M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          DL
        )
      }
      if (shp.includes('circle') || shp.includes('oval')) {
        return wrap(
          `<ellipse cx="100" cy="115" rx="80" ry="100" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          DL
        )
      }
      if (shp.includes('halfround') || shp.includes('halfcircle')) {
        return wrap(
          `<path d="M10 220 L10 130 Q10 10 100 10 Q190 10 190 130 L190 220 Z" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          DL
        )
      }
      return wrap(WF + dashedX(10, 10, 190, 220) + DL)

    case 'tiltturn':
    case 'windowtilt':
      return wrap(
        WF +
        `<line x1="13" y1="13" x2="13" y2="217" stroke="${SE}" stroke-width="1.5"/>` +
        `<path d="M13 217 Q187 217 187 13" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
        `<line x1="13" y1="217" x2="187" y2="13" stroke="${MV}" stroke-width="1.2"/>` +
        `<line x1="14" y1="14" x2="100" y2="216" stroke="${MV}" stroke-width="1.2"/>` +
        `<line x1="186" y1="14" x2="100" y2="216" stroke="${MV}" stroke-width="1.2"/>` +
        `<rect x="182" y="109" width="5" height="12" rx="1.5" fill="${SE}"/>` +
        DL
      )

    case 'bay':
    case 'windowbay': {
      const angle = parseInt(op.bay_angle ?? '45') || 45
      const lean  = angle === 90 ? 0 : angle === 30 ? 7 : angle === 60 ? 18 : 12
      const lx1=10, lx2=58, rx1=158, rx2=205
      const yT=22, yB=218
      const vbH = yB + lean + 40
      return wrap(
        `<polygon points="${lx1},${yT+lean} ${lx2},${yT} ${lx2},${yB} ${lx1},${yB+lean}" fill="${G}" stroke="${FR}" stroke-width="2" stroke-linejoin="round"/>` +
        dashedX(lx1+4, yT+lean+4, lx2-4, yB-4) +
        `<rect x="${lx2}" y="${yT}" width="${rx1-lx2}" height="${yB-yT}" fill="${G}" stroke="${FR}" stroke-width="2"/>` +
        dashedX(lx2+4, yT+4, rx1-4, yB-4) +
        `<polygon points="${rx1},${yT} ${rx2},${yT+lean} ${rx2},${yB+lean} ${rx1},${yB}" fill="${G}" stroke="${FR}" stroke-width="2" stroke-linejoin="round"/>` +
        dashedX(rx1+4, yT+4, rx2-4, yB-4) +
        bayDimLines(lx1, rx2, yT, yB, lean, wLabel, hLabel),
        `0 0 232 ${vbH}`
      )
    }

    case 'bow':
    case 'windowbow': {
      const N=5, pw=38
      const yT=22, yB=215, endLean=10
      let panels = ''
      for (let i = 0; i < N; i++) {
        const x1 = 10 + i * pw
        const x2 = x1 + pw
        if (i === 0) {
          panels += `<polygon points="${x1},${yT+endLean} ${x2},${yT} ${x2},${yB} ${x1},${yB+endLean}" fill="${G}" stroke="${FR}" stroke-width="2" stroke-linejoin="round"/>` +
            dashedX(x1+3, yT+endLean+3, x2-3, yB-3)
        } else if (i === N-1) {
          panels += `<polygon points="${x1},${yT} ${x2},${yT+endLean} ${x2},${yB+endLean} ${x1},${yB}" fill="${G}" stroke="${FR}" stroke-width="2" stroke-linejoin="round"/>` +
            dashedX(x1+3, yT+3, x2-3, yB-3)
        } else {
          panels += `<rect x="${x1}" y="${yT}" width="${pw}" height="${yB-yT}" fill="${G}" stroke="${FR}" stroke-width="2"/>` +
            dashedX(x1+3, yT+3, x2-3, yB-3)
        }
      }
      return wrap(
        panels +
        `<line x1="10" y1="232" x2="200" y2="232" stroke="${SE}" stroke-width="1"/>` +
        `<line x1="10" y1="227" x2="10" y2="237" stroke="${SE}" stroke-width="1.5"/>` +
        `<line x1="200" y1="227" x2="200" y2="237" stroke="${SE}" stroke-width="1.5"/>` +
        `<text x="105" y="248" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="${DI}">${wLabel}</text>` +
        `<line x1="208" y1="${yT}" x2="208" y2="${yB}" stroke="${SE}" stroke-width="1"/>` +
        `<line x1="204" y1="${yT}" x2="212" y2="${yT}" stroke="${SE}" stroke-width="1.5"/>` +
        `<line x1="204" y1="${yB}" x2="212" y2="${yB}" stroke="${SE}" stroke-width="1.5"/>` +
        `<text x="214" y="${Math.round((yT+yB)/2)+4}" text-anchor="start" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="${DI}">${hLabel}</text>`,
        '0 0 232 255'
      )
    }

    case 'combination':
    case 'windowcombo': {
      const lx1=10, lx2=58, rx1=158, rx2=205
      const yT=22, yB=218, lean=12
      const vbH = yB + lean + 40
      return wrap(
        `<polygon points="${lx1},${yT+lean} ${lx2},${yT} ${lx2},${yB} ${lx1},${yB+lean}" fill="${G}" stroke="${FR}" stroke-width="2" stroke-linejoin="round"/>` +
        `<line x1="${lx1+3}" y1="${yT+lean+3}" x2="${lx1+3}" y2="${yB-3}" stroke="${SE}" stroke-width="1.2"/>` +
        `<path d="M${lx1+3} ${yB-3} Q${lx2-3} ${yB-3} ${lx2-3} ${yT+lean+3}" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
        `<line x1="${lx1+3}" y1="${yB-3}" x2="${lx2-3}" y2="${yT+lean+3}" stroke="${MV}" stroke-width="1.2"/>` +
        `<rect x="${lx2}" y="${yT}" width="${rx1-lx2}" height="${yB-yT}" fill="${G}" stroke="${FR}" stroke-width="2"/>` +
        dashedX(lx2+4, yT+4, rx1-4, yB-4) +
        `<polygon points="${rx1},${yT} ${rx2},${yT+lean} ${rx2},${yB+lean} ${rx1},${yB}" fill="${G}" stroke="${FR}" stroke-width="2" stroke-linejoin="round"/>` +
        `<line x1="${rx2-3}" y1="${yT+3}" x2="${rx2-3}" y2="${yB-3}" stroke="${SE}" stroke-width="1.2"/>` +
        `<path d="M${rx2-3} ${yB-3} Q${rx1+3} ${yB-3} ${rx1+3} ${yT+3}" stroke="${MV}" stroke-width="1.2" stroke-dasharray="4 2" fill="none"/>` +
        `<line x1="${rx2-3}" y1="${yB-3}" x2="${rx1+3}" y2="${yT+3}" stroke="${MV}" stroke-width="1.2"/>` +
        bayDimLines(lx1, rx2, yT, yB, lean, wLabel, hLabel),
        `0 0 232 ${vbH}`
      )
    }

    case 'special':
    case 'transom':
    case 'windowarch': {
      if (shp.includes('halfround') || shp.includes('halfcircle') || shp === 'half' || shp.includes('semi')) {
        return wrap(
          `<path d="M10 220 L10 130 Q10 10 100 10 Q190 10 190 130 L190 220 Z" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          DL
        )
      }
      if (shp.includes('circle') || shp.includes('oval') || shp === 'round' || shp.includes('ellipse')) {
        return wrap(
          `<ellipse cx="100" cy="115" rx="80" ry="100" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          DL
        )
      }
      if (shp.includes('trapez') || shp.includes('trap')) {
        return wrap(
          `<polygon points="30,10 170,10 190,220 10,220" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
          DL
        )
      }
      if (shp.includes('triangle') || shp.includes('peak') || shp.includes('gable')) {
        return wrap(
          `<polygon points="100,10 190,220 10,220" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
          DL
        )
      }
      if (shp === 'flat' || shp === 'rectangle' || shp === 'rect' || (t === 'transom' && !shp)) {
        return wrap(
          `<rect x="10" y="80" width="180" height="100" rx="3" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          dashedX(10, 80, 190, 180) +
          DL
        )
      }
      // Default: full arch
      return wrap(
        `<path d="M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
        DL
      )
    }

    // ── Doors ──────────────────────────────────────────────────────────────

    case 'entry':
    case 'doorentry': {
      const hingeLeft = !dir.includes('right')
      return wrap(doorPanel(10, 10, 190, 220, hingeLeft) + DL)
    }

    case 'doubleentry':
    case 'doordouble': {
      const cx = 100
      const hingeLeftActive = !dir.includes('right')
      return wrap(
        doorPanel(10, 10, cx, 220, hingeLeftActive) +
        `<rect x="${cx}" y="10" width="${190-cx}" height="210" fill="${DF}" stroke="${FR}" stroke-width="2.5"/>` +
        doorHinges(cx, 10, 190, 220, !hingeLeftActive) +
        doorKnob(cx, 10, 190, 220, hingeLeftActive) +
        DL
      )
    }

    case 'french':
    case 'doorfrench': {
      const cx = 100
      return wrap(
        `<rect x="10" y="10" width="${cx-10}" height="210" fill="${DF}" stroke="${FR}" stroke-width="2.5"/>` +
        doorHinges(10, 10, cx, 220, true) +
        doorKnob(10, 10, cx, 220, false) +
        swingArc(10, 10, cx, 220, true) +
        `<rect x="${cx}" y="10" width="${190-cx}" height="210" fill="${DF}" stroke="${FR}" stroke-width="2.5"/>` +
        doorHinges(cx, 10, 190, 220, false) +
        doorKnob(cx, 10, 190, 220, true) +
        swingArc(cx, 10, 190, 220, false) +
        DL
      )
    }

    case 'garden':
    case 'doorgarden': {
      const hingeLeft  = !dir.includes('right')
      const hasLeft    = !!op.sidelight_left
      const hasRight   = !!op.sidelight_right
      const hasTransom = !!op.transom_above

      const doorY1 = hasTransom ? 55 : 10
      let body = ''

      if (hasTransom) {
        body += `<rect x="10" y="10" width="180" height="40" rx="2" fill="${G}" stroke="${FR}" stroke-width="2"/>` +
          dashedX(10, 10, 190, 50)
      }

      if (hasLeft && hasRight) {
        body += sidelite(10, doorY1, 60, 220) + doorPanel(60, doorY1, 140, 220, hingeLeft) + sidelite(140, doorY1, 190, 220)
      } else if (hasLeft) {
        body += sidelite(10, doorY1, 65, 220) + doorPanel(65, doorY1, 190, 220, hingeLeft)
      } else if (hasRight) {
        body += doorPanel(10, doorY1, 135, 220, hingeLeft) + sidelite(135, doorY1, 190, 220)
      } else {
        body += doorPanel(10, doorY1, 190, 220, hingeLeft)
      }

      return wrap(body + DL)
    }

    case 'patio':
    case 'doorpatio':
    case 'doorpatiosl': {
      const isOX = sub.startsWith('ox') && !sub.startsWith('xo')
      const isXX = sub === 'xx'

      if (isOX) {
        // OX: left slides right, right fixed
        return wrap(
          `<rect x="10" y="10" width="180" height="210" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
          `<line x1="15" y1="115" x2="90" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
          `<path d="M90 109 L97 115 L90 121 Z" fill="${MV}"/>` +
          `<rect x="14" y="107" width="5" height="16" rx="1.5" fill="${SE}"/>` +
          dashedX(100, 10, 190, 220) +
          DL
        )
      }

      if (isXX) {
        // XX: both panels slide toward center
        return wrap(
          `<rect x="10" y="10" width="180" height="210" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
          `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
          `<line x1="15" y1="115" x2="90" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
          `<path d="M90 109 L97 115 L90 121 Z" fill="${MV}"/>` +
          `<rect x="14" y="107" width="5" height="16" rx="1.5" fill="${SE}"/>` +
          `<line x1="110" y1="115" x2="185" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
          `<path d="M110 109 L103 115 L110 121 Z" fill="${MV}"/>` +
          `<rect x="181" y="107" width="5" height="16" rx="1.5" fill="${SE}"/>` +
          DL
        )
      }

      // Default: XO — fixed left, sliding right
      return wrap(
        `<rect x="10" y="10" width="180" height="210" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
        `<line x1="100" y1="10" x2="100" y2="220" stroke="${FR}" stroke-width="1.5"/>` +
        dashedX(10, 10, 100, 220) +
        `<line x1="110" y1="115" x2="185" y2="115" stroke="${MV}" stroke-width="1" stroke-dasharray="4 2"/>` +
        `<path d="M110 109 L103 115 L110 121 Z" fill="${MV}"/>` +
        `<rect x="181" y="107" width="5" height="16" rx="1.5" fill="${SE}"/>` +
        DL
      )
    }

    case 'storm':
    case 'doorstorm': {
      const hingeLeft = !dir.includes('right')
      return wrap(
        `<rect x="10" y="10" width="180" height="210" fill="${G}" stroke="${FR}" stroke-width="2.5"/>` +
        doorHinges(10, 10, 190, 220, hingeLeft) +
        doorKnob(10, 10, 190, 220, !hingeLeft) +
        swingArc(10, 10, 190, 220, hingeLeft) +
        DL
      )
    }

    case 'interior':
    case 'doorinterior':
    case 'doorint': {
      const hingeLeft = !dir.includes('right')
      return wrap(
        `<rect x="10" y="10" width="180" height="210" fill="${DF}" stroke="${FR}" stroke-width="2.5"/>` +
        doorHinges(10, 10, 190, 220, hingeLeft) +
        doorKnob(10, 10, 190, 220, !hingeLeft) +
        swingArc(10, 10, 190, 220, hingeLeft) +
        DL
      )
    }

    default:
      return wrap(WF + dashedX(10, 10, 190, 220) + DL)
  }
}
