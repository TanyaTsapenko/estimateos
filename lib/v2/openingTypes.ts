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
  visibleWhen?: { field: string; value: string | boolean }
}

export const F: Record<string, FieldDef> = {
  // ── Basics
  width:       { label: 'Width',            kind: 'dim',    sec: 'basics', unit: 'in', ph: '32', half: true },
  height:      { label: 'Height',           kind: 'dim',    sec: 'basics', unit: 'in', ph: '48', half: true },
  owidth:      { label: 'Overall width',    kind: 'dim',    sec: 'basics', unit: 'in', ph: '96', half: true },
  oheight:     { label: 'Overall height',   kind: 'dim',    sec: 'basics', unit: 'in', ph: '60', half: true },
  qty:         { label: 'Quantity',         kind: 'qty',    sec: 'basics' },
  room:        { label: 'Room',             kind: 'select', sec: 'basics', optional: true, half: true,
                 opts: ['Living room','Kitchen','Primary bed','Bedroom','Bathroom','Basement','Office','Hallway'] },
  floor:       { label: 'Floor',            kind: 'select', sec: 'basics', half: true,
                 opts: ['Ground floor','2nd floor','3rd floor','Basement'] },
  numSections: { label: 'Number of sections', kind: 'select', sec: 'basics', opts: ['3','4','5','6'] },
  sideUnit:    { label: 'Side unit type',   kind: 'select', sec: 'basics', opts: ['Casement','Fixed','Awning','Single Hung','Double Hung'] },
  seatBoard:   { label: 'Seat board',       kind: 'toggle', sec: 'basics', sub: 'Interior sill board' },
  headBoard:   { label: 'Head board',       kind: 'toggle', sec: 'basics', sub: 'Interior top board' },
  numPanels:   { label: 'Number of panels', kind: 'select', sec: 'basics', opts: ['2','3','4'] },
  transomPanes:{ label: 'Number of panes',  kind: 'select', sec: 'basics', opts: ['1 Lite','2 Lite','3 Lite','4 Lite'], half: true },
  bayAngle:    { label: 'Bay angle',        kind: 'select', sec: 'basics', opts: ['30°','45°','60°','90°','Custom'], half: true },
  customShapeDesc: { label: 'Describe the shape', kind: 'text', sec: 'basics', ph: 'e.g. arched top with 24″ radius' },
  shape:           { label: 'Shape',              kind: 'select', sec: 'basics', optional: true,
                     opts: ['Rectangle','Arch','Half Round','Circle','Octagon','Triangle','Trapezoid','Eyebrow','Custom Shape'], half: true },
  position:        { label: 'Position',           kind: 'select', sec: 'basics',
                     opts: ['Above Door','Above Window','Standalone'], half: true },
  associatedOpening:{ label: 'Associated opening', kind: 'select', sec: 'basics',
                      opts: ['Entry Door','Patio Door','Garden Door','Custom'], half: true,
                      visibleWhen: { field: 'position', value: 'Above Door' } },

  roofType:    { label: 'Roof type',         kind: 'select', sec: 'look',   optional: true,
                 opts: ['Standard','Hip Roof','Shed Roof'], half: true },

  // ── Look / Appearance
  extColour:   { label: 'Exterior colour',  kind: 'color',  sec: 'look',   palette: 'frame' },
  intColour:   { label: 'Interior colour',  kind: 'color',  sec: 'look',   palette: 'frame' },
  doorExt:     { label: 'Exterior colour',  kind: 'color',  sec: 'look',   palette: 'frame' },
  doorInt:     { label: 'Interior colour',  kind: 'color',  sec: 'look',   palette: 'frame' },
  colour:      { label: 'Colour',           kind: 'color',  sec: 'look',   palette: 'frame' },
  grid:        { label: 'Grid pattern',     kind: 'select', sec: 'look',
                 opts: ['None','Colonial','Prairie','Georgian','Diamond'] },
  grilleType:  { label: 'Grille type',      kind: 'select', sec: 'look',
                 opts: ['None','GBG','SDL','Surface Grille'], half: true },
  doorStyle:   { label: 'Door style',       kind: 'select', sec: 'look',
                 opts: ['Flush','2-panel','4-panel','6-panel','Shaker'] },
  glassInsert: { label: 'Glass insert',     kind: 'select', sec: 'look',
                 opts: ['None','1/4 Lite','1/2 Lite','3/4 Lite','Full Lite'] },
  glassType2:  { label: 'Glass type',       kind: 'select', sec: 'look',
                 opts: ['Clear','Frosted','Decorative'], half: true },
  glassStyle:  { label: 'Glass style',      kind: 'select', sec: 'look',
                 opts: ['Clear','Frosted','Internal grilles','Decorative'] },
  glassSize:   { label: 'Glass size',       kind: 'select', sec: 'look',
                 opts: ['None','1/4 Lite','1/2 Lite','3/4 Lite','Full Lite'], half: true },
  sidelights:  { label: 'Sidelights',       kind: 'select', sec: 'look',   opts: ['None','Left','Right','Both'], half: true },
  transomAbove:{ label: 'Transom above',    kind: 'select', sec: 'look',
                 opts: ['None','Rectangular','Arched'], half: true },
  coreType:    { label: 'Core type',        kind: 'select', sec: 'look',   opts: ['Hollow Core','Solid Core'], half: true },

  // ── Glass & performance
  glassType:      { label: 'Glass type',      kind: 'select', sec: 'glass', opts: ['Clear','Frosted','Tinted','Obscure'], half: true },
  pane:           { label: 'Pane',            kind: 'select', sec: 'glass', opts: ['Double','Triple'], half: true },
  lowE:           { label: 'Low-E coating',   kind: 'toggle', sec: 'glass', sub: 'Energy-efficient' },
  tempered:       { label: 'Tempered',        kind: 'toggle', sec: 'glass', sub: 'Safety glass' },
  argon:          { label: 'Argon fill',      kind: 'toggle', sec: 'glass', sub: 'Insulating gas' },
  laminatedGlass: { label: 'Laminated glass', kind: 'toggle', sec: 'glass', sub: 'Impact & sound resistant' },

  // ── Installation
  material:      { label: 'Material',          kind: 'select', sec: 'install',
                   opts: ['Vinyl','Wood','Aluminum','Fiberglass','Composite','Clad Wood'], half: true },
  doorMaterial:     { label: 'Door material',     kind: 'select', sec: 'install', opts: ['Steel','Fiberglass','Wood'], half: true },
  stormDoorMaterial:{ label: 'Door material',     kind: 'select', sec: 'install',
                      opts: ['Aluminum','Composite','Wood Core'], half: true },
  install:       { label: 'Installation type', kind: 'select', sec: 'install',
                   opts: ['Retrofit','Full Frame','Stud-to-Stud'], half: true },
  condition:     { label: 'Opening condition', kind: 'select', sec: 'install', opts: ['Good','Needs Repair','Rotted'], half: true },
  brickmould:    { label: 'Brickmould',        kind: 'select', sec: 'install', opts: ['None','Standard','Aluminum'], half: true },
  jamb:          { label: 'Jamb depth',        kind: 'select', sec: 'install', opts: ['4 9/16"','6 9/16"','Custom'], half: true },
  jambCustom:    { label: 'Specify jamb depth', kind: 'text',  sec: 'install', ph: 'e.g. 7 1/4"' },
  thresholdType: { label: 'Threshold type',    kind: 'select', sec: 'install',
                   opts: ['Standard','Low Profile','Barrier Free'], half: true },
  projectionDepth:       { label: 'Projection depth',        kind: 'select', sec: 'install',
                           opts: ['12"','18"','24"','30"','Custom'], half: true },
  projectionDepthCustom: { label: 'Specify projection depth', kind: 'text',   sec: 'install', ph: 'e.g. 30"' },
  supportType:           { label: 'Support type',             kind: 'select', sec: 'install',
                           opts: ['Cable Support','Knee Brace','Seat Support'], half: true },

  // ── Operation & hardware
  centerWindowType:  { label: 'Center window type',   kind: 'select', sec: 'config',
                       opts: ['Picture','Casement'], half: true },
  panelType:         { label: 'Panel type',           kind: 'select', sec: 'config',
                       opts: ['Fixed','Casement'], half: true },
  screen:            { label: 'Screen type',         kind: 'select', sec: 'config', opts: ['None','Standard','Retractable','BetterVue'], half: true },
  screenType:        { label: 'Screen type',         kind: 'select', sec: 'config',
                       opts: ['None','Retractable Screen','Rolling Screen','Full View Screen'], half: true },
  screenCoverage:    { label: 'Screen coverage',      kind: 'select', sec: 'config', opts: ['Half Screen','Full Screen','No Screen'], half: true },
  openDir:           { label: 'Opening direction',    kind: 'select', sec: 'config', opts: ['Left','Right'], half: true },
  operSide:          { label: 'Operating side',       kind: 'select', sec: 'config', opts: ['Left (XO)','Right (OX)'], half: true },
  openMode:          { label: 'Opening mode',         kind: 'select', sec: 'config', opts: ['Tilt Only','Turn Only','Tilt & Turn'], half: true },
  hwColour:          { label: 'Hardware colour',      kind: 'color',  sec: 'config', palette: 'hw' },
  egress:            { label: 'Egress required',      kind: 'toggle', sec: 'config', sub: 'Code-compliant exit' },
  hingeSide:         { label: 'Hinge side',            kind: 'select', sec: 'config',
                       opts: ['Left Hinge','Right Hinge','Reversible Hinge'], half: true },
  doorSwing:         { label: 'Door swing',           kind: 'select', sec: 'config',
                       opts: ['Left In-Swing','Right In-Swing','Left Out-Swing','Right Out-Swing'], half: true },
  doubleDoorSwing:   { label: 'Door swing',           kind: 'select', sec: 'config',
                       opts: ['Left Active In-Swing','Right Active In-Swing',
                              'Left Active Out-Swing','Right Active Out-Swing'], half: true },
  activePanel:       { label: 'Active panel',         kind: 'select', sec: 'config', opts: ['Left','Right','Both'], half: true },
  lockset:           { label: 'Lockset',              kind: 'select', sec: 'config', opts: ['Lever','Knob','Handleset'], half: true },
  locksetBore:       { label: 'Lockset bore',         kind: 'select', sec: 'config', opts: ['2-1/8"','2-3/4"','Custom'], half: true },
  deadbolt:          { label: 'Deadbolt',             kind: 'toggle', sec: 'config' },
  deadboltType:      { label: 'Deadbolt type',        kind: 'select', sec: 'config',
                       opts: ['Single Cylinder','Double Cylinder','Smart Lock Ready'], half: true,
                       visibleWhen: { field: 'deadbolt', value: true } },
  openingAngle:      { label: 'Opening angle',        kind: 'select', sec: 'config', opts: ['30°','45°','90°'], half: true },
  openingRestrictor: { label: 'Opening restrictor',   kind: 'toggle', sec: 'config', sub: 'Limit device' },
  securityLock:      { label: 'Security lock',        kind: 'toggle', sec: 'config' },
  ventLock:          { label: 'Vent lock',             kind: 'select', sec: 'config', opts: ['Standard Lock','Vent Lock'], half: true },
  tiltClean:         { label: 'Tilt-to-clean',        kind: 'toggle', sec: 'config', sub: 'Sash tilts in for cleaning' },
  topSashOperable:   { label: 'Top sash operable',    kind: 'toggle', sec: 'config' },
  bottomSashOperable:{ label: 'Bottom sash operable', kind: 'toggle', sec: 'config' },
  closerType:        { label: 'Door closer',          kind: 'select', sec: 'config', opts: ['None','Hydraulic','Pneumatic'], half: true },
  petDoor:           { label: 'Pet door',             kind: 'select', sec: 'config', opts: ['None','Small','Medium','Large'], half: true },
  ventilationType:   { label: 'Ventilation type',     kind: 'select', sec: 'config',
                       opts: ['Fixed Glass','Retractable Screen','Self-Storing Screen','Interchangeable Screen'] },
  astragal:          { label: 'Astragal',             kind: 'select', sec: 'config',
                       opts: ['Standard Astragal','Removable Astragal'], half: true },
  astragalType:      { label: 'Astragal type',        kind: 'select', sec: 'config',
                       opts: ['None','Standard','Security Astragal'], half: true },
  multipointLock:    { label: 'Multipoint lock',      kind: 'toggle', sec: 'config', sub: 'Multiple locking points' },
  // legacy fields kept for backward-compat read of old estimates
  swing:   { label: 'Swing direction', kind: 'select', sec: 'config', opts: ['Left hand','Right hand'], half: true },
  inOut:   { label: 'Swing',           kind: 'select', sec: 'config', opts: ['In-swing','Out-swing'],   half: true },

  // ── Notes & photos
  photos: { label: 'Photos', kind: 'photos', sec: 'notes' },
  notes:  { label: 'Notes',  kind: 'notes',  sec: 'notes' },
}

