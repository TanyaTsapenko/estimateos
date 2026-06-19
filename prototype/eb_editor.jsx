// EstimateOS — Estimate Builder redesign · APP (editor layouts + phone app)
const { useState: useS } = React;

// ── Pricing — reads rules from SETTINGS (no hard-coded values) ────
function computePrice(op) {
  const v = op.vals;
  const { base, areaRatePerSqFt, addons } = SETTINGS.pricing;
  let p = base[op.typeId] || 800;
  const w = +(v.width || v.owidth || 32), h = +(v.height || v.oheight || 48);
  p += Math.round((w * h) / 144 * areaRatePerSqFt);
  if (v.pane === 'Triple') p += addons.triplePane;
  if (v.lowE) p += addons.lowE; if (v.argon) p += addons.argon; if (v.tempered) p += addons.tempered;
  if (v.grid && v.grid !== 'None') p += addons.grid;
  if (v.screen && v.screen !== 'None') p += addons.screen;
  if ((v.extColour && v.extColour !== 'White') || (v.doorExt && v.doorExt !== 'White')) p += addons.customColour;
  if (v.material === 'Wood' || v.doorMaterial === 'Wood') p += addons.wood;
  if (v.material === 'Fiberglass') p += addons.fiberglass;
  return p * (v.qty || 1);
}
function money(n) { return SETTINGS.currency + n.toLocaleString('en-CA'); }

// section grouping for an opening's fields
function groupSections(op) {
  const t = getType(op.typeId);
  return SECTIONS.map(s => ({ ...s, keys: t.fields.filter(k => F[k] && F[k].sec === s.id) })).filter(s => s.keys.length);
}

// Essentials block: type + subtype selectors (always present)
function EssentialsHead({ op, onType, onSub, openType }) {
  const t = getType(op.typeId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <FieldLabel>Product type</FieldLabel>
        <button onClick={openType} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 13, border: `1px solid ${C.blueLine}`, background: C.blueSoft, textAlign: 'left' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MiniDiagram typeId={op.typeId} size={36} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.ink }}>{t.name}</div>
            <div style={{ fontSize: 11.5, color: C.blueDeep, fontWeight: 600 }}>{getType(op.typeId).cat === 'window' ? 'Window' : 'Door'} · tap to change</div>
          </div>
          <EBIcon name="chev-r" size={18} color={C.blue} />
        </button>
      </div>
      <div>
        <FieldLabel>Subtype</FieldLabel>
        <SelectBox value={op.sub} onClick={() => onSub(t.subs)} />
      </div>
    </div>
  );
}

// ── Editor body, three layouts ────────────────────────────────────
function OpeningEditor({ op, layout, onVal, onType, onSub, openType, openPicker }) {
  const groups = groupSections(op);
  const basics = groups.find(g => g.id === 'basics');
  const rest = groups.filter(g => g.id !== 'basics');

  // ACCORDION — essentials + basics open; detail sections collapsible
  if (layout === 'accordion') {
    const [openSecs, setOpen] = useS(() => ({ [rest[0] && rest[0].id]: true }));
    const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }));
    return (
      <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <EssentialsHead op={op} onType={onType} onSub={() => onSub(getType(op.typeId).subs)} openType={openType} />
        <div style={{ height: 1, background: C.border, margin: '16px 0 6px' }} />
        {basics && <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px 12px' }}><EBIcon name={basics.icon} size={15} color={C.inkMid} /><Kicker>{basics.label}</Kicker></div>
          <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} />
        </>}
        <div style={{ marginTop: 8 }}>
          {rest.map((g, i) => (
            <div key={g.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <SectionTitle icon={g.icon} label={g.label} open={!!openSecs[g.id]} onToggle={() => toggle(g.id)} />
              {openSecs[g.id] && <div style={{ padding: '2px 0 18px' }}><FieldGrid keys={g.keys} op={op} onVal={onVal} openPicker={openPicker} /></div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // TABS — segmented section tabs, short body per tab
  if (layout === 'tabs') {
    const [tab, setTab] = useS('basics');
    const active = groups.find(g => g.id === tab) || groups[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="nsb" style={{ display: 'flex', gap: 7, padding: '12px 16px', overflowX: 'auto', borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
          {groups.map(g => {
            const on = g.id === active.id;
            return (
              <button key={g.id} onClick={() => setTab(g.id)} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', borderRadius: 99, border: `1px solid ${on ? C.blue : C.border}`, background: on ? C.blue : C.card, color: on ? '#fff' : C.inkMid, fontSize: 12.5, fontWeight: 700 }}>
                <EBIcon name={g.icon} size={14} color={on ? '#fff' : C.inkSoft} />{g.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
        <div className="nsb" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
          {active.id === 'basics' && <><EssentialsHead op={op} onType={onType} onSub={() => onSub(getType(op.typeId).subs)} openType={openType} /><div style={{ height: 1, background: C.border, margin: '16px 0' }} /></>}
          <FieldGrid keys={active.keys} op={op} onVal={onVal} openPicker={openPicker} />
        </div>
      </div>
    );
  }

  // WIZARD — step 1 essentials, step 2 specs
  const [wstep, setW] = useS(1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        {[{ n: 1, l: 'Essentials' }, { n: 2, l: 'Specifications' }].map(s => (
          <button key={s.n} onClick={() => setW(s.n)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: wstep === s.n ? C.blueSoft : 'transparent', color: wstep === s.n ? C.blueDeep : C.inkSoft, fontSize: 12.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: 99, background: wstep === s.n ? C.blue : C.borderStrong, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>{s.l}
          </button>
        ))}
      </div>
      <div className="nsb" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 24px' }}>
        {wstep === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <EssentialsHead op={op} onType={onType} onSub={() => onSub(getType(op.typeId).subs)} openType={openType} />
            <div style={{ height: 1, background: C.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><EBIcon name={basics.icon} size={15} color={C.inkMid} /><Kicker>{basics.label}</Kicker></div>
            <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} />
            <button onClick={() => setW(2)} style={{ height: 50, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>Next: specifications<EBIcon name="chev-r" size={17} color="#fff" /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {rest.map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}><EBIcon name={g.icon} size={15} color={C.inkMid} /><Kicker>{g.label}</Kicker></div>
                <FieldGrid keys={g.keys} op={op} onVal={onVal} openPicker={openPicker} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { computePrice, money, groupSections, EssentialsHead, OpeningEditor });
