// EstimateOS — Estimate Builder redesign · SHARED UI (part 2)

// ── Mini diagram per type — distinct line glyph for every product ─
// All drawn on a normalized 24×24 grid, then scaled to `size`.
function MiniDiagram({ typeId, size = 40, color = C.blue }) {
  const st = { stroke: color, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const thin = { ...st, strokeWidth: 1.2, opacity: 0.7 };
  const dot = (cx, cy, r = 1.05) => <circle cx={cx} cy={cy} r={r} fill={color} />;
  // window frame 5,3.5 → 19,20.5  (cx 12, midY 12)
  const WF = <rect x="5" y="3.5" width="14" height="17" rx="1.5" {...st} />;
  // door frame 7,2.5 → 17,21.5
  const DF = <rect x="7" y="2.5" width="10" height="19" rx="1" {...st} />;
  let g;
  switch (typeId) {
    case 'casement': // side-hinged, swings — handle on right
      g = <>{WF}<path d="M5.5 4 L18 12 M5.5 20 L18 12" {...thin} />{dot(17.5, 12)}</>; break;
    case 'awning': // top-hinged, opens at bottom
      g = <>{WF}<path d="M5.5 5 L12 19.5 M18.5 5 L12 19.5" {...thin} />{dot(12, 18.5)}</>; break;
    case 'picture': // fixed pane
      g = <>{WF}<rect x="8" y="6.5" width="8" height="11" rx="1" {...thin} /></>; break;
    case 'slider': // two panes, slides sideways
      g = <>{WF}<line x1="12" y1="3.5" x2="12" y2="20.5" {...st} /><path d="M7 12 h3.2 M9 10.3 l1.7 1.7 l-1.7 1.7" {...thin} /></>; break;
    case 'singleHung': // bottom sash up
      g = <>{WF}<line x1="5" y1="12" x2="19" y2="12" {...st} /><path d="M12 18 v-3.4 M10.4 16.2 l1.6 -1.6 l1.6 1.6" {...thin} /></>; break;
    case 'doubleHung': // both sashes
      g = <>{WF}<line x1="5" y1="12" x2="19" y2="12" {...st} /><path d="M12 18 v-3.2 M10.5 16.4 l1.5 -1.5 l1.5 1.5" {...thin} /><path d="M12 6 v3.2 M10.5 7.6 l1.5 1.5 l1.5 -1.5" {...thin} /></>; break;
    case 'hopper': // bottom-hinged, tilts in
      g = <>{WF}<path d="M5.5 19.5 L12 5 M18.5 19.5 L12 5" {...thin} />{dot(12, 6)}</>; break;
    case 'tiltTurn': // tilt + turn — chevron + hinge
      g = <>{WF}<path d="M8.5 6 L13.5 12 L8.5 18" {...thin} />{dot(16, 12)}</>; break;
    case 'bay': // 3-section angled projection
      g = (<><path d="M4 8.5 L8 3.5 L16 3.5 L20 8.5 L20 20.5 L4 20.5 Z" {...st} /><line x1="8" y1="3.5" x2="8" y2="20.5" {...thin} /><line x1="16" y1="3.5" x2="16" y2="20.5" {...thin} /></>); break;
    case 'bow': // curved multi-section
      g = (<><path d="M4 10 Q12 3.5 20 10 L20 20.5 L4 20.5 Z" {...st} /><line x1="9.3" y1="6.4" x2="9.3" y2="20.5" {...thin} /><line x1="14.7" y1="6.4" x2="14.7" y2="20.5" {...thin} /></>); break;
    case 'combination': // grid of units
      g = <>{WF}<line x1="12" y1="3.5" x2="12" y2="20.5" {...st} /><line x1="5" y1="12" x2="19" y2="12" {...st} /></>; break;
    case 'special': // arched top
      g = <path d="M5 20.5 V9 Q5 3.5 12 3.5 Q19 3.5 19 9 V20.5 Z" {...st} />; break;
    case 'entry': // single slab, panels + handle
      g = <>{DF}<rect x="9" y="5" width="6" height="5" rx="0.6" {...thin} /><rect x="9" y="12" width="6" height="6.5" rx="0.6" {...thin} />{dot(15, 12)}</>; break;
    case 'doubleEntry': // two slabs meeting
      g = (<><rect x="5" y="2.5" width="6.5" height="19" rx="1" {...st} /><rect x="12.5" y="2.5" width="6.5" height="19" rx="1" {...st} />{dot(10.3, 12)}{dot(13.7, 12)}</>); break;
    case 'french': // glazed door, grilles
      g = <>{DF}<line x1="12" y1="3.5" x2="12" y2="20.5" {...thin} /><line x1="8" y1="9" x2="16" y2="9" {...thin} /><line x1="8" y1="15" x2="16" y2="15" {...thin} />{dot(15, 12)}</>; break;
    case 'garden': // glazed + swing arc
      g = <>{DF}<rect x="9" y="5" width="6" height="8" rx="0.6" {...thin} /><path d="M7 2.7 Q4.5 12 7 21.3" {...thin} />{dot(15, 13.5)}</>; break;
    case 'patio': // wide sliding panels
      g = (<><rect x="3.5" y="5" width="17" height="14" rx="1.2" {...st} /><line x1="12" y1="5" x2="12" y2="19" {...st} /><path d="M6.5 12 h4 M9 10 l2 2 l-2 2" {...thin} /></>); break;
    case 'storm': // screen / glass mesh
      g = <>{DF}<line x1="7" y1="11.5" x2="17" y2="11.5" {...thin} /><path d="M9 4.5 L15 9.5 M9 7.5 L13.5 11" {...thin} />{dot(15, 16)}</>; break;
    default:
      g = WF;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24">{g}</svg>;
}

// ── Summary helpers ───────────────────────────────────────────────
function sizeStr(op) {
  const v = op.vals;
  const w = v.width || v.owidth, h = v.height || v.oheight;
  if (w && h) return `${w}" × ${h}"`;
  return null;
}
// chips: only meaningful, set values (skip empties / "None")
function summaryChips(op) {
  const v = op.vals, out = [];
  const push = (val) => { if (val && val !== 'None') out.push(val); };
  push(v.material || v.doorMaterial);
  push(v.glassType && `${v.glassType}${v.pane === 'Triple' ? ' · triple' : ''}`);
  push(v.doorStyle && v.doorStyle !== 'Flush' ? v.doorStyle : null);
  if (v.lowE) out.push('Low-E');
  if (v.argon) out.push('Argon');
  if (v.tempered) out.push('Tempered');
  push(v.screen && v.screen !== 'None' ? `${v.screen} screen` : null);
  if (v.extColour && v.extColour !== 'White') push(v.extColour);
  return out.slice(0, 4);
}

// ── Collapsed opening row ─────────────────────────────────────────
function OpeningRow({ index, op, price, open, onToggle, onEdit, onDup, onDel }) {
  const t = getType(op.typeId);
  const sz = sizeStr(op);
  const chips = summaryChips(op);
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${open ? C.blueLine : C.border}`, boxShadow: open ? '0 8px 24px rgba(37,99,235,0.10)' : '0 1px 2px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'transparent', border: 'none', textAlign: 'left' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{index}</div>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: C.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MiniDiagram typeId={op.typeId} size={36} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.sub} {t.cat === 'window' ? '' : ''}<span style={{ color: C.inkSoft, fontWeight: 600 }}>{(op.vals.qty || 1) > 1 ? ` × ${op.vals.qty}` : ''}</span></div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}{sz ? ` · ${sz}` : ''}{op.vals.room ? ` · ${op.vals.room}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{price}</div>
          <EBIcon name={open ? 'chev-u' : 'chev-d'} size={16} color={C.inkSoft} />
        </div>
      </button>
      {!open && chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 12px 70px' }}>
          {chips.map((c, i) => <span key={i} style={{ height: 21, padding: '0 8px', borderRadius: 6, background: C.bg, color: C.inkMid, fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>{c}</span>)}
        </div>
      )}
    </div>
  );
}

// ── Type picker sheet ─────────────────────────────────────────────
function TypePickerSheet({ open, current, onPick, onClose }) {
  const [q, setQ] = useState('');
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 75, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,0.32)' }} />
      <div style={{ position: 'relative', background: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 22, maxHeight: '82%', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.22)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: C.borderStrong, margin: '9px auto 4px' }} />
        <div style={{ padding: '6px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>Choose product type</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EBIcon name="x" size={16} color={C.inkMid} /></button>
        </div>
        <div style={{ padding: '0 18px 10px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><EBIcon name="search" size={16} color={C.inkSoft} /></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search types…" style={{ width: '100%', height: 42, padding: '0 12px 0 36px', borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div className="nsb" style={{ overflowY: 'auto', padding: '0 18px 4px' }}>
          {Object.entries(CATALOG).map(([cat, group]) => {
            const types = Object.entries(group.types).filter(([id, t]) => !q || t.name.toLowerCase().includes(q.toLowerCase()));
            if (!types.length) return null;
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 2px 9px' }}>
                  <EBIcon name={group.icon} size={15} color={C.inkSoft} />
                  <Kicker>{group.label}</Kicker>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  {types.map(([id, t]) => {
                    const sel = current === id;
                    return (
                      <button key={id} onClick={() => { onPick(id); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 11px', borderRadius: 13, border: `1px solid ${sel ? C.blue : C.border}`, background: sel ? C.blueSoft : C.card, textAlign: 'left' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: sel ? C.card : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MiniDiagram typeId={id} size={32} color={sel ? C.blue : C.inkMid} /></div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sel ? C.blueDeep : C.ink, lineHeight: 1.2 }}>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Builder header & footer ───────────────────────────────────────
function BuilderHeader({ client, count, total, step = 1, onBack }) {
  return (
    <div style={{ paddingTop: 50, background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
      <div style={{ padding: '10px 16px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><EBIcon name="back" size={20} color={C.inkMid} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Kicker style={{ fontSize: 9.5 }}>New estimate</Kicker>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em', marginTop: 1 }}>{client}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>{count} {count === 1 ? 'opening' : 'openings'}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{total}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, padding: '0 16px 12px' }}>
        {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < step ? C.ink : i === step ? C.blue : C.borderStrong }} />)}
      </div>
    </div>
  );
}

function BottomBar({ onBack, onContinue, ctaLabel = 'Continue', backLabel = 'Back' }) {
  return (
    <div style={{ flexShrink: 0, padding: '12px 16px 26px', background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
      <button onClick={onBack} style={{ height: 52, padding: '0 20px', borderRadius: 13, border: `1px solid ${C.borderStrong}`, background: C.card, color: C.inkMid, fontSize: 14.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EBIcon name="back" size={17} color={C.inkMid} />{backLabel}</button>
      <button onClick={onContinue} style={{ flex: 1, height: 52, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 22px rgba(37,99,235,0.32)' }}>{ctaLabel}<EBIcon name="chev-r" size={18} color="#fff" /></button>
    </div>
  );
}

// Collapsible section header (accordion)
function SectionTitle({ icon, label, count, open, onToggle, accent }) {
  return (
    <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 2px', background: 'transparent', border: 'none' }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: open ? C.blueSoft : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><EBIcon name={icon} size={16} color={open ? C.blue : C.inkMid} /></div>
      <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 800, color: C.ink, letterSpacing: '0.01em' }}>{label}</span>
      {count != null && <span style={{ fontSize: 11, fontWeight: 700, color: C.inkFaint }}>{count}</span>}
      <EBIcon name={open ? 'chev-u' : 'chev-d'} size={17} color={C.inkSoft} />
    </button>
  );
}

Object.assign(window, { MiniDiagram, sizeStr, summaryChips, OpeningRow, TypePickerSheet, BuilderHeader, BottomBar, SectionTitle });