// ── Product catalog ───────────────────────────────────────────────
const W_COMMON_GLASS = ['glassType','pane','lowE','tempered','argon','laminatedGlass'] as const
const W_COMMON_INSTALL = ['material','install','condition'] as const

export type TypeDef = {
  name: string
  subs: string[]
  fields: string[]
  extraFieldsBySubtype?: Record<string, string[]>
  extraFieldsByValue?: Record<string, { field: string; value?: string | number | boolean; notEmpty?: boolean }>
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
      casement: { name: 'Casement', subs: ['Left casement','Right casement','Double casement','French casement','Fixed casement'],
        fields: ['width','height','qty','room','floor','shape',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'screen','hwColour','egress','photos','notes'],
        extraFieldsBySubtype: {
          'Double casement': ['activePanel'],
        } },

      awning: { name: 'Awning', subs: ['Standard awning','Push-out awning'],
        fields: ['width','height','qty','room','floor',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'screen','hwColour','egress','photos','notes'] },

      picture: { name: 'Picture', subs: [],
        fields: ['width','height','qty','room','floor','shape',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'photos','notes'] },

      slider: { name: 'Slider', subs: ['XO','OX','XX','End vent','Double end vent','Lift-out'],
        fields: ['width','height','qty','room','floor','numPanels',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'screen','screenCoverage','egress','photos','notes'],
        extraFieldsBySubtype: { 'XO': ['operSide'], 'OX': ['operSide'] } },

      singleHung: { name: 'Single hung', subs: ['Standard','Tilt-In'],
        fields: ['width','height','qty','room','floor','shape',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'screen','ventLock','photos','notes'],
        extraFieldsBySubtype: { 'Tilt-In': ['tiltClean'] } },

      doubleHung: { name: 'Double hung', subs: ['Standard','Tilt-in'],
        fields: ['width','height','qty','room','floor',
          'extColour','intColour','grid',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'screen','egress','topSashOperable','bottomSashOperable','photos','notes'],
        extraFieldsBySubtype: { 'Tilt-in': ['tiltClean'] } },

      hopper: { name: 'Hopper', subs: ['Standard hopper','Basement hopper'],
        fields: ['width','height','qty','room','floor',
          'extColour','intColour','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'openingAngle','openingRestrictor','securityLock','photos','notes'] },

      tiltTurn: { name: 'Tilt & turn', subs: ['Single','Double'],
        fields: ['width','height','qty','room','floor',
          'extColour','intColour','grid',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'openDir','openMode','egress','photos','notes'] },

      bay: { name: 'Bay', subs: ['3 lite','4 lite','5 lite'],
        fields: ['owidth','oheight','qty','room','floor','sideUnit','seatBoard','headBoard','bayAngle',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS,
          'material','install','condition','projectionDepth','supportType',
          'centerWindowType','egress','photos','notes'],
        extraFieldsByValue: { roofType: { field: 'seatBoard', value: true } } },

      bow: { name: 'Bow', subs: ['4 lite','5 lite','6 lite','7 lite'],
        fields: ['owidth','oheight','qty','room','floor','sideUnit','seatBoard','headBoard',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS, ...W_COMMON_INSTALL,
          'projectionDepth','supportType',
          'panelType','photos','notes'],
        extraFieldsByValue: { roofType: { field: 'supportType', notEmpty: true } } },

      combination: { name: 'Combination', subs: [],
        fields: ['owidth','oheight','qty',
          'extColour','intColour','grid','grilleType',
          ...W_COMMON_GLASS,'material','install',
          'egress','photos','notes'] },

      special: { name: 'Special shape',
        subs: ['Arch','Half arch','Circle','Half circle','Triangle','Trapezoid','Pentagon','Octagon','Gothic','Eyebrow','Custom'],
        fields: ['width','height','qty','customShapeDesc',
          'extColour','intColour','grilleType',
          'glassType','pane','lowE','tempered','argon','laminatedGlass',
          'material','photos','notes'] },

      transom: { name: 'Transom', subs: ['Fixed transom','Operable transom'],
        fields: ['width','height','qty','room','floor','transomPanes','shape','position','associatedOpening',
          'extColour','intColour','grilleType',
          'glassType','pane','lowE','tempered','argon','laminatedGlass',
          'material','install','condition','photos','notes'] },
    },
  },
  door: {
    label: 'Doors', icon: 'door',
    types: {
      entry: { name: 'Entry door',
        subs: ['Single Door','Single + Left Sidelite','Single + Right Sidelite',
          'Single + Double Sidelite','Single + Transom',
          'Single + Sidelites + Transom'],
        fields: ['width','height','qty',
          'doorExt','doorInt','doorStyle','glassInsert','glassType2',
          'laminatedGlass','doorMaterial','install','condition',
          'brickmould','jamb','thresholdType',
          'hwColour','doorSwing','lockset','deadbolt','deadboltType',
          'photos','notes'] },

      doubleEntry: { name: 'Double entry', subs: ['Equal double','Unequal double',
          'Double + Sidelites','Double + Transom','Double + Sidelites + Transom'],
        fields: ['width','height','qty',
          'doorExt','doorInt','doorStyle','glassInsert','glassType2','sidelights','transomAbove',
          'laminatedGlass','doorMaterial',
          'brickmould','jamb','thresholdType',
          'hwColour','doubleDoorSwing','lockset','deadbolt','astragalType',
          'photos','notes'] },

      french: { name: 'French door', subs: ['Single french','Double french','French + sidelites'],
        fields: ['width','height','qty',
          'grid','glassSize','glassType2','sidelights',
          'laminatedGlass','doorMaterial','thresholdType',
          'hwColour','doorSwing','lockset','multipointLock',
          'photos','notes'],
        extraFieldsBySubtype: {
          'Double french':      ['activePanel','astragal'],
          'French + sidelites': ['activePanel','astragal'],
        },
      },

      garden: { name: 'Garden door', subs: [],
        fields: ['width','height','qty',
          'grid','glassSize','glassType2','sidelights','transomAbove',
          'laminatedGlass','tempered','doorMaterial','thresholdType',
          'hwColour','doorSwing','lockset','deadbolt','deadboltType','screenType',
          'photos','notes'] },

      patio: { name: 'Patio sliding', subs: ['XO','OX','XOX','OXXO'],
        fields: ['width','height','qty',
          'extColour','intColour',
          'glassType','pane','lowE','tempered','argon','laminatedGlass',
          'material','thresholdType','screen','hwColour',
          'photos','notes'],
        extraFieldsBySubtype: {
          'XO': ['operSide'],
          'OX': ['operSide'],
        } },

      storm: { name: 'Storm door', subs: ['Full glass','Half glass','Screen'],
        fields: ['width','height','qty',
          'colour','glassType','glassType2','laminatedGlass',
          'stormDoorMaterial','screen',
          'hwColour','hingeSide','lockset','closerType','petDoor','ventilationType',
          'photos','notes'] },

      interior: { name: 'Interior door', subs: ['Single','Double','Pocket','Bifold'],
        fields: ['width','height','qty',
          'doorExt','doorInt','doorStyle','glassInsert','glassType2','coreType',
          'laminatedGlass','doorMaterial','thresholdType',
          'hwColour','doorSwing','lockset',
          'photos','notes'] },
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
  laminatedGlass: false,
  grilleType: 'None',
  material: 'Vinyl', doorMaterial: 'Fiberglass', install: 'Retrofit', condition: 'Good',
  glassStyle: 'Clear', glassInsert: 'None', doorStyle: 'Flush', screen: 'Standard',
  screenCoverage: 'Half Screen',
  hwColour: 'White', lockset: 'Lever', deadbolt: false,
  brickmould: 'Standard', jamb: '4 9/16"', sideUnit: 'Casement', numSections: '5',
  numPanels: '2', seatBoard: true, headBoard: true, egress: false,
  coreType: 'Solid Core', transomPanes: '1 Lite', bayAngle: '45°', tiltClean: false,
  position: 'Standalone',
  sidelights: 'None', transomAbove: 'None',
  thresholdType: 'Standard',
  closerType: 'None',
  topSashOperable: true, bottomSashOperable: true,
  astragal: 'Standard Astragal', multipointLock: false,
}

export const NO_DEFAULT = new Set([
  'width','height','owidth','oheight','room',
  'openDir','operSide','openMode',
  'doorSwing','locksetBore',
  'swing','inOut','activePanel',
])

// ── Opening type ──────────────────────────────────────────────────
export type CombinationSectionType = 'Casement' | 'Fixed' | 'Slider' | 'Awning' | 'Picture' | 'Single Hung'
export type CombinationSection = { type: CombinationSectionType; width: number }

export type Opening = {
  typeId: string
  sub: string
  tempId: string
  interiorPhotoUrl?: string | null
  exteriorPhotoUrl?: string | null
  photo3Url?: string | null
  photo4Url?: string | null
  sections?: CombinationSection[]
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
  const op: Opening = { typeId, sub: t.subs[subIndex] ?? t.subs[0] ?? '', tempId: crypto.randomUUID(), vals }
  if (typeId === 'combination') {
    op.sections = [{ type: 'Picture', width: 36 }]
  }
  return op
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
