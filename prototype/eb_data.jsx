// EstimateOS — Estimate Builder redesign · DATA MODEL
// Type catalog + field registry. Each product type declares only the fields
// relevant to it; the editor renders exactly those, grouped into sections.

const C = {
  bg: '#F4F6FB', card: '#FFFFFF',
  border: 'rgba(15,23,42,0.08)', borderStrong: 'rgba(15,23,42,0.13)',
  ink: '#0B1220', inkMid: '#475467', inkSoft: '#8A94A6', inkFaint: '#B3BAC6',
  blue: '#2563EB', blueDeep: '#1D4ED8', blueSoft: '#EEF3FF', blueLine: '#DCE6FF',
  green: '#0F8A4D', greenSoft: '#E7F6EE',
  amber: '#B7791F', amberSoft: '#FFF6E5',
  red: '#C0341A', redSoft: '#FBE9E4',
};

function EBIcon({ name, size = 16, color = 'currentColor', stroke = 1.7 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'back': return <svg {...p} strokeWidth="2"><path d="M15 6l-6 6 6 6"/></svg>;
    case 'plus': return <svg {...p} strokeWidth="2.3"><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus': return <svg {...p} strokeWidth="2.3"><path d="M5 12h14"/></svg>;
    case 'check': return <svg {...p} strokeWidth="2.4"><path d="M5 12l4 4 10-10"/></svg>;
    case 'chev-r': return <svg {...p} strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>;
    case 'chev-d': return <svg {...p} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>;
    case 'chev-u': return <svg {...p} strokeWidth="2"><path d="M6 15l6-6 6 6"/></svg>;
    case 'copy': return <svg {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>;
    case 'trash': return <svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg>;
    case 'edit': return <svg {...p}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>;
    case 'camera': return <svg {...p}><path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.2"/></svg>;
    case 'note': return <svg {...p}><path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M9 12h6M9 16h4"/></svg>;
    case 'ruler': return <svg {...p}><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>;
    case 'paint': return <svg {...p}><path d="M4 5a2 2 0 012-2h9a2 2 0 012 2v4a2 2 0 01-2 2H8v3a3 3 0 11-2 2.8"/></svg>;
    case 'glass': return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 9h14M12 3v18"/></svg>;
    case 'tool': return <svg {...p}><path d="M14 7a4 4 0 01-5 5l-5 5 2 2 5-5a4 4 0 005-5l-2 2-2-2 2-2z"/></svg>;
    case 'gear': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>;
    case 'door': return <svg {...p}><path d="M5 21V4a1 1 0 011-1h9a1 1 0 011 1v17M5 21h13M14 12h.01"/></svg>;
    case 'win': return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M4 12h16M12 3v18"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
    case 'x': return <svg {...p} strokeWidth="2"><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'dup': return <svg {...p}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/></svg>;
    default: return null;
  }
}

// ══════════════════════════════════════════════════════════════════
//  ⚙️  APP SETTINGS  —  single source of truth for pricing & palettes
//  In production, hydrate this object from the contractor's account
//  settings (their price list + the colours they offer). Nothing in
//  the UI hard-codes a price or a colour — it all reads from here.
// ══════════════════════════════════════════════════════════════════
const SETTINGS = {
  currency: 'CA$',
  taxLabel: 'HST (15%)',
  taxRate: 0.15,
  validDays: 30,

  // Colours offered to clients (per the contractor's catalog)
  palettes: {
    frame: [
      { id: 'White', hex: '#FFFFFF', ring: true },
      { id: 'Almond', hex: '#ECE3CE' },
      { id: 'Sandstone', hex: '#C9B79C' },
      { id: 'Commercial Brown', hex: '#46382C' },
      { id: 'Charcoal', hex: '#36383B' },
      { id: 'Black', hex: '#1A1A1A' },
      { id: 'Forest Green', hex: '#2E4034' },
      { id: 'Brick Red', hex: '#7A2E22' },
    ],
    hardware: [
      { id: 'White', hex: '#FFFFFF', ring: true },
      { id: 'Black', hex: '#1A1A1A' },
      { id: 'Brushed Nickel', hex: '#B8BCC0' },
      { id: 'Satin Brass', hex: '#C2A14D' },
      { id: 'Oil-Rubbed Bronze', hex: '#3B2F28' },
      { id: 'Chrome', hex: '#D7DBDF' },
    ],
  },

  // Pricing rules — base price per type + size factor + option add-ons
  pricing: {
    base: { casement: 980, awning: 920, picture: 640, slider: 760, singleHung: 700, doubleHung: 820, hopper: 540, tiltTurn: 1240, bay: 2600, bow: 3200, combination: 1800, special: 1100, entry: 2400, doubleEntry: 3900, french: 2900, garden: 2600, patio: 2800, storm: 680 },
    areaRatePerSqFt: 26,   // added per square foot of opening
    addons: { triplePane: 180, lowE: 90, argon: 60, tempered: 75, grid: 95, screen: 70, customColour: 120, wood: 340, fiberglass: 160 },
  },
};

// Derived references used across the UI (kept in sync with SETTINGS)
const FRAME_COLOURS = SETTINGS.palettes.frame;
const HW_COLOURS = SETTINGS.palettes.hardware;

// ── Sections ──────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'basics',   label: 'Size & location',     icon: 'ruler' },
  { id: 'look',     label: 'Appearance',          icon: 'paint' },
  { id: 'glass',    label: 'Glass & performance',  icon: 'glass' },
  { id: 'install',  label: 'Installation',         icon: 'tool' },
  { id: 'config',   label: 'Operation & hardware', icon: 'gear' },
  { id: 'notes',    label: 'Notes & photos',       icon: 'note' },
];

