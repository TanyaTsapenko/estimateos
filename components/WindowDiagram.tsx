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
const DIM = '#475569'
const MOV = '#2563EB'

export default function WindowDiagram({ type, widthIn, heightIn, size = 80 }: WindowDiagramProps) {
  const w = widthIn ? `${widthIn}"` : 'W'
  const h = heightIn ? `${heightIn}"` : 'H'

  // Dimension lines for standard window frame (x:10-190, y:10-220), viewBox "0 0 215 255"
  const winDims = (
    <>
      <line x1="10" y1="226" x2="190" y2="226" stroke={SEC} strokeWidth="1"/>
      <line x1="10" y1="221" x2="10" y2="231" stroke={SEC} strokeWidth="1.5"/>
      <line x1="190" y1="221" x2="190" y2="231" stroke={SEC} strokeWidth="1.5"/>
      <text x="100" y="243" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{w}</text>
      <line x1="197" y1="10" x2="197" y2="220" stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1="10" x2="201" y2="10" stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1="220" x2="201" y2="220" stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y="119" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{h}</text>
    </>
  )

  // Dimension lines for standard door frame (x:10-190, y:10-230), viewBox "0 0 215 275"
  const doorDims = (
    <>
      <line x1="10" y1="237" x2="190" y2="237" stroke={SEC} strokeWidth="1"/>
      <line x1="10" y1="232" x2="10" y2="242" stroke={SEC} strokeWidth="1.5"/>
      <line x1="190" y1="232" x2="190" y2="242" stroke={SEC} strokeWidth="1.5"/>
      <text x="100" y="255" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{w}</text>
      <line x1="197" y1="10" x2="197" y2="230" stroke={SEC} strokeWidth="1"/>
      <line x1="193" y1="10" x2="201" y2="10" stroke={SEC} strokeWidth="1.5"/>
      <line x1="193" y1="230" x2="201" y2="230" stroke={SEC} strokeWidth="1.5"/>
      <text x="204" y="124" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{h}</text>
    </>
  )

  // Narrow door frame (x:20-180, y:10-230), viewBox "0 0 215 275"
  const narrowDoorDims = (
    <>
      <line x1="20" y1="237" x2="180" y2="237" stroke={SEC} strokeWidth="1"/>
      <line x1="20" y1="232" x2="20" y2="242" stroke={SEC} strokeWidth="1.5"/>
      <line x1="180" y1="232" x2="180" y2="242" stroke={SEC} strokeWidth="1.5"/>
      <text x="100" y="255" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{w}</text>
      <line x1="187" y1="10" x2="187" y2="230" stroke={SEC} strokeWidth="1"/>
      <line x1="183" y1="10" x2="191" y2="10" stroke={SEC} strokeWidth="1.5"/>
      <line x1="183" y1="230" x2="191" y2="230" stroke={SEC} strokeWidth="1.5"/>
      <text x="196" y="124" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{h}</text>
    </>
  )

  const diagrams: Record<string, React.ReactNode> = {
    // Double-Hung: two sashes, both movable
    window_dh: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="10" y="10" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <rect x="10" y="114" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        <path d="M100 35 L94 47 L100 44 L106 47Z" fill={MOV}/>
        <line x1="100" y1="44" x2="100" y2="105" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <path d="M100 195 L94 183 L100 186 L106 183Z" fill={MOV}/>
        <line x1="100" y1="125" x2="100" y2="186" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {winDims}
      </svg>
    ),

    // Single-Hung: fixed top, movable bottom
    window_sh: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="10" y="10" width="180" height="106" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1.5"/>
        <rect x="10" y="114" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        <line x1="20" y1="20" x2="185" y2="108" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="185" y1="20" x2="20" y2="108" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <path d="M100 195 L94 183 L100 186 L106 183Z" fill={MOV}/>
        <line x1="100" y1="125" x2="100" y2="186" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        {winDims}
      </svg>
    ),

    // Casement: hinged left, opens right
    window_cas: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="20" y1="20" x2="20" y2="215" stroke={SEC} strokeWidth="1.5"/>
        <path d="M20 215 Q190 215 190 20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <line x1="20" y1="20" x2="190" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <line x1="20" y1="215" x2="190" y2="20" stroke={MOV} strokeWidth="1.5"/>
        <rect x="175" y="108" width="8" height="14" rx="2" fill={SEC}/>
        {winDims}
      </svg>
    ),

    // Awning: hinged top, opens outward bottom
    window_awn: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="20" x2="190" y2="20" stroke={SEC} strokeWidth="1.5"/>
        <path d="M10 20 Q10 215 100 215 Q190 215 190 20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <line x1="10" y1="20" x2="100" y2="215" stroke={MOV} strokeWidth="1.5"/>
        <line x1="190" y1="20" x2="100" y2="215" stroke={MOV} strokeWidth="1.5"/>
        <rect x="92" y="195" width="16" height="8" rx="2" fill={SEC}/>
        {winDims}
      </svg>
    ),

    // Sliding: two panes, one slides horizontally
    window_sl: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="220" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="115" y1="20" x2="185" y2="200" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <line x1="185" y1="20" x2="115" y2="200" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <rect x="12" y="12" width="86" height="206" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <path d="M60 110 L48 104 L51 110 L48 116Z" fill={MOV}/>
        <line x1="51" y1="110" x2="86" y2="110" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <rect x="88" y="104" width="6" height="12" rx="2" fill={SEC}/>
        {winDims}
      </svg>
    ),

    // Fixed / Picture: no moving parts
    window_fix: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="15" y1="15" x2="185" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="185" y1="15" x2="15" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        {winDims}
      </svg>
    ),

    // Bay / Bow: three angled panels
    window_bay: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="30" width="55" height="150" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2"
          transform="rotate(-10 37 105)"/>
        <rect x="62" y="10" width="76" height="180" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="135" y="30" width="55" height="150" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2"
          transform="rotate(10 162 105)"/>
        <line x1="66" y1="14" x2="134" y2="186" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="134" y1="14" x2="66" y2="186" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {/* Width dim aligned to outer extent */}
        <line x1="10" y1="226" x2="190" y2="226" stroke={SEC} strokeWidth="1"/>
        <line x1="10" y1="221" x2="10" y2="231" stroke={SEC} strokeWidth="1.5"/>
        <line x1="190" y1="221" x2="190" y2="231" stroke={SEC} strokeWidth="1.5"/>
        <text x="100" y="243" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{w}</text>
        <line x1="197" y1="10" x2="197" y2="190" stroke={SEC} strokeWidth="1"/>
        <line x1="193" y1="10" x2="201" y2="10" stroke={SEC} strokeWidth="1.5"/>
        <line x1="193" y1="190" x2="201" y2="190" stroke={SEC} strokeWidth="1.5"/>
        <text x="204" y="104" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{h}</text>
      </svg>
    ),

    // Transom: short wide window
    window_trans: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="80" width="180" height="90" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="15" y1="85" x2="185" y2="165" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <line x1="185" y1="85" x2="15" y2="165" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        {/* Width dim */}
        <line x1="10" y1="178" x2="190" y2="178" stroke={SEC} strokeWidth="1"/>
        <line x1="10" y1="173" x2="10" y2="183" stroke={SEC} strokeWidth="1.5"/>
        <line x1="190" y1="173" x2="190" y2="183" stroke={SEC} strokeWidth="1.5"/>
        <text x="100" y="196" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{w}</text>
        {/* Height dim */}
        <line x1="197" y1="80" x2="197" y2="170" stroke={SEC} strokeWidth="1"/>
        <line x1="193" y1="80" x2="201" y2="80" stroke={SEC} strokeWidth="1.5"/>
        <line x1="193" y1="170" x2="201" y2="170" stroke={SEC} strokeWidth="1.5"/>
        <text x="204" y="129" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{h}</text>
      </svg>
    ),

    // Arched: rect with semicircle top
    window_arch: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 120 L10 220 L190 220 L190 120 Q190 10 100 10 Q10 10 10 120Z"
          fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="140" x2="190" y2="140" stroke={FRAME} strokeWidth="2"/>
        <line x1="15" y1="145" x2="185" y2="215" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="185" y1="145" x2="15" y2="215" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="30" y1="135" x2="170" y2="20" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="170" y1="135" x2="30" y2="20" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        {winDims}
      </svg>
    ),

    // Tilt & Turn
    window_tilt: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="215" x2="20" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3"/>
        <line x1="100" y1="215" x2="180" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3"/>
        <path d="M180 20 Q190 115 180 215" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
        <rect x="175" y="108" width="8" height="14" rx="2" fill={SEC}/>
        {winDims}
      </svg>
    ),

    // Egress: large double-hung with emergency marker
    window_egr: (
      <svg viewBox="0 0 215 255" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        <rect x="10" y="10" width="180" height="100" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <rect x="10" y="114" width="180" height="106" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <path d="M100 35 L90 55 L100 50 L110 55Z" fill="#DC2626"/>
        <line x1="100" y1="50" x2="100" y2="105" stroke="#DC2626" strokeWidth="2"/>
        <circle cx="168" cy="30" r="12" fill="#DC2626"/>
        <text x="168" y="35" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold" fontFamily="sans-serif">E</text>
        {winDims}
      </svg>
    ),

    // Entry Door
    door_entry: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="10" width="160" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="28" y="18" width="144" height="204" rx="2" fill="#F1F5F9" stroke={SEC} strokeWidth="1.5"/>
        <rect x="36" y="26" width="128" height="80" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="36" y="116" width="128" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <circle cx="148" cy="170" r="5" fill={SEC}/>
        <rect x="145" y="158" width="6" height="24" rx="3" fill={SEC}/>
        <rect x="30" y="50" width="6" height="12" rx="1" fill={SEC}/>
        <rect x="30" y="158" width="6" height="12" rx="1" fill={SEC}/>
        <path d="M20 230 Q20 10 180 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
        {narrowDoorDims}
      </svg>
    ),

    // French Doors: two panels
    door_french: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        <rect x="14" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="22" width="70" height="95" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="124" width="70" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="104" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="22" width="70" height="95" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="124" width="70" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="87" y="158" width="6" height="18" rx="3" fill={SEC}/>
        <rect x="107" y="158" width="6" height="18" rx="3" fill={SEC}/>
        <path d="M100 226 Q10 226 10 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        <path d="M100 226 Q190 226 190 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        {doorDims}
      </svg>
    ),

    // Patio Sliding Door
    door_patio: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        <line x1="105" y1="15" x2="185" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="185" y1="15" x2="105" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <rect x="12" y="12" width="86" height="216" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <path d="M55 120 L43 114 L46 120 L43 126Z" fill={MOV}/>
        <line x1="46" y1="120" x2="85" y2="120" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <rect x="87" y="112" width="6" height="16" rx="2" fill={SEC}/>
        {doorDims}
      </svg>
    ),

    // Storm Door
    door_storm: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="10" width="160" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="30" y="18" width="140" height="204" rx="2" fill="none" stroke={SEC} strokeWidth="1.5" strokeDasharray="6 4"/>
        <rect x="36" y="24" width="128" height="130" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="36" y="160" width="128" height="56" rx="2" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="145" y="160" width="6" height="22" rx="3" fill={SEC}/>
        {narrowDoorDims}
      </svg>
    ),

    // Interior Door
    door_int: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="10" width="140" height="220" rx="3" fill="#F1F5F9" stroke={FRAME} strokeWidth="2.5"/>
        <rect x="40" y="20" width="120" height="90" rx="2" fill="#E2E8F0" stroke={SEC} strokeWidth="1"/>
        <rect x="40" y="120" width="120" height="100" rx="2" fill="#E2E8F0" stroke={SEC} strokeWidth="1"/>
        <circle cx="148" cy="168" r="5" fill={SEC}/>
        <rect x="145" y="156" width="6" height="22" rx="3" fill={SEC}/>
        <path d="M30 230 Q30 10 170 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
        {/* Width dim aligned to door edges x=30-170 */}
        <line x1="30" y1="237" x2="170" y2="237" stroke={SEC} strokeWidth="1"/>
        <line x1="30" y1="232" x2="30" y2="242" stroke={SEC} strokeWidth="1.5"/>
        <line x1="170" y1="232" x2="170" y2="242" stroke={SEC} strokeWidth="1.5"/>
        <text x="100" y="255" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{w}</text>
        <line x1="177" y1="10" x2="177" y2="230" stroke={SEC} strokeWidth="1"/>
        <line x1="173" y1="10" x2="181" y2="10" stroke={SEC} strokeWidth="1.5"/>
        <line x1="173" y1="230" x2="181" y2="230" stroke={SEC} strokeWidth="1.5"/>
        <text x="185" y="124" textAnchor="start" fontFamily="system-ui" fontSize="10" fontWeight="700" fill={DIM}>{h}</text>
      </svg>
    ),

    // Garden Door: door + left sidelight
    door_garden: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <rect x="10" y="10" width="50" height="220" fill={GLASS} stroke={FRAME} strokeWidth="2"/>
        <line x1="15" y1="15" x2="55" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <line x1="55" y1="15" x2="15" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <rect x="62" y="14" width="124" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1.5"/>
        <rect x="70" y="22" width="108" height="90" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="70" y="120" width="108" height="100" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="150" y="158" width="6" height="22" rx="3" fill={SEC}/>
        <path d="M60 230 Q60 10 190 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
        {doorDims}
      </svg>
    ),

    // Double Entry Door
    door_double: (
      <svg viewBox="0 0 215 275" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        <rect x="14" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="22" width="70" height="85" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="20" y="115" width="70" height="105" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="104" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="22" width="70" height="85" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="110" y="115" width="70" height="105" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <rect x="87" y="160" width="6" height="20" rx="3" fill={SEC}/>
        <rect x="107" y="160" width="6" height="20" rx="3" fill={SEC}/>
        <rect x="14" y="48" width="5" height="10" rx="1" fill={SEC}/>
        <rect x="14" y="168" width="5" height="10" rx="1" fill={SEC}/>
        <rect x="181" y="48" width="5" height="10" rx="1" fill={SEC}/>
        <rect x="181" y="168" width="5" height="10" rx="1" fill={SEC}/>
        <path d="M100 226 Q10 226 10 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        <path d="M100 226 Q190 226 190 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        {doorDims}
      </svg>
    ),
  }

  return (diagrams[type] ?? diagrams['window_dh']) as React.ReactElement
}
