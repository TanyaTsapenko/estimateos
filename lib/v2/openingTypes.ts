// EstimateOS v2 — Data model (TypeScript port of eb_data.jsx)

export const C = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  border: 'rgba(15,23,42,0.08)',
  borderStrong: 'rgba(15,23,42,0.13)',
  ink: '#0B1220',
  inkMid: '#475467',
  inkSoft: '#8A94A6',
  inkFaint: '#B3BAC6',
  blue: '#3B6CFF',
  blueDeep: '#2045B8',
  blueSoft: '#EEF3FF',
  blueLine: '#DCE6FF',
  green: '#0F8A4D',
  greenSoft: '#E7F6EE',
  amber: '#B7791F',
  amberSoft: '#FFF6E5',
  red: '#C0341A',
  redSoft: '#FBE9E4',
} as const

export const SETTINGS = {
  currency: 'CA$',
  taxLabel: 'HST (15%)',
  taxRate: 0.15,
  validDays: 30,
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
  pricing: {
    base: {
      casement: 980, awning: 920, picture: 640, slider: 760,
      singleHung: 700, doubleHung: 820, hopper: 540, tiltTurn: 1240,
      bay: 2600, bow: 3200, combination: 1800, special: 1100, transom: 550,
      entry: 2400, doubleEntry: 3900, french: 2900, garden: 2600,
      patio: 2800, storm: 680, interior: 450,
    } as Record<string, number>,
    areaRatePerSqFt: 26,
    addons: { triplePane: 180, lowE: 90, argon: 60, tempered: 75, grid: 95, screen: 70, customColour: 120, wood: 340, fiberglass: 160 },
  },
}

export type PaletteEntry = { id: string; hex: string; ring?: boolean }
export type Palettes = { frame: PaletteEntry[]; hw: PaletteEntry[] }
export const FRAME_COLOURS: PaletteEntry[] = SETTINGS.palettes.frame
export const HW_COLOURS: PaletteEntry[] = SETTINGS.palettes.hardware

// ── Sections ──────────────────────────────────────────────────────
export type SectionDef = { id: string; label: string; icon: string }
export const SECTIONS: SectionDef[] = [
  { id: 'basics',  label: 'Size & location',     icon: 'ruler' },
  { id: 'look',    label: 'Appearance',           icon: 'paint' },
  { id: 'glass',   label: 'Glass & performance',  icon: 'glass' },
  { id: 'install', label: 'Installation',         icon: 'tool'  },
  { id: 'config',  label: 'Operation & hardware', icon: 'gear'  },
  { id: 'notes',   label: 'Notes & photos',       icon: 'note'  },
]

// ── Field registry ─────────────────────────────────────────────────
export type FieldKind = 'dim' | 'qty' | 'select' | 'toggle' | 'color' | 'text' | 'photos' | 'notes'
export type FieldDef = {
  label: string
  kind: FieldKind
  sec: string
  unit?: string
  ph?: string
  half?: boolean
  optional?: boolean
  opts?: string[]
  palette?: string
  sub?: string
}

