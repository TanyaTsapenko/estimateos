'use client'
import { C } from '@/lib/v2/openingTypes'

type Props = { typeId: string; size?: number; color?: string }

export function MiniDiagram({ typeId, size = 40, color = C.blue }: Props) {
  const st = { stroke: color, strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const thin = { ...st, strokeWidth: 0.9, opacity: 0.7 }
  const dot = (cx: number, cy: number, r = 1.05) => <circle cx={cx} cy={cy} r={r} fill={color} />
  const WF = <rect x="5" y="3.5" width="14" height="17" rx="1.5" {...st} />
  const DF = <rect x="7" y="2.5" width="10" height="19" rx="1" {...st} />
  let g: React.ReactNode
  switch (typeId) {
    case 'casement':
      g = <>{WF}<path d="M5.5 4 L18 12 M5.5 20 L18 12" {...thin} />{dot(17.5, 12)}</>; break
    case 'awning':
      g = <>{WF}<path d="M5.5 5 L12 19.5 M18.5 5 L12 19.5" {...thin} />{dot(12, 18.5)}</>; break
    case 'picture':
      g = <>{WF}<rect x="8" y="6.5" width="8" height="11" rx="1" {...thin} /></>; break
    case 'slider':
      g = <>{WF}<line x1="12" y1="3.5" x2="12" y2="20.5" {...st} /><path d="M7 12 h3.2 M9 10.3 l1.7 1.7 l-1.7 1.7" {...thin} /></>; break
    case 'endVent':
      g = <>{WF}<line x1="8.5" y1="3.5" x2="8.5" y2="20.5" {...st} /><line x1="15.5" y1="3.5" x2="15.5" y2="20.5" {...st} /><path d="M5 12 h2.5 M6 10.5 l1.5 1.5 l-1.5 1.5" {...thin} /><path d="M19 12 h-2.5 M18 10.5 l-1.5 1.5 l1.5 1.5" {...thin} /></>; break
    case 'singleHung':
      g = <>{WF}<line x1="5" y1="12" x2="19" y2="12" {...st} /><path d="M12 18 v-3.4 M10.4 16.2 l1.6 -1.6 l1.6 1.6" {...thin} /></>; break
    case 'doubleHung':
      g = <>{WF}<line x1="5" y1="12" x2="19" y2="12" {...st} /><path d="M12 18 v-3.2 M10.5 16.4 l1.5 -1.5 l1.5 1.5" {...thin} /><path d="M12 6 v3.2 M10.5 7.6 l1.5 1.5 l1.5 -1.5" {...thin} /></>; break
    case 'hopper':
      g = <>{WF}<path d="M5.5 19.5 L12 5 M18.5 19.5 L12 5" {...thin} />{dot(12, 6)}</>; break
    case 'tiltTurn':
      g = <>{WF}<path d="M8.5 6 L13.5 12 L8.5 18" {...thin} />{dot(16, 12)}</>; break
    case 'bay':
      g = <><path d="M4 8.5 L8 3.5 L16 3.5 L20 8.5 L20 20.5 L4 20.5 Z" {...st} /><line x1="8" y1="3.5" x2="8" y2="20.5" {...thin} /><line x1="16" y1="3.5" x2="16" y2="20.5" {...thin} /></>; break
    case 'bow':
      g = <><path d="M4 10 Q12 3.5 20 10 L20 20.5 L4 20.5 Z" {...st} /><line x1="9.3" y1="6.4" x2="9.3" y2="20.5" {...thin} /><line x1="14.7" y1="6.4" x2="14.7" y2="20.5" {...thin} /></>; break
    case 'combination':
      g = <>{WF}<line x1="12" y1="3.5" x2="12" y2="20.5" {...st} /><line x1="5" y1="12" x2="19" y2="12" {...st} /></>; break
    case 'special':
      g = <path d="M5 20.5 V9 Q5 3.5 12 3.5 Q19 3.5 19 9 V20.5 Z" {...st} />; break
    case 'entry':
      g = <>{DF}<rect x="9" y="5" width="6" height="5" rx="0.6" {...thin} /><rect x="9" y="12" width="6" height="6.5" rx="0.6" {...thin} />{dot(15, 12)}</>; break
    case 'doubleEntry':
      g = <><rect x="5" y="2.5" width="6.5" height="19" rx="1" {...st} /><rect x="12.5" y="2.5" width="6.5" height="19" rx="1" {...st} />{dot(10.3, 12)}{dot(13.7, 12)}</>; break
    case 'french':
      g = <>{DF}<line x1="12" y1="3.5" x2="12" y2="20.5" {...thin} /><line x1="8" y1="9" x2="16" y2="9" {...thin} /><line x1="8" y1="15" x2="16" y2="15" {...thin} />{dot(15, 12)}</>; break
    case 'garden':
      g = <>{DF}<rect x="9" y="5" width="6" height="8" rx="0.6" {...thin} /><path d="M7 2.7 Q4.5 12 7 21.3" {...thin} />{dot(15, 13.5)}</>; break
    case 'patio':
      g = <><rect x="3.5" y="5" width="17" height="14" rx="1.2" {...st} /><line x1="12" y1="5" x2="12" y2="19" {...st} /><path d="M6.5 12 h4 M9 10 l2 2 l-2 2" {...thin} /></>; break
    case 'swingPatio':
      g = <><rect x="3.5" y="2.5" width="8.5" height="19" rx="1" {...st} /><rect x="12" y="2.5" width="8.5" height="19" rx="1" {...st} /><path d="M4 21 Q4 4 12 4" {...thin} /><path d="M20 21 Q20 4 12 4" {...thin} />{dot(10.5, 12)}{dot(13.5, 12)}</>; break
    case 'storm':
      g = <>{DF}<line x1="7" y1="11.5" x2="17" y2="11.5" {...thin} /><path d="M9 4.5 L15 9.5 M9 7.5 L13.5 11" {...thin} />{dot(15, 16)}</>; break
    default:
      g = WF
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{g}</svg>
}
