// EstimateOS — Estimate Builder redesign · SHARED UI
const { useState } = React;

// ── Phone frame ───────────────────────────────────────────────────
const EB_W = 390, EB_H = 844;
function EBPhone({ children }) {
  return (
    <div style={{ width: EB_W, height: EB_H, borderRadius: 46, overflow: 'hidden', position: 'relative', background: C.bg,
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 22, background: '#000', zIndex: 60 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 30px 0', height: 50, pointerEvents: 'none', color: C.ink }}>
        <span style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="17" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="0.6" fill="currentColor"/><rect x="4.5" y="5" width="3" height="6" rx="0.6" fill="currentColor"/><rect x="9" y="3" width="3" height="8" rx="0.6" fill="currentColor"/><rect x="13.5" y="0" width="3" height="11" rx="0.6" fill="currentColor"/></svg>
          <svg width="25" height="11" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" fill="none" strokeOpacity="0.4"/><rect x="2" y="2" width="19" height="8" rx="1.8" fill="currentColor"/></svg>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Small primitives ──────────────────────────────────────────────
function Kicker({ children, color = C.inkSoft, style }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color, ...style }}>{children}</div>;
}

function FieldLabel({ children, optional }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkSoft }}>{children}</span>
      {optional && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.inkFaint, textTransform: 'none', letterSpacing: 0 }}>Optional</span>}
    </div>
  );
}

function fieldPalette(name) { return name === 'hw' ? HW_COLOURS : FRAME_COLOURS; }

// Selectable value box that opens the picker sheet
function SelectBox({ value, placeholder, onClick }) {
  const empty = value == null || value === '';
  return (
    <button onClick={onClick} style={{ width: '100%', height: 46, padding: '0 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left' }}>
      <span style={{ fontSize: 14.5, fontWeight: empty ? 500 : 600, color: empty ? C.inkFaint : C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empty ? (placeholder || 'Select…') : value}</span>
      <EBIcon name="chev-d" size={16} color={C.inkSoft} />
    </button>
  );
}

function DimInput({ value, unit, ph, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <input value={value || ''} placeholder={ph} inputMode="decimal" onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 46, padding: '0 34px 0 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 15.5, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums', outline: 'none' }} />
      <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: C.inkFaint }}>{unit}</span>
    </div>
  );
}

function Stepper({ value = 1, onChange }) {
  const btn = { width: 44, height: 44, borderRadius: 11, border: `1px solid ${C.borderStrong}`, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(Math.max(1, (value || 1) - 1))} style={btn}><EBIcon name="minus" size={17} color={C.inkMid} /></button>
      <div style={{ minWidth: 40, textAlign: 'center', fontSize: 19, fontWeight: 800, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{value || 1}</div>
      <button onClick={() => onChange((value || 1) + 1)} style={{ ...btn, borderColor: C.blue, background: C.blueSoft }}><EBIcon name="plus" size={17} color={C.blue} /></button>
    </div>
  );
}

function Toggle({ on, onChange, label, sub }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 12, border: `1px solid ${on ? C.blueLine : C.border}`, background: on ? C.blueSoft : C.card, textAlign: 'left' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ width: 44, height: 26, borderRadius: 99, background: on ? C.blue : '#D7DCE5', position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .15s' }} />
      </div>
    </button>
  );
}

function Swatches({ palette, value, onChange }) {
  const list = fieldPalette(palette);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
      {list.map(c => {
        const sel = value === c.id;
        return (
          <button key={c.id} onClick={() => onChange(c.id)} title={c.id}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52, background: 'transparent', border: 'none', padding: 0 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: c.hex, boxShadow: sel ? `0 0 0 2px ${C.blue}, 0 0 0 4px ${C.card}` : (c.ring ? `inset 0 0 0 1px ${C.borderStrong}` : 'none'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sel && <EBIcon name="check" size={16} color={c.hex === '#FFFFFF' || c.hex === '#D7DBDF' || c.hex === '#ECE3CE' || c.hex === '#B8BCC0' ? C.blue : '#fff'} />}
            </span>
            <span style={{ fontSize: 9.5, fontWeight: sel ? 700 : 500, color: sel ? C.ink : C.inkSoft, textAlign: 'center', lineHeight: 1.15 }}>{c.id}</span>
          </button>
        );
      })}
    </div>
  );
}