export const F: Record<string, FieldDef> = {
  width:       { label: 'Width',           kind: 'dim',    sec: 'basics',  unit: 'in', ph: '32', half: true },
  height:      { label: 'Height',          kind: 'dim',    sec: 'basics',  unit: 'in', ph: '48', half: true },
  owidth:      { label: 'Overall width',   kind: 'dim',    sec: 'basics',  unit: 'in', ph: '96', half: true },
  oheight:     { label: 'Overall height',  kind: 'dim',    sec: 'basics',  unit: 'in', ph: '60', half: true },
  qty:         { label: 'Quantity',        kind: 'qty',    sec: 'basics' },
  room:        { label: 'Room',            kind: 'select', sec: 'basics',  optional: true, half: true,
                 opts: ['Living room','Kitchen','Primary bed','Bedroom','Bathroom','Basement','Office','Hallway'] },
  floor:       { label: 'Floor',           kind: 'select', sec: 'basics',  half: true,
                 opts: ['Ground floor','2nd floor','3rd floor','Basement'] },
  numSections: { label: 'Number of sections', kind: 'select', sec: 'basics', opts: ['4','5','6','7'] },
  sideUnit:    { label: 'Side unit type',  kind: 'select', sec: 'basics',  opts: ['Casement','Fixed','Awning'] },
  seatBoard:   { label: 'Seat board',      kind: 'toggle', sec: 'basics',  sub: 'Interior sill board' },
  headBoard:   { label: 'Head board',      kind: 'toggle', sec: 'basics',  sub: 'Interior top board' },
  numPanels:   { label: 'Number of panels',kind: 'select', sec: 'basics',  opts: ['2','3','4'] },

  extColour:   { label: 'Exterior colour', kind: 'color',  sec: 'look',   palette: 'frame' },
  intColour:   { label: 'Interior colour', kind: 'color',  sec: 'look',   palette: 'frame' },
  doorExt:     { label: 'Exterior colour', kind: 'color',  sec: 'look',   palette: 'frame' },
  doorInt:     { label: 'Interior colour', kind: 'color',  sec: 'look',   palette: 'frame' },
  colour:      { label: 'Colour',          kind: 'color',  sec: 'look',   palette: 'frame' },
  grid:        { label: 'Grid pattern',    kind: 'select', sec: 'look',
                 opts: ['None','Colonial','Prairie','Georgian','Diamond'] },
  doorStyle:   { label: 'Door style',      kind: 'select', sec: 'look',
                 opts: ['Flush','2-panel','4-panel','6-panel','Shaker','Full glass'] },
  glassInsert: { label: 'Glass insert',    kind: 'select', sec: 'look',
                 opts: ['None','Clear','Frosted','Decorative','1/2 lite','3/4 lite','Full lite'] },
  glassStyle:  { label: 'Glass style',     kind: 'select', sec: 'look',
                 opts: ['Clear','Frosted','Internal grilles','Decorative'] },

  glassType:   { label: 'Glass type',      kind: 'select', sec: 'glass',  opts: ['Clear','Frosted','Tinted','Obscure'], half: true },
  pane:        { label: 'Pane',            kind: 'select', sec: 'glass',  opts: ['Double','Triple'], half: true },
  lowE:        { label: 'Low-E coating',   kind: 'toggle', sec: 'glass',  sub: 'Energy-efficient' },
  tempered:    { label: 'Tempered',        kind: 'toggle', sec: 'glass',  sub: 'Safety glass' },
  argon:       { label: 'Argon fill',      kind: 'toggle', sec: 'glass',  sub: 'Insulating gas' },

  material:    { label: 'Material',        kind: 'select', sec: 'install', opts: ['Vinyl','Wood','Aluminum','Fiberglass','Composite'], half: true },
  doorMaterial:{ label: 'Door material',   kind: 'select', sec: 'install', opts: ['Steel','Fiberglass','Wood'], half: true },
  install:     { label: 'Installation type',kind:'select', sec: 'install', opts: ['Retrofit','New construction','Full frame'], half: true },
  condition:   { label: 'Opening condition',kind:'select', sec: 'install', opts: ['Good','Fair','Poor'], half: true },
  brickmould:  { label: 'Brickmould',      kind: 'select', sec: 'install', opts: ['None','Standard','Aluminum'], half: true },
  jamb:        { label: 'Jamb depth',      kind: 'select', sec: 'install', opts: ['4 9/16"','6 9/16"','Custom'], half: true },
  jambCustom:  { label: 'Specify jamb depth', kind: 'text', sec: 'install', ph: 'e.g. 7 1/4"' },

  screen:      { label: 'Screen type',     kind: 'select', sec: 'config',  opts: ['None','Standard','Retractable','BetterVue'], half: true },
  openDir:     { label: 'Opening direction',kind:'select', sec: 'config',  opts: ['Left','Right'], half: true },
  operSide:    { label: 'Operating side',  kind: 'select', sec: 'config',  opts: ['Left (XO)','Right (OX)'], half: true },
  openMode:    { label: 'Opening mode',    kind: 'select', sec: 'config',  opts: ['Tilt','Turn','Tilt & turn'], half: true },
  handle:      { label: 'Handle type',     kind: 'select', sec: 'config',  opts: ['Standard','Folding','Nesting'], half: true },
  hwColour:    { label: 'Hardware colour', kind: 'color',  sec: 'config',  palette: 'hw' },
  egress:      { label: 'Egress required', kind: 'toggle', sec: 'config',  sub: 'Code-compliant exit' },
  swing:       { label: 'Swing direction', kind: 'select', sec: 'config',  opts: ['Left hand','Right hand'], half: true },
  inOut:       { label: 'Swing',           kind: 'select', sec: 'config',  opts: ['In-swing','Out-swing'], half: true },
  activePanel: { label: 'Active panel',    kind: 'select', sec: 'config',  opts: ['Left','Right'], half: true },
  lockset:     { label: 'Lockset',         kind: 'select', sec: 'config',  opts: ['Lever','Knob','Handleset'], half: true },
  deadbolt:    { label: 'Deadbolt',        kind: 'select', sec: 'config',  opts: ['None','Single cylinder','Double cylinder'], half: true },

  coreType:    { label: 'Core type',       kind: 'select', sec: 'look',    opts: ['Hollow','Solid','Solid core'], half: true },
  transomPanes:{ label: 'Number of panes', kind: 'select', sec: 'basics',  opts: ['1','2','3'], half: true },
  bayAngle:    { label: 'Bay angle',       kind: 'select', sec: 'basics',  opts: ['30°','45°','90°'], half: true },
  tiltClean:   { label: 'Tilt-to-clean',  kind: 'toggle', sec: 'config',  sub: 'Sash tilts in for cleaning' },
  sidelights:  { label: 'Sidelights',     kind: 'select', sec: 'look',    opts: ['None','Left','Right','Both'], half: true },
  transomAbove:{ label: 'Transom above',  kind: 'toggle', sec: 'look',    sub: 'Glass panel above door' },

  customShapeDesc: { label: 'Describe the shape', kind: 'text', sec: 'basics', ph: 'e.g. arched top with 24″ radius' },

  photos:      { label: 'Photos',          kind: 'photos', sec: 'notes' },
  notes:       { label: 'Notes',           kind: 'notes',  sec: 'notes' },
}

