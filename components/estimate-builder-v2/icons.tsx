'use client'

type IconProps = { name: string; size?: number; color?: string; stroke?: number }

export function EBIcon({ name, size = 16, color = 'currentColor', stroke = 1.7 }: IconProps) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'back':   return <svg {...p} strokeWidth={2}><path d="M15 6l-6 6 6 6"/></svg>
    case 'plus':   return <svg {...p} strokeWidth={2.3}><path d="M12 5v14M5 12h14"/></svg>
    case 'minus':  return <svg {...p} strokeWidth={2.3}><path d="M5 12h14"/></svg>
    case 'check':  return <svg {...p} strokeWidth={2.4}><path d="M5 12l4 4 10-10"/></svg>
    case 'chev-r': return <svg {...p} strokeWidth={2}><path d="M9 6l6 6-6 6"/></svg>
    case 'chev-d': return <svg {...p} strokeWidth={2}><path d="M6 9l6 6 6-6"/></svg>
    case 'chev-u': return <svg {...p} strokeWidth={2}><path d="M6 15l6-6 6 6"/></svg>
    case 'copy':   return <svg {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
    case 'trash':  return <svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg>
    case 'edit':   return <svg {...p}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>
    case 'camera': return <svg {...p}><path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.2"/></svg>
    case 'note':   return <svg {...p}><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M9 12h6M9 16h4"/></svg>
    case 'ruler':  return <svg {...p}><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>
    case 'paint':  return <svg {...p}><path d="M4 5a2 2 0 012-2h9a2 2 0 012 2v4a2 2 0 01-2 2H8v3a3 3 0 11-2 2.8"/></svg>
    case 'glass':  return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 9h14M12 3v18"/></svg>
    case 'tool':   return <svg {...p}><path d="M14 7a4 4 0 01-5 5l-5 5 2 2 5-5a4 4 0 005-5l-2 2-2-2 2-2z"/></svg>
    case 'gear':   return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>
    case 'door':   return <svg {...p}><path d="M5 21V4a1 1 0 011-1h9a1 1 0 011 1v17M5 21h13M14 12h.01"/></svg>
    case 'win':    return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 12h16M12 3v18"/></svg>
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
    case 'x':      return <svg {...p} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18"/></svg>
    case 'dup':    return <svg {...p}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/></svg>
    default:       { console.warn('[EBIcon] unknown icon name:', name); return null }
  }
}