function PhotosField({ count = 0, onAdd }) {
  return (
    <div style={{ display: 'flex', gap: 9 }}>
      <button onClick={onAdd} style={{ width: 70, height: 70, borderRadius: 12, border: `1.5px dashed ${C.borderStrong}`, background: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: C.inkSoft }}>
        <EBIcon name="camera" size={20} color={C.inkSoft} /><span style={{ fontSize: 10, fontWeight: 700 }}>Add</span>
      </button>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: 70, height: 70, borderRadius: 12, background: `repeating-linear-gradient(135deg, ${C.blueSoft} 0 7px, #E4ECFF 7px 14px)`, border: `1px solid ${C.border}` }} />
      ))}
    </div>
  );
}

function NotesField({ value, onChange }) {
  return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Anything the installer should know…" rows={3}
      style={{ width: '100%', padding: '11px 13px', borderRadius: 12, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 14, fontWeight: 500, color: C.ink, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
  );
}

// One field control (label + input), dispatching by kind.
function FieldControl({ k, op, onVal, openPicker }) {
  const def = F[k];
  if (!def) return null;
  const v = op.vals[k];
  switch (def.kind) {
    case 'qty':
      return (<div><FieldLabel>{def.label}</FieldLabel><Stepper value={v} onChange={x => onVal(k, x)} /></div>);
    case 'dim':
      return (<div><FieldLabel>{def.label}</FieldLabel><DimInput value={v} unit={def.unit} ph={def.ph} onChange={x => onVal(k, x)} /></div>);
    case 'select':
      return (<div><FieldLabel optional={def.optional}>{def.label}</FieldLabel><SelectBox value={v} placeholder={def.optional ? 'Not set' : 'Select…'} onClick={() => openPicker(k, def, v, x => onVal(k, x))} /></div>);
    case 'color':
      return (<div><FieldLabel>{def.label}</FieldLabel><Swatches palette={def.palette} value={v} onChange={x => onVal(k, x)} /></div>);
    case 'toggle':
      return <Toggle on={!!v} onChange={x => onVal(k, x)} label={def.label} sub={def.sub} />;
    case 'photos':
      return (<div><FieldLabel>{def.label}</FieldLabel><PhotosField count={v || 0} onAdd={() => onVal(k, (v || 0) + 1)} /></div>);
    case 'notes':
      return (<div><FieldLabel>{def.label}</FieldLabel><NotesField value={v} onChange={x => onVal(k, x)} /></div>);
    default: return null;
  }
}

// Render a list of field keys, pairing consecutive half-width controls.
function FieldGrid({ keys, op, onVal, openPicker, gap = 16 }) {
  const rows = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i], def = F[k];
    const next = keys[i + 1], nextDef = next && F[next];
    if (def && def.half && nextDef && nextDef.half) {
      rows.push(
        <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FieldControl k={k} op={op} onVal={onVal} openPicker={openPicker} />
          <FieldControl k={next} op={op} onVal={onVal} openPicker={openPicker} />
        </div>
      );
      i++;
    } else {
      rows.push(<FieldControl key={k} k={k} op={op} onVal={onVal} openPicker={openPicker} />);
    }
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{rows}</div>;
}

// ── Picker bottom sheet (rendered inside the phone) ───────────────
function PickerSheet({ picker, onClose }) {
  if (!picker) return null;
  const { def, value, onPick } = picker;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,0.32)' }} />
      <div style={{ position: 'relative', background: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '8px 0 24px', maxHeight: '64%', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: C.borderStrong, margin: '8px auto 6px' }} />
        <div style={{ padding: '6px 20px 12px', fontSize: 15, fontWeight: 800, color: C.ink }}>{def.label}</div>
        <div className="nsb" style={{ overflowY: 'auto', padding: '0 12px' }}>
          {def.opts.map(o => {
            const sel = value === o;
            return (
              <button key={o} onClick={() => { onPick(o); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderRadius: 12, border: 'none', background: sel ? C.blueSoft : 'transparent', textAlign: 'left' }}>
                <span style={{ fontSize: 15, fontWeight: sel ? 700 : 500, color: sel ? C.blueDeep : C.ink }}>{o}</span>
                {sel && <EBIcon name="check" size={18} color={C.blue} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EB_W, EB_H, EBPhone, Kicker, FieldLabel, SelectBox, DimInput, Stepper, Toggle, Swatches, PhotosField, NotesField, FieldControl, FieldGrid, PickerSheet, fieldPalette });
