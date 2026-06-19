// EstimateOS — Estimate Builder · TWO-STEP (shipping direction)
const { useState: useT } = React;

// Section type / direction options for the Combination builder
const COMBO_TYPES = ['Fixed', 'Casement L', 'Casement R', 'Awning', 'Slider'];
const COMBO_DIRS = ['Fixed', 'Left', 'Right'];

function CombinationBuilder({ sections, onChange, openPicker }) {
  const set = (i, key, val) => onChange(sections.map((s, j) => j === i ? { ...s, [key]: val } : s));
  const add = () => onChange([...sections, { type: 'Fixed', width: '', dir: 'Fixed' }]);
  const del = (i) => onChange(sections.filter((_, j) => j !== i));
  return (
    <div>
      <FieldLabel>Sections — left to right</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: '10px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: C.blueSoft, color: C.blue, fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.inkMid }}>Section {i + 1}</span>
              {sections.length > 1 && <button onClick={() => del(i)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EBIcon name="x" size={15} color={C.inkFaint} /></button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
              <button onClick={() => openPicker({ label: 'Section type', opts: COMBO_TYPES }, s.type, v => set(i, 'type', v))} style={selBtn}>{s.type}<EBIcon name="chev-d" size={14} color={C.inkSoft} /></button>
              <div style={{ position: 'relative' }}>
                <input value={s.width} placeholder="Width" inputMode="decimal" onChange={e => set(i, 'width', e.target.value)} style={{ width: '100%', height: 40, padding: '0 28px 0 11px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 13.5, fontWeight: 600, color: C.ink, outline: 'none' }} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11.5, color: C.inkFaint }}>in</span>
              </div>
            </div>
            <button onClick={() => openPicker({ label: 'Opening direction', opts: COMBO_DIRS }, s.dir, v => set(i, 'dir', v))} style={{ ...selBtn, width: '100%', marginTop: 8 }}>{s.dir === 'Fixed' ? 'Fixed (no opening)' : `Opens ${s.dir.toLowerCase()}`}<EBIcon name="chev-d" size={14} color={C.inkSoft} /></button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ width: '100%', marginTop: 9, height: 42, borderRadius: 11, border: `1.5px dashed ${C.blueLine}`, background: C.card, color: C.blue, fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><EBIcon name="plus" size={15} color={C.blue} />Add section</button>
    </div>
  );
}
const selBtn = { height: 40, padding: '0 11px', borderRadius: 10, border: `1px solid ${C.borderStrong}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 13.5, fontWeight: 600, color: C.ink, textAlign: 'left' };

function seedTwoStep() {
  const a = makeOpening('casement', 0);
  a.vals.width = '32'; a.vals.height = '48'; a.vals.room = 'Living room'; a.vals.openDir = 'Left'; a.vals.handle = 'Standard';
  const b = makeOpening('entry', 0);
  b.vals.width = '36'; b.vals.height = '80'; b.vals.doorStyle = '6-panel'; b.vals.swing = 'Left hand'; b.vals.inOut = 'In-swing'; b.vals.glassInsert = '3/4 lite'; b.vals.doorExt = 'Black';
  return [a, b];
}

function TwoStepApp() {
  const [ops, setOps] = useT(seedTwoStep);
  const [mode, setMode] = useT('list');     // list | edit
  const [idx, setIdx] = useT(0);
  const [step, setStep] = useT(1);          // 1 essentials | 2 specs
  const [picker, setPicker] = useT(null);
  const [typeOpen, setTypeOpen] = useT(false);

  const total = ops.reduce((s, o) => s + computePrice(o), 0);
  const op = ops[idx];

  const setVal = (k, val) => setOps(l => l.map((o, i) => i === idx ? { ...o, vals: { ...o.vals, [k]: val } } : o));
  const setSections = (next) => setOps(l => l.map((o, i) => i === idx ? { ...o, sections: next } : o));
  const openPicker = (def, value, onPick) => setPicker({ def, value, onPick });
  const fieldPicker = (k, def, value, onPick) => setPicker({ def, value, onPick });
  const openSub = (subs) => setPicker({ def: { label: 'Subtype', opts: subs }, value: op.sub, onPick: s => setOps(l => l.map((o, i) => i === idx ? { ...o, sub: s } : o)) });
  const changeType = (typeId) => setOps(l => l.map((o, i) => {
    if (i !== idx) return o;
    const fresh = makeOpening(typeId, 0);
    ['width', 'height', 'owidth', 'oheight', 'qty', 'room', 'floor'].forEach(k => { if (o.vals[k] != null) fresh.vals[k] = o.vals[k]; });
    if (getType(typeId).sectionBuilder && (!fresh.sections || !fresh.sections.length)) fresh.sections = [{ type: 'Fixed', width: '', dir: 'Fixed' }, { type: 'Casement L', width: '', dir: 'Left' }];
    return fresh;
  }));

  const startEdit = (i) => { setIdx(i); setStep(1); setMode('edit'); };
  const addOpening = () => { const n = makeOpening('casement', 0); setOps(l => [...l, n]); setIdx(ops.length); setStep(1); setMode('edit'); };
  const dupOpening = (i) => setOps(l => { const c = JSON.parse(JSON.stringify(l[i])); const nl = [...l]; nl.splice(i + 1, 0, c); return nl; });
  const delOpening = (i) => { setOps(l => l.length > 1 ? l.filter((_, j) => j !== i) : l); setMode('list'); };

  const groups = op ? groupSections(op) : [];
  const basics = groups.find(g => g.id === 'basics');
  const rest = groups.filter(g => g.id !== 'basics');
  const valid = op ? step1Valid(op) : false;
  const t = op && getType(op.typeId);

  return (
    <EBPhone>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <BuilderHeader client="iВа Renovations" count={ops.length} total={money(total)} step={1} onBack={() => setMode('list')} />

        {mode === 'list' && (
          <>
            <div className="nsb" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.blueSoft, border: `1px solid ${C.blueLine}`, borderRadius: 13, padding: '11px 13px', marginBottom: 14 }}>
                <EBIcon name="win" size={18} color={C.blue} />
                <span style={{ fontSize: 12.5, color: C.inkMid, fontWeight: 600, lineHeight: 1.4 }}>Add each window or door as its own opening. Tap to edit.</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ops.map((o, i) => <OpeningRow key={i} index={i + 1} op={o} price={money(computePrice(o))} open={false} onToggle={() => startEdit(i)} />)}
              </div>
              <button onClick={addOpening} style={{ width: '100%', marginTop: 12, height: 50, borderRadius: 13, border: `1.5px dashed ${C.blueLine}`, background: C.card, color: C.blue, fontSize: 14.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><EBIcon name="plus" size={18} color={C.blue} />Add opening</button>
            </div>
            <div style={{ flexShrink: 0, padding: '12px 16px 26px', background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
              <button style={{ height: 52, padding: '0 20px', borderRadius: 13, border: `1px solid ${C.borderStrong}`, background: C.card, color: C.inkMid, fontSize: 14.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EBIcon name="back" size={17} color={C.inkMid} />Back</button>
              <button style={{ flex: 1, height: 52, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 22px rgba(37,99,235,0.32)' }}>Review estimate<EBIcon name="chev-r" size={18} color="#fff" /></button>
            </div>
          </>
        )}

        {mode === 'edit' && op && (
          <>
            {/* sub-header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={() => setMode('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: C.inkMid, fontSize: 13.5, fontWeight: 700, padding: 0 }}><EBIcon name="back" size={18} color={C.inkMid} />Openings</button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>{idx + 1} / {ops.length}</span>
              <button onClick={() => dupOpening(idx)} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EBIcon name="dup" size={15} color={C.inkMid} /></button>
              <button onClick={() => delOpening(idx)} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EBIcon name="trash" size={15} color={C.red} /></button>
            </div>
            {/* step pills */}
            <div style={{ display: 'flex', gap: 8, padding: '11px 16px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {[{ n: 1, l: 'Essentials' }, { n: 2, l: 'Specifications' }].map(s => {
                const on = step === s.n, done = s.n === 1 && valid && step === 2;
                return (
                  <button key={s.n} onClick={() => { if (s.n === 2 && !valid) return; setStep(s.n); }} style={{ flex: 1, padding: '9px 0', borderRadius: 11, border: `1px solid ${on ? C.blueLine : 'transparent'}`, background: on ? C.blueSoft : C.bg, color: on ? C.blueDeep : C.inkSoft, fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: (s.n === 2 && !valid) ? 0.55 : 1 }}>
                    <span style={{ width: 19, height: 19, borderRadius: 99, background: on ? C.blue : (done ? C.green : C.borderStrong), color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{done ? <EBIcon name="check" size={12} color="#fff" /> : s.n}</span>{s.l}
                  </button>
                );
              })}
            </div>

            <div className="nsb" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 22px' }}>
              {step === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <EssentialsHead op={op} onType={changeType} onSub={() => openSub(t.subs)} openType={() => setTypeOpen(true)} />
                  <div style={{ height: 1, background: C.border }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><EBIcon name={basics.icon} size={15} color={C.inkMid} /><Kicker>{basics.label}</Kicker></div>
                  <FieldGrid keys={basics.keys} op={op} onVal={setVal} openPicker={fieldPicker} />
                  {t.sectionBuilder && <CombinationBuilder sections={op.sections || []} onChange={setSections} openPicker={openPicker} />}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {rest.map(g => (
                    <div key={g.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}><EBIcon name={g.icon} size={15} color={C.inkMid} /><Kicker>{g.label}</Kicker></div>
                      <FieldGrid keys={g.keys} op={op} onVal={setVal} openPicker={fieldPicker} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* footer */}
            <div style={{ flexShrink: 0, background: C.card, borderTop: `1px solid ${C.border}` }}>
              {step === 1 && !valid && (
                <div style={{ padding: '8px 16px 0', fontSize: 11.5, color: C.amber, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><EBIcon name="ruler" size={14} color={C.amber} />Enter width &amp; height to continue</div>
              )}
              <div style={{ padding: '11px 16px 24px', display: 'flex', alignItems: 'center', gap: 11 }}>
                {step === 1 ? (
                  <>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.inkSoft, textTransform: 'uppercase' }}>This opening</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{money(computePrice(op))}</div>
                    </div>
                    <button disabled={!valid} onClick={() => valid && setStep(2)} style={{ flex: 1, height: 50, borderRadius: 13, border: 'none', background: valid ? C.blue : '#C5CDDC', color: '#fff', fontSize: 15, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: valid ? '0 10px 22px rgba(37,99,235,0.30)' : 'none', cursor: valid ? 'pointer' : 'not-allowed' }}>Next: specs<EBIcon name="chev-r" size={17} color="#fff" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setStep(1)} style={{ height: 50, padding: '0 16px', borderRadius: 13, border: `1px solid ${C.borderStrong}`, background: C.card, color: C.inkMid, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}><EBIcon name="back" size={16} color={C.inkMid} />Essentials</button>
                    <button onClick={() => setMode('list')} style={{ flex: 1, height: 50, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 10px 22px rgba(37,99,235,0.30)' }}><EBIcon name="check" size={18} color="#fff" />Save · {money(computePrice(op))}</button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <PickerSheet picker={picker} onClose={() => setPicker(null)} />
        <TypePickerSheet open={typeOpen} current={op && op.typeId} onPick={changeType} onClose={() => setTypeOpen(false)} />
      </div>
    </EBPhone>
  );
}

function TwoStepStage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', background: 'radial-gradient(circle at 50% -8%, #20283A 0%, #141925 55%, #0E121B 100%)', padding: '40px 20px 60px' }}>
      <div style={{ textAlign: 'center', color: '#fff', marginBottom: 30, maxWidth: 560 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7E8BA8' }}>EstimateOS · Estimate builder</div>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.03em', margin: '11px 0 9px' }}>Two-step opening editor</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#AEB8CC', margin: 0 }}>Step 1 captures the essentials — type, subtype, size, room. Step 2 holds every spec, grouped and showing only the fields that apply to this product type. Tap a row to edit, or add a new opening.</p>
      </div>
      <TwoStepApp />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TwoStepStage />);
