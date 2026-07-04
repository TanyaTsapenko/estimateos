'use client'
import { type CombinationSection } from '@/lib/v2/openingTypes'
import { CasementDrawing, SliderDrawing, HopperDrawing } from '@/components/estimate-builder-v2/casement-slider-hopper-drawing'
import { AwningDrawing, SingleHungDrawing, DoubleHungDrawing, TiltTurnDrawing } from '@/components/estimate-builder-v2/awning-hung-tiltturn-drawing'
import { EntryDoorDrawing, DoubleEntryDrawing } from '@/components/estimate-builder-v2/entry-door-drawing'
import { FrenchDoorDrawing, GardenDoorDrawing } from '@/components/estimate-builder-v2/french-garden-drawing'
import { PatioDoorDrawing } from '@/components/estimate-builder-v2/patio-door-drawing'
import { StormDoorDrawing, InteriorDoorDrawing } from '@/components/estimate-builder-v2/storm-interior-drawing'
import { ShapeOutlineDrawing } from '@/components/estimate-builder-v2/shape-outline-drawing'
import { BayDrawing, BowDrawing } from '@/components/estimate-builder-v2/bay-bow-drawing'
import { CombinationDrawing } from '@/components/estimate-builder-v2/section-builder'

const OLD_TO_V2_TYPE: Record<string, string> = {
  window_dh: 'doubleHung', window_sh: 'singleHung', window_cas: 'casement',
  window_sl: 'slider', window_fix: 'picture', window_awn: 'awning',
  window_hopper: 'hopper', window_tilt: 'tiltTurn', window_trans: 'transom',
  window_arch: 'special', window_bay: 'bay', window_bow: 'bow',
  window_combo: 'combination', window_egr: 'picture',
  door_entry: 'entry', door_double: 'doubleEntry', door_french: 'french',
  door_garden: 'garden', door_patio: 'patio', door_storm: 'storm', door_int: 'interior',
}
const OLD_SHAPE_TO_V2: Record<string, string> = {
  rect: 'Rectangle', rectangle: 'Rectangle', arch: 'Arch',
  halfarch: 'Half arch', halfround: 'Half round', circle: 'Circle',
  octagon: 'Octagon', triangle: 'Triangle', pentagon: 'Pentagon',
  gothic: 'Gothic', eyebrow: 'Eyebrow',
}

export interface DrawableOpening {
  id: string
  type: string
  width_in?: number | null
  height_in?: number | null
  shape?: string | null
  colour?: string | null
  grid_pattern?: string | null
  glass_kind?: string | null
  glass_type?: string | null
  opening_direction?: string | null
  transom_panes?: string | null
  sidelight_left?: number | null
  sidelight_right?: number | null
  transom_above?: boolean | null
  bay_angle?: string | null
  window_subtype?: string | null
  sections?: { type: string; width: number }[] | null
  open_mode?: string | null
  center_window_type?: string | null
  side_unit?: string | null
  panel_type?: string | null
}

export function OpeningDrawing({ op }: { op: DrawableOpening }) {
  const typeId = OLD_TO_V2_TYPE[op.type] ?? op.type
  const wIn    = op.width_in  ?? undefined
  const hIn    = op.height_in ?? undefined
  const shape  = (op.shape ? OLD_SHAPE_TO_V2[op.shape] : undefined) ?? op.shape ?? undefined
  const sl     = op.sidelight_left && op.sidelight_right ? 'Both'
               : op.sidelight_left  ? 'Left'
               : op.sidelight_right ? 'Right'
               : undefined
  const gk = op.glass_kind ?? undefined
  const fr = op.colour ?? undefined
  const gp = op.grid_pattern ?? undefined

  switch (typeId) {
    case 'casement':
      return <CasementDrawing sub={op.window_subtype ?? ''} shape={shape} widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'slider':
      return <SliderDrawing sub={op.window_subtype ?? ''} widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'endVent':
      return <SliderDrawing sub={(op.window_subtype ?? '').toLowerCase().includes('double') ? 'doubleendvent' : 'endvent'} widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'hopper':
      return <HopperDrawing widthIn={wIn} heightIn={hIn} uid={op.id} glassType={gk} frameColor={fr} />
    case 'awning':
      return <AwningDrawing sub={op.window_subtype ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'singleHung':
      return <SingleHungDrawing shape={shape} widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'doubleHung':
      return <DoubleHungDrawing widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'tiltTurn':
      return <TiltTurnDrawing sub={op.window_subtype ?? ''} openDir={op.opening_direction ?? undefined} openMode={op.open_mode ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} grid={gp} glassType={gk} frameColor={fr} />
    case 'bay':
      return <BayDrawing sub={op.window_subtype ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} bayAngle={op.bay_angle ?? undefined} centerWindowType={op.center_window_type ?? undefined} sideUnit={op.side_unit ?? undefined} grid={gp} glassType={op.glass_type ?? undefined} frameColor={fr} />
    case 'bow':
      return <BowDrawing sub={op.window_subtype ?? ''} widthIn={wIn} heightIn={hIn} uid={op.id} panelType={op.panel_type ?? undefined} sideUnit={op.side_unit ?? undefined} grid={gp} glassType={op.glass_type ?? undefined} frameColor={fr} />
    case 'combination':
      return <CombinationDrawing sections={(op.sections ?? []) as CombinationSection[]} heightIn={hIn} />
    case 'transom':
      return <ShapeOutlineDrawing shape={shape} transomPanes={op.transom_panes ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} glassType={gk} frameColor={fr} />
    case 'special':
      return <ShapeOutlineDrawing shape={op.window_subtype ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} glassType={gk} frameColor={fr} />
    case 'entry':
      return <EntryDoorDrawing sub={op.window_subtype ?? ''} doorSwing={op.opening_direction ?? undefined} glassInsert={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} frameColor={fr} />
    case 'doubleEntry':
      return <DoubleEntryDrawing sub={op.window_subtype ?? ''} doubleDoorSwing={op.opening_direction ?? undefined} glassInsert={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} frameColor={fr} />
    case 'french':
      return <FrenchDoorDrawing sub={op.window_subtype ?? 'Double french'} doorSwing={op.opening_direction ?? undefined} glassSize={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} frameColor={fr} />
    case 'garden':
      return <GardenDoorDrawing doorSwing={op.opening_direction ?? undefined} sidelights={sl} transomAbove={op.transom_above ? 'Rect' : undefined} widthIn={wIn} heightIn={hIn} frameColor={fr} />
    case 'patio':
      return <PatioDoorDrawing sub={op.window_subtype ?? '2 Panel'} widthIn={wIn} heightIn={hIn} uid={op.id} glassType={gk} frameColor={fr} />
    case 'storm':
      return <StormDoorDrawing sub={op.window_subtype ?? 'Full glass'} hingeSide={op.opening_direction ?? undefined} widthIn={wIn} heightIn={hIn} uid={op.id} glassType={gk} frameColor={fr} />
    case 'interior':
      return <InteriorDoorDrawing sub={op.window_subtype ?? 'Single'} doorSwing={op.opening_direction ?? undefined} glassInsert={op.glass_type ?? undefined} widthIn={wIn} heightIn={hIn} frameColor={fr} />
    default:
      return <ShapeOutlineDrawing shape={shape} widthIn={wIn} heightIn={hIn} uid={op.id} glassType={gk} frameColor={fr} />
  }
}
