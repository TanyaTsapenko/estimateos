// EstimateOS — Estimate Builder redesign · PhoneApp + Stage
const { useState: useState2 } = React;

function seedOpenings() {
  const a = makeOpening('casement', 0);
  a.vals.width = '32'; a.vals.height = '48'; a.vals.room = 'Living room'; a.vals.openDir = 'Left'; a.vals.handle = 'Standard';
  const b = makeOpening('entry', 0);
  b.vals.width = '36'; b.vals.height = '80'; b.vals.doorStyle = '6-panel'; b.vals.swing = 'Left hand'; b.vals.inOut = 'In-swing'; b.vals.glassInsert = '3/4 lite'; b.vals.doorExt = 'Black';
  return [a, b];
}

function PhoneApp({ layout }) {
  const [ops, setOps] = useState2(seedOpenings);
  const [mode, setMode] = useState2('edit');     // 'list' | 'edit'
  const [idx, setIdx] = useState2(0);
  const [picker, setPicker] = useState2(null);   // {def,value,onPick}
  const [typeOpen, setTypeOpen] = useState2(false);

  const total = ops.reduce((s, o) => s + computePrice(o), 0);
  const op = ops[idx];

  const setVal = (k, val) => setOps(list => list.map((o, i) => i === idx ? { ...o, vals: { ...o.vals, [k]: val } } : o));
  const openPicker = (k, def, value, onPick) => setPicker({ def, value, onPick });
  const openSubPicker = (subs) => setPicker({ def: { label: 'Subtype', opts: subs }, value: op.sub, onPick: (s) => setOps(list => list.map((o, i) => i === idx ? { ...o, sub: s } : o)) });
  const changeType = (typeId) => setOps(list => list.map((o, i) => {
    if (i !== idx) return o;
    const fresh = makeOpening(typeId, 0);
    ['width', 'height', 'owidth', 'oheight', 'qty', 'room', 'floor'].forEach(k => { if (o.vals[k] != null && (k in fresh.vals || true)) fresh.vals[k] = o.vals[k]; });
    return fresh;
  }));

  const addOpening = () => { const n = makeOpening('casement', 0); setOps(l => [...l, n]); setIdx(ops.length); setMode('edit'); };
  const dupOpening = (i) => { setOps(l => { const c = JSON.parse(JSON.stringify(l[i])); const nl = [...l]; nl.splice(i + 1, 0, c); return nl; }); };
  const delOpening = (i) => { setOps(l => l.length > 1 ? l.filter((_, j) => j !== i) : l); if (idx >= ops.length - 1) setIdx(Math.max(0, idx - 1)); };

  const editing = mode === 'edit' && op;

  return (
    <EBPhone>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <BuilderHeader client="iВа Renovations" count={ops.length} total={money(total)} step={1}
          onBack={() => mode === 'edit' ? setMode('list') : null} />

        {mode === 'list' && (
          <div className="nsb" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.blueSoft, border: `1px solid ${C.blueLine}`, borderRadius: 13, padding: '11px 13px', marginBottom: 14 }}>
              <EBIcon name="win" size={18} color={C.blue} />
              <span style={{ fontSize: 12.5, color: C.inkMid, fontWeight: 600, lineHeight: 1.4 }}>Add each window or door as its own opening. Tap a row to edit.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ops.map((o, i) => (
                <OpeningRow key={i} index={i + 1} op={o} price={money(computePrice(o))} open={false}
                  onToggle={() => { setIdx(i); setMode('edit'); }} />
              ))}
            </div>
            <button onClick={addOpening} style={{ width: '100%', marginTop: 12, height: 50, borderRadius: 13, border: `1.5px dashed ${C.blueLine}`, background: C.card, color: C.blue, fontSize: 14.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><EBIcon name="plus" size={18} color={C.blue} />Add opening</button>
          </div>
        )}

        {editing && (
          <>
            {/* edit sub-header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={() => setMode('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.inkMid, fontSize: 13.5, fontWeight: 700, padding: 0 }}><EBIcon name="back" size={18} color={C.inkMid} />All openings</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>Opening {idx + 1} / {ops.length}</span>
              <button onClick={() => dupOpening(idx)} title="Duplicate" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EBIcon name="dup" size={15} color={C.inkMid} /></button>
              <button onClick={() => { delOpening(idx); setMode('list'); }} title="Delete" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EBIcon name="trash" size={15} color={C.red} /></button>
            </div>
            <div className="nsb" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <OpeningEditor op={op} layout={layout} onVal={setVal} onType={changeType} onSub={openSubPicker} openType={() => setTypeOpen(true)} openPicker={openPicker} />
            </div>
            <div style={{ flexShrink: 0, padding: '11px 16px 24px', background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: C.inkSoft, textTransform: 'uppercase' }}>This opening</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{money(computePrice(op))}</div>
              </div>
              <button onClick={() => setMode('list')} style={{ flex: 1, height: 50, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 22px rgba(37,99,235,0.30)' }}><EBIcon name="check" size={18} color="#fff" />Save opening</button>
            </div>
          </>
        )}

        <PickerSheet picker={picker} onClose={() => setPicker(null)} />
        <TypePickerSheet open={typeOpen} current={op && op.typeId} onPick={changeType} onClose={() => setTypeOpen(false)} />
      </div>
    </EBPhone>
  );
}

// ── Stage: 3 phones side by side ──────────────────────────────────
const VARIANTS = [
  { key: 'accordion', tag: 'A', name: 'Smart accordion', desc: 'One scroll. Essentials always open; spec sections collapse so you only open what you need.', best: 'Familiar — closest to today, far less clutter.' },
  { key: 'tabs', tag: 'B', name: 'Section tabs', desc: 'Basics / Look / Glass / Install / Operation as tabs. Each screen is short — almost no scrolling.', best: 'Fastest to jump straight to one spec.' },
  { key: 'wizard', tag: 'C', name: 'Two-step', desc: 'Step 1 essentials (type, size, qty) → Step 2 the rest. Add an opening in seconds, refine later.', best: 'Best for speed on-site.' },
];

function Stage() {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% -10%, #20283A 0%, #141925 55%, #0E121B 100%)', padding: '44px 30px 60px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto 38px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7E8BA8' }}>EstimateOS · Estimate builder redesign</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: '12px 0 10px' }}>One opening, only its fields</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#AEB8CC', maxWidth: 720, margin: '0 auto' }}>
          Each product type shows <b style={{ color: '#fff' }}>only the fields that apply to it</b> — a Casement gets opening direction &amp; handle, a Picture window doesn't, a door gets swing &amp; lockset. Smart defaults are pre-filled; the collapsed list shows only what you set. Three layouts for the single-opening editor — try each, then tell me which to ship.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 34, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {VARIANTS.map(v => (
          <div key={v.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: EB_W }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: C.blue, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.tag}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{v.name}</span>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#9AA5BC', textAlign: 'center', margin: '4px 0 6px', minHeight: 56 }}>{v.desc}</p>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#5C9DFF', marginBottom: 16 }}>{v.best}</div>
            <PhoneApp layout={v.key} />
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Stage />);
