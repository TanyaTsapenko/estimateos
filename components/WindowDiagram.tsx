'use client'

interface WindowDiagramProps {
  type: string
  widthIn?: number
  heightIn?: number
  size?: number
}

const GLASS = '#EEF4FF'
const FRAME = '#334155'
const SEC = '#94A3B8'
const MOV = '#2563EB'

export default function WindowDiagram({ type, widthIn, heightIn, size = 80 }: WindowDiagramProps) {
  const w = widthIn ? `${widthIn}"` : 'W'
  const h = heightIn ? `${heightIn}"` : 'H'

  const label = (
    <text x="100" y="228" textAnchor="middle" fontSize="13" fill={SEC} fontFamily="sans-serif">
      {w} × {h}
    </text>
  )

  const diagrams: Record<string, React.ReactNode> = {
    // Double-Hung: two sashes, both movable, tilt arrows
    window_dh: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="10" y="10" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <rect x="10" y="114" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        {/* rail overlap */}
        <line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        {/* up arrow top sash */}
        <path d="M100 35 L94 47 L100 44 L106 47Z" fill={MOV}/>
        <line x1="100" y1="44" x2="100" y2="105" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {/* down arrow bottom sash */}
        <path d="M100 195 L94 183 L100 186 L106 183Z" fill={MOV}/>
        <line x1="100" y1="125" x2="100" y2="186" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {label}
      </svg>
    ),

    // Single-Hung: only bottom sash movable
    window_sh: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="10" y="10" width="180" height="106" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1.5"/>
        <rect x="10" y="114" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        {/* fixed X on top */}
        <line x1="20" y1="20" x2="185" y2="108" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="185" y1="20" x2="20" y2="108" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        {/* down arrow bottom */}
        <path d="M100 195 L94 183 L100 186 L106 183Z" fill={MOV}/>
        <line x1="100" y1="125" x2="100" y2="186" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {label}
      </svg>
    ),

    // Casement: hinged left, opens right (arc sweep)
    window_cas: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* hinge left side */}
        <line x1="20" y1="20" x2="20" y2="215" stroke={SEC} strokeWidth="1.5"/>
        {/* open arc from bottom-left to top-right */}
        <path d="M20 215 Q190 215 190 20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        {/* sash line to show open position */}
        <line x1="20" y1="20" x2="190" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <line x1="20" y1="215" x2="190" y2="20" stroke={MOV} strokeWidth="1.5"/>
        {/* handle */}
        <rect x="175" y="108" width="8" height="14" rx="2" fill={SEC}/>
        {label}
      </svg>
    ),

    // Awning: hinged top, opens outward bottom
    window_awn: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* hinge top */}
        <line x1="10" y1="20" x2="190" y2="20" stroke={SEC} strokeWidth="1.5"/>
        {/* open arc */}
        <path d="M10 20 Q10 215 100 215 Q190 215 190 20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <line x1="10" y1="20" x2="100" y2="215" stroke={MOV} strokeWidth="1.5"/>
        <line x1="190" y1="20" x2="100" y2="215" stroke={MOV} strokeWidth="1.5"/>
        {/* handle */}
        <rect x="92" y="195" width="16" height="8" rx="2" fill={SEC}/>
        {label}
      </svg>
    ),

    // Sliding: two panes, one slides horizontally
    window_sl: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="220" stroke={FRAME} strokeWidth="2.5"/>
        {/* fixed right */}
        <line x1="115" y1="20" x2="185" y2="200" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="185" y1="20" x2="115" y2="200" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        {/* movable left with arrow */}
        <rect x="12" y="12" width="86" height="206" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <path d="M60 110 L48 104 L51 110 L48 116Z" fill={MOV}/>
        <line x1="51" y1="110" x2="86" y2="110" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {/* handle */}
        <rect x="88" y="104" width="6" height="12" rx="2" fill={SEC}/>
        {label}
      </svg>
    ),

    // Fixed / Picture: no moving parts, X pattern
    window_fix: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="15" y1="15" x2="185" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="185" y1="15" x2="15" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        {label}
      </svg>
    ),

    // Bay / Bow: three panels angled
    window_bay: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* left angled panel */}
        <rect x="10" y="30" width="55" height="150" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2"
          transform="rotate(-10 37 105)"/>
        {/* center panel */}
        <rect x="62" y="10" width="76" height="180" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* right angled panel */}
        <rect x="135" y="30" width="55" height="150" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2"
          transform="rotate(10 162 105)"/>
        {/* X on center */}
        <line x1="66" y1="14" x2="134" y2="186" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="134" y1="14" x2="66" y2="186" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {label}
      </svg>
    ),

    // Transom: short wide window
    window_trans: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="70" width="180" height="100" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="15" y1="75" x2="185" y2="165" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="185" y1="75" x2="15" y2="165" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        {label}
      </svg>
    ),

    // Arched: rect with semicircle top
    window_arch: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 120 L10 220 L190 220 L190 120 Q190 10 100 10 Q10 10 10 120Z"
          fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* arch divider */}
        <line x1="10" y1="140" x2="190" y2="140" stroke={FRAME} strokeWidth="2"/>
        {/* rect X */}
        <line x1="15" y1="145" x2="185" y2="215" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="185" y1="145" x2="15" y2="215" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {/* arch X */}
        <line x1="30" y1="135" x2="170" y2="20" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="170" y1="135" x2="30" y2="20" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {label}
      </svg>
    ),

    // Tilt & Turn: casement + tilt arrows
    window_tilt: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* tilt line from bottom-center to top sides */}
        <line x1="100" y1="215" x2="20" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3"/>
        <line x1="100" y1="215" x2="180" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3"/>
        {/* turn arc right side */}
        <path d="M180 20 Q190 115 180 215" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
        {/* handle */}
        <rect x="175" y="108" width="8" height="14" rx="2" fill={SEC}/>
        {label}
      </svg>
    ),

    // Egress: large double-hung with emergency marker
    window_egr: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        <rect x="10" y="10" width="180" height="100" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <rect x="10" y="114" width="180" height="106" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        {/* egress arrow */}
        <path d="M100 35 L90 55 L100 50 L110 55Z" fill="#DC2626"/>
        <line x1="100" y1="50" x2="100" y2="105" stroke="#DC2626" strokeWidth="2"/>
        {/* E badge */}
        <circle cx="168" cy="30" r="12" fill="#DC2626"/>
        <text x="168" y="35" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold" fontFamily="sans-serif">E</text>
        {label}
      </svg>
    ),

    // Entry Door: solid panel with handle + hinge
    door_entry: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* frame */}
        <rect x="20" y="10" width="160" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* door panel */}
        <rect x="28" y="18" width="144" height="204" rx="2" fill="#F1F5F9" stroke={SEC} strokeWidth="1.5"/>
        {/* upper panel */}
        <rect x="36" y="26" width="128" height="80" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* lower panel */}
        <rect x="36" y="116" width="128" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* handle */}
        <circle cx="148" cy="170" r="5" fill={SEC}/>
        <rect x="145" y="158" width="6" height="24" rx="3" fill={SEC}/>
        {/* hinge */}
        <rect x="30" y="50" width="6" height="12" rx="1" fill={SEC}/>
        <rect x="30" y="158" width="6" height="12" rx="1" fill={SEC}/>
        {/* swing arc */}
        <path d="M20 220 Q20 10 180 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
        {label}
      </svg>
    ),

    // French Doors: two panels opening outward
    door_french: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        {/* left door pane */}
        <rect x="14" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="22" width="70" height="95" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="124" width="70" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* right door pane */}
        <rect x="104" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="22" width="70" height="95" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="124" width="70" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* handles */}
        <rect x="87" y="158" width="6" height="18" rx="3" fill={SEC}/>
        <rect x="107" y="158" width="6" height="18" rx="3" fill={SEC}/>
        {/* swing arcs */}
        <path d="M100 220 Q10 220 10 110" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        <path d="M100 220 Q190 220 190 110" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        {label}
      </svg>
    ),

    // Patio Sliding Door: two large panels, one slides
    door_patio: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        {/* fixed panel right — X */}
        <line x1="105" y1="15" x2="185" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="185" y1="15" x2="105" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {/* sliding panel left */}
        <rect x="12" y="12" width="86" height="216" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        {/* arrow */}
        <path d="M55 120 L43 114 L46 120 L43 126Z" fill={MOV}/>
        <line x1="46" y1="120" x2="85" y2="120" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {/* handle */}
        <rect x="87" y="112" width="6" height="16" rx="2" fill={SEC}/>
        {label}
      </svg>
    ),

    // Storm Door: glass door over entry silhouette
    door_storm: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="10" width="160" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* inner dashed border */}
        <rect x="30" y="18" width="140" height="204" rx="2" fill="none" stroke={SEC} strokeWidth="1.5" strokeDasharray="6 4"/>
        {/* glass panel */}
        <rect x="36" y="24" width="128" height="130" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* lower kick panel */}
        <rect x="36" y="160" width="128" height="56" rx="2" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        {/* handle */}
        <rect x="145" y="160" width="6" height="22" rx="3" fill={SEC}/>
        {label}
      </svg>
    ),

    // Interior Door: simple door, no glass
    door_int: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="10" width="140" height="220" rx="3" fill="#F1F5F9" stroke={FRAME} strokeWidth="2.5"/>
        {/* panels */}
        <rect x="40" y="20" width="120" height="90" rx="2" fill="#E2E8F0" stroke={SEC} strokeWidth="1"/>
        <rect x="40" y="120" width="120" height="100" rx="2" fill="#E2E8F0" stroke={SEC} strokeWidth="1"/>
        {/* handle */}
        <circle cx="148" cy="168" r="5" fill={SEC}/>
        <rect x="145" y="156" width="6" height="22" rx="3" fill={SEC}/>
        {/* swing arc */}
        <path d="M30 230 Q30 10 170 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
        {label}
      </svg>
    ),

    // Garden Door: door + sidelight
    door_garden: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        {/* sidelight left */}
        <rect x="10" y="10" width="50" height="220" fill={GLASS} stroke={FRAME} strokeWidth="2"/>
        <line x1="15" y1="15" x2="55" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="55" y1="15" x2="15" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {/* door panel */}
        <rect x="62" y="14" width="124" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1.5"/>
        <rect x="70" y="22" width="108" height="90" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="70" y="120" width="108" height="100" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* handle */}
        <rect x="150" y="158" width="6" height="22" rx="3" fill={SEC}/>
        {/* swing arc */}
        <path d="M60 226 Q60 10 186 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
        {label}
      </svg>
    ),

    // Double Entry Door: two full door panels
    door_double: (
      <svg viewBox="0 0 200 240" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        {/* left door */}
        <rect x="14" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="22" width="70" height="85" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="115" width="70" height="105" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* right door */}
        <rect x="104" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="22" width="70" height="85" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="115" width="70" height="105" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        {/* handles */}
        <rect x="87" y="160" width="6" height="20" rx="3" fill={SEC}/>
        <rect x="107" y="160" width="6" height="20" rx="3" fill={SEC}/>
        {/* hinges */}
        <rect x="14" y="48" width="5" height="10" rx="1" fill={SEC}/>
        <rect x="14" y="168" width="5" height="10" rx="1" fill={SEC}/>
        <rect x="181" y="48" width="5" height="10" rx="1" fill={SEC}/>
        <rect x="181" y="168" width="5" height="10" rx="1" fill={SEC}/>
        {/* swing arcs */}
        <path d="M100 226 Q10 226 10 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        <path d="M100 226 Q190 226 190 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        {label}
      </svg>
    ),
  }

  return (diagrams[type] ?? diagrams['window_dh']) as React.ReactElement
}