// ── Product catalog ───────────────────────────────────────────────
const W_COMMON_GLASS = ['glassType','pane','lowE','tempered','argon'] as const
const W_COMMON_INSTALL = ['material','install','condition'] as const

export type TypeDef = {
  name: string
  subs: string[]
  fields: string[]
}

export type CatalogGroup = {
  label: string
  icon: string
  types: Record<string, TypeDef>
}

export const CATALOG: Record<string, CatalogGroup> = {
  window: {
    label: 'Windows', icon: 'win',
    types: {
      casement:    { name: 'Casement',      subs: ['Left casement','Right casement','Double casement','French casement','Fixed casement'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'screen','openDir','handle','hwColour','egress','photos','notes'] },
      awning:      { name: 'Awning',        subs: ['Standard awning','Push-out awning'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'screen','handle','hwColour','egress','photos','notes'] },
      picture:     { name: 'Picture',       subs: ['Standard picture','Large picture','Custom picture'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'photos','notes'] },
      slider:      { name: 'Slider',        subs: ['XO','OX','XX','End vent','Double end vent','Lift-out'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'screen','operSide','egress','photos','notes'] },
      singleHung:  { name: 'Single hung',   subs: ['Standard','Heavy duty'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'screen','tiltClean','egress','photos','notes'] },
      doubleHung:  { name: 'Double hung',   subs: ['Standard','Tilt-in'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'screen','tiltClean','egress','photos','notes'] },
      hopper:      { name: 'Hopper',        subs: ['Standard hopper','Basement hopper'],
        fields: ['width','height','qty','room','floor','extColour','intColour',...W_COMMON_GLASS,...W_COMMON_INSTALL,'egress','photos','notes'] },
      tiltTurn:    { name: 'Tilt & turn',   subs: ['Single','Double'],
        fields: ['width','height','qty','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'openMode','handle','hwColour','egress','photos','notes'] },
      bay:         { name: 'Bay',           subs: ['3 lite','4 lite','5 lite'],
        fields: ['owidth','oheight','qty','sideUnit','bayAngle','seatBoard','headBoard','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'photos','notes'] },
      bow:         { name: 'Bow',           subs: ['4 lite','5 lite','6 lite','7 lite'],
        fields: ['owidth','oheight','qty','numSections','sideUnit','room','floor','extColour','intColour','grid',...W_COMMON_GLASS,...W_COMMON_INSTALL,'photos','notes'] },
      // TODO: section builder UI not yet implemented
      combination: { name: 'Combination',   subs: ['Custom combination'],
        fields: ['owidth','oheight','qty','extColour','intColour','grid',...W_COMMON_GLASS,'material','install','photos','notes'] },
      special:     { name: 'Special shape', subs: ['Arch','Half arch','Circle','Half circle','Triangle','Trapezoid','Pentagon','Octagon','Gothic','Custom'],
        fields: ['width','height','qty','customShapeDesc','extColour','intColour','glassType','pane','lowE','tempered','argon','material','photos','notes'] },
      transom:     { name: 'Transom',       subs: ['Fixed transom','Operable transom'],
        fields: ['width','height','qty','room','floor','extColour','intColour','transomPanes','glassType','pane','lowE','tempered','argon','material','install','condition','photos','notes'] },
    },
  },
  door: {
    label: 'Doors', icon: 'door',
    types: {
      entry:       { name: 'Entry door',    subs: ['Single door','Left sidelite','Right sidelite','Double sidelite','Transom'],
        fields: ['width','height','qty','swing','inOut','doorStyle','doorExt','doorInt','sidelights','transomAbove','glassInsert','doorMaterial','lockset','deadbolt','hwColour','brickmould','jamb','install','condition','photos','notes'] },
      doubleEntry: { name: 'Double entry',  subs: ['Equal double','Unequal double'],
        fields: ['width','height','qty','swing','inOut','doorStyle','doorExt','doorInt','sidelights','transomAbove','glassInsert','doorMaterial','lockset','deadbolt','hwColour','brickmould','jamb','photos','notes'] },
      french:      { name: 'French door',   subs: ['Single french','Double french','French + sidelites'],
        fields: ['width','height','qty','swing','inOut','sidelights','glassStyle','grid','doorMaterial','hwColour','lockset','photos','notes'] },
      garden:      { name: 'Garden door',   subs: ['In-swing','Out-swing'],
        fields: ['width','height','qty','activePanel','glassStyle','grid','doorMaterial','hwColour','photos','notes'] },
      patio:       { name: 'Patio sliding', subs: ['XO','OX','XOX','OXXO'],
        fields: ['width','height','qty','operSide','numPanels','extColour','intColour','glassType','pane','lowE','tempered','argon','material','screen','hwColour','photos','notes'] },
      storm:       { name: 'Storm door',    subs: ['Full glass','Half glass','Screen'],
        fields: ['width','height','qty','glassType','colour','hwColour','screen','photos','notes'] },
      interior:    { name: 'Interior door', subs: ['Single','Double','Pocket','Bifold'],
        fields: ['width','height','qty','swing','inOut','doorStyle','doorExt','doorInt','coreType','doorMaterial','lockset','hwColour','photos','notes'] },
    },
  },
}

// ── Derived flat list ─────────────────────────────────────────────
export type FlatType = TypeDef & { id: string; cat: string }

export const ALL_TYPES: FlatType[] = []
Object.entries(CATALOG).forEach(([cat, group]) => {
  Object.entries(group.types).forEach(([id, t]) => {
    ALL_TYPES.push({ id, cat, ...t })
  })
})

export function getType(id: string): FlatType {
  return ALL_TYPES.find(t => t.id === id) || ALL_TYPES[0]
}

// ── Smart defaults ─────────────────────────────────────────────────
export const DEFAULTS: Record<string, string | number | boolean> = {
  qty: 1, floor: 'Ground floor', extColour: 'White', intColour: 'White',
  doorExt: 'White', doorInt: 'White', colour: 'White', grid: 'None',
  glassType: 'Clear', pane: 'Double', lowE: true, tempered: false, argon: true,
  material: 'Vinyl', doorMaterial: 'Fiberglass', install: 'Retrofit', condition: 'Good',
  glassStyle: 'Clear', glassInsert: 'None', doorStyle: 'Flush', screen: 'Standard',
  hwColour: 'White', lockset: 'Lever', deadbolt: 'Single cylinder',
  brickmould: 'Standard', jamb: '4 9/16"', sideUnit: 'Casement', numSections: '5',
  numPanels: '2', seatBoard: true, headBoard: true, egress: false,
  coreType: 'Solid', transomPanes: '1', bayAngle: '45°', tiltClean: false, sidelights: 'None', transomAbove: false,
}

export const NO_DEFAULT = new Set(['width','height','owidth','oheight','room','openDir','operSide','openMode','handle','swing','inOut','activePanel'])

// ── Opening type ──────────────────────────────────────────────────
export type Opening = {
  typeId: string
  sub: string
  tempId: string
  interiorPhotoUrl?: string | null
  exteriorPhotoUrl?: string | null
  photo3Url?: string | null
  photo4Url?: string | null
  vals: Record<string, string | number | boolean | undefined>
}

export function makeOpening(typeId: string, subIndex = 0): Opening {
  const t = getType(typeId)
  const vals: Record<string, string | number | boolean> = {}
  t.fields.forEach(k => {
    if (NO_DEFAULT.has(k)) return
    if (k === 'photos') return
    if (k in DEFAULTS) vals[k] = DEFAULTS[k]
  })
  return { typeId, sub: t.subs[subIndex] || t.subs[0], tempId: crypto.randomUUID(), vals }
}

export function missingRequired(op: Opening): string[] {
  const t = getType(op.typeId)
  return t.fields.filter(k => {
    if (!['width','height','owidth','oheight'].includes(k)) return false
    const v = op.vals[k]
    return v == null || String(v).trim() === ''
  })
}

// ── v2 type name lookup (for [id]/page.tsx type header) ──────────
export const V2_TYPE_LABELS: Record<string, string> = {}
Object.values(CATALOG).forEach(group => {
  Object.entries(group.types).forEach(([id, t]) => {
    V2_TYPE_LABELS[id] = t.name
  })
})

// ── v2 → old-style key (for WindowDiagram) ────────────────────────
export const V2_TO_OLD_TYPE_KEY: Record<string, string> = {
  casement:    'window_cas',
  awning:      'window_awn',
  picture:     'window_fix',
  slider:      'window_sl',
  singleHung:  'window_sh',
  doubleHung:  'window_dh',
  hopper:      'window_dh',
  tiltTurn:    'window_tilt',
  bay:         'window_bay',
  bow:         'window_bow',
  combination: 'window_combo',
  special:     'window_arch',
  transom:     'window_trans',
  entry:       'door_entry',
  doubleEntry: 'door_double',
  french:      'door_french',
  garden:      'door_garden',
  patio:       'door_patio',
  storm:       'door_storm',
  interior:    'door_int',
}