// ── Field registry — single source of truth ───────────────────────
// kind: dim | qty | select | toggle | color | text | photos | notes
const F = {
  width:     { label: 'Width',  kind: 'dim', unit: 'in', sec: 'basics', ph: '32', half: true },
  height:    { label: 'Height', kind: 'dim', unit: 'in', sec: 'basics', ph: '48', half: true },
  owidth:    { label: 'Overall width',  kind: 'dim', unit: 'in', sec: 'basics', ph: '96', half: true },
  oheight:   { label: 'Overall height', kind: 'dim', unit: 'in', sec: 'basics', ph: '60', half: true },
  qty:       { label: 'Quantity', kind: 'qty', sec: 'basics' },
  room:      { label: 'Room', kind: 'select', sec: 'basics', optional: true, half: true,
               opts: ['Living room', 'Kitchen', 'Primary bed', 'Bedroom', 'Bathroom', 'Basement', 'Office', 'Hallway'] },
  floor:     { label: 'Floor', kind: 'select', sec: 'basics', half: true,
               opts: ['Ground floor', '2nd floor', '3rd floor', 'Basement'] },
  numSections:{ label: 'Number of sections', kind: 'select', sec: 'basics', opts: ['4', '5', '6', '7'] },
  sideUnit:  { label: 'Side unit type', kind: 'select', sec: 'basics', opts: ['Casement', 'Fixed', 'Awning'] },
  seatBoard: { label: 'Seat board', kind: 'toggle', sec: 'basics', sub: 'Interior sill board' },
  headBoard: { label: 'Head board', kind: 'toggle', sec: 'basics', sub: 'Interior top board' },
  numPanels: { label: 'Number of panels', kind: 'select', sec: 'basics', opts: ['2', '3', '4'] },

  extColour: { label: 'Exterior colour', kind: 'color', sec: 'look', palette: 'frame' },
  intColour: { label: 'Interior colour', kind: 'color', sec: 'look', palette: 'frame' },
  doorExt:   { label: 'Exterior colour', kind: 'color', sec: 'look', palette: 'frame' },
  doorInt:   { label: 'Interior colour', kind: 'color', sec: 'look', palette: 'frame' },
  colour:    { label: 'Colour', kind: 'color', sec: 'look', palette: 'frame' },
  grid:      { label: 'Grid pattern', kind: 'select', sec: 'look', opts: ['None', 'Colonial', 'Prairie', 'Georgian', 'Diamond'] },
  doorStyle: { label: 'Door style', kind: 'select', sec: 'look', opts: ['Flush', '2-panel', '4-panel', '6-panel', 'Shaker', 'Full glass'] },
  glassInsert:{ label: 'Glass insert', kind: 'select', sec: 'look', opts: ['None', 'Clear', 'Frosted', 'Decorative', '1/2 lite', '3/4 lite', 'Full lite'] },
  glassStyle:{ label: 'Glass style', kind: 'select', sec: 'look', opts: ['Clear', 'Frosted', 'Internal grilles', 'Decorative'] },

  glassType: { label: 'Glass type', kind: 'select', sec: 'glass', opts: ['Clear', 'Frosted', 'Tinted', 'Obscure'], half: true },
  pane:      { label: 'Pane', kind: 'select', sec: 'glass', opts: ['Double', 'Triple'], half: true },
  lowE:      { label: 'Low-E coating', kind: 'toggle', sec: 'glass', sub: 'Energy-efficient' },
  tempered:  { label: 'Tempered', kind: 'toggle', sec: 'glass', sub: 'Safety glass' },
  argon:     { label: 'Argon fill', kind: 'toggle', sec: 'glass', sub: 'Insulating gas' },

  material:    { label: 'Material', kind: 'select', sec: 'install', opts: ['Vinyl', 'Wood', 'Aluminum', 'Fiberglass', 'Composite'], half: true },
  doorMaterial:{ label: 'Door material', kind: 'select', sec: 'install', opts: ['Steel', 'Fiberglass', 'Wood'], half: true },
  install:     { label: 'Installation type', kind: 'select', sec: 'install', opts: ['Retrofit', 'New construction', 'Full frame'], half: true },
  condition:   { label: 'Opening condition', kind: 'select', sec: 'install', opts: ['Good', 'Fair', 'Poor'], half: true },
  brickmould:  { label: 'Brickmould', kind: 'select', sec: 'install', opts: ['None', 'Standard', 'Aluminum'], half: true },
  jamb:        { label: 'Jamb depth', kind: 'select', sec: 'install', opts: ['4 9/16"', '6 9/16"', 'Custom'], half: true },

  screen:    { label: 'Screen type', kind: 'select', sec: 'config', opts: ['None', 'Standard', 'Retractable', 'BetterVue'], half: true },
  openDir:   { label: 'Opening direction', kind: 'select', sec: 'config', opts: ['Left', 'Right'], half: true },
  operSide:  { label: 'Operating side', kind: 'select', sec: 'config', opts: ['Left (XO)', 'Right (OX)'], half: true },
  openMode:  { label: 'Opening mode', kind: 'select', sec: 'config', opts: ['Tilt', 'Turn', 'Tilt & turn'], half: true },
  handle:    { label: 'Handle type', kind: 'select', sec: 'config', opts: ['Standard', 'Folding', 'Nesting'], half: true },
  hwColour:  { label: 'Hardware colour', kind: 'color', sec: 'config', palette: 'hw' },
  egress:    { label: 'Egress required', kind: 'toggle', sec: 'config', sub: 'Code-compliant exit' },
  swing:     { label: 'Swing direction', kind: 'select', sec: 'config', opts: ['Left hand', 'Right hand'], half: true },
  inOut:     { label: 'Swing', kind: 'select', sec: 'config', opts: ['In-swing', 'Out-swing'], half: true },
  activePanel:{ label: 'Active panel', kind: 'select', sec: 'config', opts: ['Left', 'Right'], half: true },
  lockset:   { label: 'Lockset', kind: 'select', sec: 'config', opts: ['Lever', 'Knob', 'Handleset'], half: true },
  deadbolt:  { label: 'Deadbolt', kind: 'select', sec: 'config', opts: ['None', 'Single cylinder', 'Double cylinder'], half: true },

  photos:    { label: 'Photos', kind: 'photos', sec: 'notes' },
  notes:     { label: 'Notes', kind: 'notes', sec: 'notes' },
};

