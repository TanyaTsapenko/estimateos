// Generates plain SVG markup for each opening type — no React dependency.
// Used for PDF drawing generation (sharp PNG conversion).

const G  = '#EEF4FF'  // glass fill
const FR = '#334155'  // frame
const SE = '#94A3B8'  // secondary
const MV = '#2563EB'  // movement / active

const W = '0 0 215 255'

function wrap(body: string, vb = W): string {
  return `<svg viewBox="${vb}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
}

function r(x: number, y: number, w: number, h: number, fill: string, stroke: string, sw = 2.5, rx = 0): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rx ? ` rx="${rx}"` : ''}/>`
}
function l(x1: number, y1: number, x2: number, y2: number, stroke: string, sw = 1.5, dash = ''): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
}
function p(d: string, stroke: string, sw = 1.5, fill = 'none', dash = ''): string {
  return `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
}
function c(cx: number, cy: number, rad: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"/>`
}

const WF = r(10, 10, 180, 210, G, FR, 2.5, 3)
const DF = r(20, 10, 155, 215, G, FR, 2.5, 2)

export function openingSvgString(type: string): string {
  const t = type.toLowerCase().replace(/_/g, '')
  switch (t) {
    // ── Windows ──────────────────────────────────────────────────
    case 'doublehung':
    case 'windowdh':
      return wrap(
        WF +
        r(10, 10, 180, 106, G, MV, 1.5, 2) +
        r(10, 114, 180, 106, G, MV, 1.5, 2) +
        l(10, 114, 190, 114, FR, 2.5) +
        l(10, 108, 190, 108, SE, 1) +
        `<path d="M100 35 L94 47 L100 44 L106 47Z" fill="${MV}"/>` +
        l(100, 44, 100, 105, MV, 1.5, '4 2') +
        `<path d="M100 195 L94 183 L100 186 L106 183Z" fill="${MV}"/>` +
        l(100, 125, 100, 186, MV, 1.5, '4 2')
      )

    case 'singlehung':
    case 'windowsh':
      return wrap(
        WF +
        r(10, 10, 180, 106, G, MV, 1.5, 2) +
        r(10, 114, 180, 106, G, SE, 1.5, 2) +
        l(10, 114, 190, 114, FR, 2.5) +
        l(10, 108, 190, 108, SE, 1) +
        `<path d="M100 35 L94 47 L100 44 L106 47Z" fill="${MV}"/>` +
        l(100, 44, 100, 105, MV, 1.5, '4 2')
      )

    case 'casement':
    case 'windowcas':
      return wrap(
        WF +
        l(20, 20, 20, 215, SE, 1.5) +
        p('M20 215 Q190 215 190 20', MV, 1.5, 'none', '5 3') +
        l(20, 20, 190, 20, MV, 1.5, '4 2') +
        l(20, 215, 190, 20, MV, 1.5) +
        r(175, 108, 8, 14, SE, SE, 1, 2)
      )

    case 'awning':
    case 'windowawn':
      return wrap(
        WF +
        l(10, 20, 190, 20, SE, 1.5) +
        p('M10 20 Q10 215 100 215 Q190 215 190 20', MV, 1.5, 'none', '5 3') +
        l(10, 20, 100, 215, MV, 1.5) +
        l(190, 20, 100, 215, MV, 1.5) +
        r(92, 195, 16, 8, SE, SE, 1, 2)
      )

    case 'hopper':
      return wrap(
        WF +
        l(10, 210, 190, 210, SE, 1.5) +
        p('M10 210 Q10 15 100 15 Q190 15 190 210', MV, 1.5, 'none', '5 3') +
        l(10, 210, 100, 15, MV, 1.5) +
        l(190, 210, 100, 15, MV, 1.5) +
        r(92, 15, 16, 8, SE, SE, 1, 2)
      )

    case 'slider':
    case 'windowsl':
    case 'windowsliding':
      return wrap(
        WF +
        l(100, 10, 100, 220, FR, 2.5) +
        l(115, 20, 185, 200, SE, 1, '3 3') +
        l(185, 20, 115, 200, SE, 1, '3 3') +
        r(12, 12, 86, 206, G, MV, 1.5) +
        `<path d="M60 110 L48 104 L51 110 L48 116Z" fill="${MV}"/>` +
        l(51, 110, 86, 110, MV, 1.5, '4 2') +
        r(88, 104, 6, 12, SE, SE, 1, 2)
      )

    case 'endvent':
      return wrap(
        WF +
        l(65, 10, 65, 220, FR, 2) +
        l(145, 10, 145, 220, FR, 2) +
        r(12, 12, 51, 206, G, MV, 1.5) +
        `<path d="M38 110 L26 104 L29 110 L26 116Z" fill="${MV}"/>` +
        l(29, 110, 61, 110, MV, 1.5, '4 2') +
        r(148, 12, 51, 206, G, MV, 1.5) +
        `<path d="M177 110 L189 104 L186 110 L189 116Z" fill="${MV}"/>` +
        l(186, 110, 151, 110, MV, 1.5, '4 2') +
        r(67, 12, 76, 206, G, SE, 1)
      )

    case 'picture':
    case 'windowfix':
    case 'windowpicture':
      return wrap(
        WF +
        l(15, 15, 185, 215, SE, 1.2, '5 3') +
        l(185, 15, 15, 215, SE, 1.2, '5 3')
      )

    case 'tiltturn':
    case 'windowtilt':
      return wrap(
        WF +
        l(20, 20, 20, 215, SE, 1.5) +
        l(20, 215, 190, 20, MV, 1.5) +
        p('M20 215 Q190 215 190 115', MV, 1.5, 'none', '5 3') +
        c(188, 115, 4, MV) +
        r(175, 108, 8, 14, SE, SE, 1, 2)
      )

    case 'bay':
    case 'windowbay':
      return wrap(
        `<polygon points="15,50 65,35 65,205 15,220" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
        l(15, 135, 65, 120, FR, 1.5) +
        r(65, 30, 85, 180, G, FR, 2.5) +
        l(65, 120, 150, 120, FR, 1.5) +
        l(107, 30, 107, 120, SE, 1.2) +
        l(107, 120, 107, 210, SE, 1.2) +
        `<polygon points="150,35 200,50 200,220 150,205" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
        l(150, 120, 200, 135, FR, 1.5)
      )

    case 'bow':
    case 'windowbow':
      return wrap(
        `<polygon points="15,80 45,45 45,205 15,195" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
        r(45, 38, 40, 172, G, FR, 2.5) +
        r(85, 30, 45, 185, G, FR, 2.5) +
        r(130, 38, 40, 172, G, FR, 2.5) +
        `<polygon points="170,45 200,80 200,195 170,205" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
        l(15, 140, 45, 135, FR, 1.5) +
        l(45, 124, 85, 122, FR, 1.5) +
        l(85, 122, 130, 122, FR, 1.5) +
        l(130, 122, 170, 124, FR, 1.5) +
        l(170, 135, 200, 140, FR, 1.5)
      )

    case 'combination':
    case 'windowcombo':
      return wrap(
        `<polygon points="15,45 65,35 65,210 15,200" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
        r(65, 30, 85, 185, G, FR, 2.5) +
        `<polygon points="150,35 200,45 200,200 150,210" fill="${G}" stroke="${FR}" stroke-width="2.5" stroke-linejoin="round"/>` +
        p('M65 120 Q18 95 15 122', MV, 1.2, 'none', '3 2') +
        p('M150 120 Q197 95 200 122', MV, 1.2, 'none', '3 2')
      )

    case 'special':
    case 'transom':
    case 'windowarch':
      return wrap(
        p('M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z', G, 2.5, G) +
        p('M10 220 L10 100 Q10 10 100 10 Q190 10 190 100 L190 220 Z', FR, 2.5, 'none')
      )

    // ── Doors ─────────────────────────────────────────────────────
    case 'entry':
    case 'doorentry':
      return wrap(
        DF +
        r(28, 18, 139, 199, '#F1F5F9', SE, 1.5) +
        r(36, 26, 123, 78, G, SE, 1) +
        r(36, 114, 123, 94, G, SE, 1) +
        c(148, 170, 5, SE) +
        r(145, 158, 6, 24, SE, SE, 1, 3) +
        p('M20 225 Q20 10 175 10', MV, 1, 'none', '5 3')
      )

    case 'doubleentry':
    case 'doordouble':
      return wrap(
        r(10, 10, 80, 215, G, FR, 2.5) +
        r(15, 15, 70, 205, '#F1F5F9', SE, 1) +
        r(21, 23, 58, 83, G, SE, 1) +
        r(21, 114, 58, 103, G, SE, 1) +
        r(120, 10, 80, 215, G, FR, 2.5) +
        r(125, 15, 70, 205, '#F1F5F9', SE, 1) +
        r(131, 23, 58, 83, G, SE, 1) +
        r(131, 114, 58, 103, G, SE, 1) +
        r(82, 158, 6, 20, SE, SE, 1, 3) +
        r(107, 158, 6, 20, SE, SE, 1, 3) +
        p('M100 225 Q10 225 10 120', MV, 1, 'none', '4 3') +
        p('M100 225 Q190 225 190 120', MV, 1, 'none', '4 3')
      )

    case 'french':
    case 'doorfrench':
      return wrap(
        r(10, 10, 85, 215, G, FR, 2.5) +
        r(15, 15, 75, 205, '#F1F5F9', SE, 1) +
        r(22, 23, 62, 93, G, SE, 1) +
        r(22, 123, 62, 94, G, SE, 1) +
        r(115, 10, 85, 215, G, FR, 2.5) +
        r(120, 15, 75, 205, '#F1F5F9', SE, 1) +
        r(127, 23, 62, 93, G, SE, 1) +
        r(127, 123, 62, 94, G, SE, 1) +
        r(83, 156, 6, 18, SE, SE, 1, 3) +
        r(106, 156, 6, 18, SE, SE, 1, 3) +
        p('M100 222 Q10 222 10 120', MV, 1, 'none', '4 3') +
        p('M100 222 Q190 222 190 120', MV, 1, 'none', '4 3')
      )

    case 'garden':
    case 'doorgarden':
      return wrap(
        r(10, 10, 180, 215, G, FR, 2.5) +
        r(10, 10, 50, 215, G, FR, 2) +
        l(15, 15, 55, 221, SE, 1, '4 3') +
        l(55, 15, 15, 221, SE, 1, '4 3') +
        r(62, 14, 124, 207, '#F1F5F9', SE, 1.5) +
        r(70, 22, 108, 88, G, SE, 1) +
        r(70, 118, 108, 97, G, SE, 1) +
        p('M60 225 Q60 10 190 10', MV, 1, 'none', '5 3')
      )

    case 'patio':
    case 'doorpatio':
    case 'doorpatiosl':
      return wrap(
        r(10, 10, 180, 215, G, FR, 2.5) +
        l(100, 10, 100, 225, FR, 2.5) +
        l(105, 15, 185, 222, SE, 1, '4 3') +
        l(185, 15, 105, 222, SE, 1, '4 3') +
        r(12, 12, 86, 211, G, MV, 1.5) +
        `<path d="M55 118 L43 112 L46 118 L43 124Z" fill="${MV}"/>` +
        l(46, 118, 85, 118, MV, 1.5, '4 2') +
        r(87, 112, 6, 16, SE, SE, 1, 2)
      )

    case 'storm':
    case 'doorstorm':
      return wrap(
        DF +
        r(30, 18, 135, 199, 'none', SE, 1.5, 0) +
        r(36, 24, 123, 128, G, SE, 1) +
        r(36, 158, 123, 54, '#F1F5F9', SE, 1) +
        r(145, 158, 6, 22, SE, SE, 1, 3)
      )

    case 'interior':
    case 'doorinterior':
    case 'doorint':
      return wrap(
        r(30, 10, 140, 215, '#F1F5F9', FR, 2.5) +
        r(40, 20, 120, 88, '#E2E8F0', SE, 1) +
        r(40, 118, 120, 98, '#E2E8F0', SE, 1) +
        c(148, 168, 5, SE) +
        r(145, 156, 6, 22, SE, SE, 1, 3) +
        p('M30 225 Q30 10 170 10', MV, 1, 'none', '5 3')
      )

    // Default — plain glass rectangle
    default:
      return wrap(WF + l(15, 15, 185, 215, SE, 1.2, '5 3') + l(185, 15, 15, 215, SE, 1.2, '5 3'))
  }
}
