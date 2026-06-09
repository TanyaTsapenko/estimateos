import React from 'react'
import { Svg, Path, Rect, Line, Polygon, Circle } from '@react-pdf/renderer'

const GLASS = '#EEF4FF'
const FRAME = '#334155'
const SEC = '#94A3B8'
const MOV = '#2563EB'

export function WindowDiagramPdf({ type, size = 80 }: { type: string; size?: number }) {
  const diagrams: Record<string, React.ReactElement> = {

    window_dh: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="10" y="10" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <Rect x="10" y="114" width="180" height="106" rx="2" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <Line x1="10" y1="114" x2="190" y2="114" stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="10" y1="108" x2="190" y2="108" stroke={SEC} strokeWidth="1"/>
        <Path d="M100 35 L94 47 L100 44 L106 47Z" fill={MOV}/>
        <Line x1="100" y1="44" x2="100" y2="105" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <Path d="M100 195 L94 183 L100 186 L106 183Z" fill={MOV}/>
        <Line x1="100" y1="125" x2="100" y2="186" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
      </Svg>
    ),

    window_casement: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="20" y1="20" x2="20" y2="215" stroke={SEC} strokeWidth="1.5"/>
        <Path d="M20 215 Q190 215 190 20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <Line x1="20" y1="20" x2="190" y2="20" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <Line x1="20" y1="215" x2="190" y2="20" stroke={MOV} strokeWidth="1.5"/>
        <Rect x="175" y="108" width="8" height="14" rx="2" fill={SEC}/>
      </Svg>
    ),

    window_sliding: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="100" y1="10" x2="100" y2="220" stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="115" y1="20" x2="185" y2="200" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <Line x1="185" y1="20" x2="115" y2="200" stroke={SEC} strokeWidth="1" strokeDasharray="3 3"/>
        <Rect x="12" y="12" width="86" height="206" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <Path d="M60 110 L48 104 L51 110 L48 116Z" fill={MOV}/>
        <Line x1="51" y1="110" x2="86" y2="110" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <Rect x="88" y="104" width="6" height="12" rx="2" fill={SEC}/>
      </Svg>
    ),

    window_picture: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="15" y1="15" x2="185" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <Line x1="185" y1="15" x2="15" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
      </Svg>
    ),

    window_bay: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Polygon points="15,50 65,35 65,205 15,220" fill={GLASS} stroke={FRAME} strokeWidth="2.5" strokeLinejoin="round"/>
        <Line x1="15" y1="135" x2="65" y2="120" stroke={FRAME} strokeWidth="1.5"/>
        <Rect x="65" y="30" width="85" height="180" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="65" y1="120" x2="150" y2="120" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="107" y1="30" x2="107" y2="120" stroke={SEC} strokeWidth="1.2"/>
        <Line x1="107" y1="120" x2="107" y2="210" stroke={SEC} strokeWidth="1.2"/>
        <Polygon points="150,35 200,50 200,220 150,205" fill={GLASS} stroke={FRAME} strokeWidth="2.5" strokeLinejoin="round"/>
        <Line x1="150" y1="120" x2="200" y2="135" stroke={FRAME} strokeWidth="1.5"/>
      </Svg>
    ),

    window_bow: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Polygon points="15,80 45,45 45,205 15,195" fill={GLASS} stroke={FRAME} strokeWidth="2.5" strokeLinejoin="round"/>
        <Rect x="45" y="38" width="40" height="172" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="85" y="30" width="45" height="185" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="130" y="38" width="40" height="172" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Polygon points="170,45 200,80 200,195 170,205" fill={GLASS} stroke={FRAME} strokeWidth="2.5" strokeLinejoin="round"/>
        <Line x1="15" y1="140" x2="45" y2="135" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="45" y1="124" x2="85" y2="122" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="85" y1="122" x2="130" y2="122" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="130" y1="122" x2="170" y2="124" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="170" y1="135" x2="200" y2="140" stroke={FRAME} strokeWidth="1.5"/>
      </Svg>
    ),

    window_awning: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="10" y1="20" x2="190" y2="20" stroke={SEC} strokeWidth="1.5"/>
        <Path d="M10 20 Q10 215 100 215 Q190 215 190 20" stroke={MOV} strokeWidth="1.5" strokeDasharray="5 3" fill="none"/>
        <Line x1="10" y1="20" x2="100" y2="215" stroke={MOV} strokeWidth="1.5"/>
        <Line x1="190" y1="20" x2="100" y2="215" stroke={MOV} strokeWidth="1.5"/>
        <Rect x="92" y="195" width="16" height="8" rx="2" fill={SEC}/>
      </Svg>
    ),

    window_combination: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Polygon points="15,45 65,35 65,210 15,200" fill={GLASS} stroke={FRAME} strokeWidth="2.5" strokeLinejoin="round"/>
        <Line x1="15" y1="122" x2="65" y2="115" stroke={SEC} strokeWidth="1" strokeDasharray="3 2"/>
        <Rect x="65" y="30" width="85" height="185" rx="2" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="65" y1="42" x2="65" y2="215" stroke={FRAME} strokeWidth="1"/>
        <Line x1="150" y1="42" x2="150" y2="215" stroke={FRAME} strokeWidth="1"/>
        <Polygon points="150,35 200,45 200,200 150,210" fill={GLASS} stroke={FRAME} strokeWidth="2.5" strokeLinejoin="round"/>
        <Line x1="150" y1="122" x2="200" y2="115" stroke={SEC} strokeWidth="1" strokeDasharray="3 2"/>
        <Path d="M65 120 Q18 95 15 122" stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2" fill="none"/>
        <Path d="M150 120 Q197 95 200 122" stroke={MOV} strokeWidth="1.2" strokeDasharray="3 2" fill="none"/>
      </Svg>
    ),

    window_garden: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="60" width="180" height="140" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="10" y="60" width="180" height="35" fill={GLASS} stroke={SEC} strokeWidth="1.5"/>
        <Line x1="100" y1="95" x2="100" y2="200" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="15" y1="95" x2="185" y2="95" stroke={FRAME} strokeWidth="1.5"/>
        <Line x1="15" y1="155" x2="185" y2="155" stroke={SEC} strokeWidth="1"/>
      </Svg>
    ),

    window_skylight: (
      <Svg viewBox="0 0 215 255" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="210" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="15" y1="15" x2="185" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <Line x1="185" y1="15" x2="15" y2="215" stroke={SEC} strokeWidth="1.2" strokeDasharray="5 3"/>
        <Line x1="100" y1="10" x2="100" y2="220" stroke={SEC} strokeWidth="1" strokeDasharray="8 4"/>
        <Line x1="10" y1="115" x2="190" y2="115" stroke={SEC} strokeWidth="1" strokeDasharray="8 4"/>
      </Svg>
    ),

    door_entry: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="20" y="10" width="160" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="28" y="18" width="144" height="204" rx="2" fill="#F1F5F9" stroke={SEC} strokeWidth="1.5"/>
        <Rect x="36" y="26" width="128" height="80" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="36" y="116" width="128" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Circle cx="148" cy="170" r="5" fill={SEC}/>
        <Rect x="145" y="158" width="6" height="24" rx="3" fill={SEC}/>
        <Path d="M20 230 Q20 10 180 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
      </Svg>
    ),

    door_double_entry: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="14" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <Rect x="20" y="22" width="70" height="85" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="20" y="115" width="70" height="105" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="104" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <Rect x="110" y="22" width="70" height="85" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="110" y="115" width="70" height="105" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="87" y="160" width="6" height="20" rx="3" fill={SEC}/>
        <Rect x="107" y="160" width="6" height="20" rx="3" fill={SEC}/>
        <Path d="M100 226 Q10 226 10 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        <Path d="M100 226 Q190 226 190 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
      </Svg>
    ),

    door_french: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="14" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <Rect x="20" y="22" width="70" height="95" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="20" y="124" width="70" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="104" y="14" width="82" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <Rect x="110" y="22" width="70" height="95" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="110" y="124" width="70" height="96" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="87" y="158" width="6" height="18" rx="3" fill={SEC}/>
        <Rect x="107" y="158" width="6" height="18" rx="3" fill={SEC}/>
        <Path d="M100 226 Q10 226 10 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
        <Path d="M100 226 Q190 226 190 118" stroke={MOV} strokeWidth="1" strokeDasharray="4 3" fill="none"/>
      </Svg>
    ),

    door_patio_sliding: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="100" y1="10" x2="100" y2="230" stroke={FRAME} strokeWidth="2.5"/>
        <Line x1="105" y1="15" x2="185" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <Line x1="185" y1="15" x2="105" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <Rect x="12" y="12" width="86" height="216" fill={GLASS} stroke={MOV} strokeWidth="1.5"/>
        <Path d="M55 120 L43 114 L46 120 L43 126Z" fill={MOV}/>
        <Line x1="46" y1="120" x2="85" y2="120" stroke={MOV} strokeWidth="1.5" strokeDasharray="4 2"/>
        <Rect x="87" y="112" width="6" height="16" rx="2" fill={SEC}/>
      </Svg>
    ),

    door_garden: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="10" y="10" width="180" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="10" y="10" width="50" height="220" fill={GLASS} stroke={FRAME} strokeWidth="2"/>
        <Line x1="15" y1="15" x2="55" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <Line x1="55" y1="15" x2="15" y2="225" stroke={SEC} strokeWidth="1" strokeDasharray="4 3"/>
        <Rect x="62" y="14" width="124" height="212" fill="#F1F5F9" stroke={SEC} strokeWidth="1.5"/>
        <Rect x="70" y="22" width="108" height="90" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="70" y="120" width="108" height="100" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Path d="M60 230 Q60 10 190 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
      </Svg>
    ),

    door_storm: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="20" y="10" width="160" height="220" rx="3" fill={GLASS} stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="30" y="18" width="140" height="204" rx="2" fill="none" stroke={SEC} strokeWidth="1.5" strokeDasharray="6 4"/>
        <Rect x="36" y="24" width="128" height="130" rx="2" fill={GLASS} stroke={SEC} strokeWidth="1"/>
        <Rect x="36" y="160" width="128" height="56" rx="2" fill="#F1F5F9" stroke={SEC} strokeWidth="1"/>
        <Rect x="145" y="160" width="6" height="22" rx="3" fill={SEC}/>
      </Svg>
    ),

    door_interior: (
      <Svg viewBox="0 0 215 275" width={size} height={size}>
        <Rect x="30" y="10" width="140" height="220" rx="3" fill="#F1F5F9" stroke={FRAME} strokeWidth="2.5"/>
        <Rect x="40" y="20" width="120" height="90" rx="2" fill="#E2E8F0" stroke={SEC} strokeWidth="1"/>
        <Rect x="40" y="120" width="120" height="100" rx="2" fill="#E2E8F0" stroke={SEC} strokeWidth="1"/>
        <Circle cx="148" cy="168" r="5" fill={SEC}/>
        <Rect x="145" y="156" width="6" height="22" rx="3" fill={SEC}/>
        <Path d="M30 230 Q30 10 170 10" stroke={MOV} strokeWidth="1" strokeDasharray="5 3" fill="none"/>
      </Svg>
    ),
  }

  return diagrams[type] ?? diagrams['window_dh']
}