// ── Product catalog ───────────────────────────────────────────────
const W_COMMON_GLASS = ['glassType', 'pane', 'lowE', 'tempered', 'argon'];
const W_COMMON_INSTALL = ['material', 'install', 'condition'];

const CATALOG = {
  window: {
    label: 'Windows', icon: 'win',
    types: {
      casement: { name: 'Casement', subs: ['Left casement', 'Right casement', 'Double casement', 'French casement', 'Fixed casement'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'screen','openDir','handle','hwColour','egress','photos','notes'] },
      awning: { name: 'Awning', subs: ['Standard awning', 'Push-out awning'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'screen','handle','hwColour','photos','notes'] },
      picture: { name: 'Picture', subs: ['Standard picture', 'Large picture', 'Custom picture'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'photos','notes'] },
      slider: { name: 'Slider', subs: ['XO', 'OX', 'XX', 'End vent', 'Double end vent', 'Lift-out'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'screen','operSide','photos','notes'] },
      singleHung: { name: 'Single hung', subs: ['Standard', 'Heavy duty'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'screen','photos','notes'] },
      doubleHung: { name: 'Double hung', subs: ['Standard', 'Tilt-in'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'screen','photos','notes'] },
      hopper: { name: 'Hopper', subs: ['Standard hopper', 'Basement hopper'],
        fields: ['width','height','qty','room','floor','extColour','intColour', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'photos','notes'] },
      tiltTurn: { name: 'Tilt & turn', subs: ['Single', 'Double'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'openMode','handle','hwColour','photos','notes'] },
      bay: { name: 'Bay', subs: ['3 lite', '4 lite', '5 lite'],
        fields: ['owidth','oheight','qty','sideUnit','seatBoard','headBoard','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'photos','notes'] },
      bow: { name: 'Bow', subs: ['4 lite', '5 lite', '6 lite', '7 lite'],
        fields: ['owidth','oheight','qty','numSections','sideUnit','room','floor','extColour','intColour','grid', ...W_COMMON_GLASS, ...W_COMMON_INSTALL, 'photos','notes'] },
      combination: { name: 'Combination', subs: ['Custom combination'], sectionBuilder: true,
        fields: ['owidth','oheight','qty','extColour','intColour','grid', ...W_COMMON_GLASS, 'material','install','photos','notes'] },
      special: { name: 'Special shape', subs: ['Arch', 'Half arch', 'Circle', 'Half circle', 'Triangle', 'Trapezoid', 'Pentagon', 'Octagon', 'Gothic', 'Custom'],
        fields: ['width','height','qty','extColour','intColour','glassType','pane','lowE','tempered','argon','material','photos','notes'] },
    },
  },
  door: {
    label: 'Doors', icon: 'door',
    types: {
      entry: { name: 'Entry door', subs: ['Single door', 'Left sidelite', 'Right sidelite', 'Double sidelite', 'Transom'],
        fields: ['width','height','qty','swing','inOut','doorStyle','doorExt','doorInt','glassInsert','doorMaterial','lockset','deadbolt','hwColour','brickmould','jamb','install','condition','photos','notes'] },
      doubleEntry: { name: 'Double entry', subs: ['Equal double', 'Unequal double'],
        fields: ['width','height','qty','swing','inOut','doorStyle','doorExt','doorInt','glassInsert','doorMaterial','lockset','deadbolt','hwColour','brickmould','jamb','photos','notes'] },
      french: { name: 'French door', subs: ['Single french', 'Double french', 'French + sidelites'],
        fields: ['width','height','qty','swing','inOut','glassStyle','grid','doorMaterial','hwColour','lockset','photos','notes'] },
      garden: { name: 'Garden door', subs: ['In-swing', 'Out-swing'],
        fields: ['width','height','qty','activePanel','glassStyle','grid','doorMaterial','hwColour','photos','notes'] },
      patio: { name: 'Patio sliding', subs: ['XO', 'OX', 'XOX', 'OXXO'],
        fields: ['width','height','qty','operSide','numPanels','extColour','intColour','glassType','pane','lowE','tempered','argon','material','screen','hwColour','photos','notes'] },
      storm: { name: 'Storm door', subs: ['Full glass', 'Half glass', 'Screen'],
        fields: ['width','height','qty','colour','hwColour','screen','photos','notes'] },
    },
  },
};

// Flat list of all types with category for the picker
const ALL_TYPES = [];
Object.entries(CATALOG).forEach(([cat, group]) => {
  Object.entries(group.types).forEach(([id, t]) => {
    ALL_TYPES.push({ id, cat, name: t.name, ...t });
  });
});
function getType(id) { return ALL_TYPES.find(t => t.id === id); }

// Smart defaults applied on type pick
const DEFAULTS = {
  qty: 1, floor: 'Ground floor', extColour: 'White', intColour: 'White',
  doorExt: 'White', doorInt: 'White', colour: 'White', grid: 'None',
  glassType: 'Clear', pane: 'Double', lowE: true, tempered: false, argon: true,
  material: 'Vinyl', doorMaterial: 'Fiberglass', install: 'Retrofit', condition: 'Good',
  glassStyle: 'Clear', glassInsert: 'None', doorStyle: 'Flush', screen: 'Standard',
  hwColour: 'White', lockset: 'Lever', deadbolt: 'Single cylinder',
  brickmould: 'Standard', jamb: '4 9/16"', sideUnit: 'Casement', numSections: '5',
  numPanels: '2', seatBoard: true, headBoard: true, egress: false,
};
// Fields the user almost always tweaks → never auto-defaulted (force a choice)
const NO_DEFAULT = new Set(['width','height','owidth','oheight','room','openDir','operSide','openMode','handle','swing','inOut','activePanel']);

function makeOpening(typeId, subIndex = 0) {
  const t = getType(typeId);
  const vals = {};
  t.fields.forEach(k => {
    if (NO_DEFAULT.has(k)) return;
    if (k in DEFAULTS) vals[k] = DEFAULTS[k];
  });
  return { typeId, sub: t.subs[subIndex] || t.subs[0], vals, sections: [] };
}

// Required fields per opening (must be set before saving)
function requiredKeys(op) {
  const t = getType(op.typeId);
  return t.fields.filter(k => ['width', 'height', 'owidth', 'oheight'].includes(k));
}
function missingRequired(op) {
  return requiredKeys(op).filter(k => { const v = op.vals[k]; return v == null || ('' + v).trim() === ''; });
}
function step1Valid(op) { return missingRequired(op).length === 0; }

Object.assign(window, { C, EBIcon, SETTINGS, FRAME_COLOURS, HW_COLOURS, SECTIONS, F, CATALOG, ALL_TYPES, getType, DEFAULTS, NO_DEFAULT, makeOpening, requiredKeys, missingRequired, step1Valid });
