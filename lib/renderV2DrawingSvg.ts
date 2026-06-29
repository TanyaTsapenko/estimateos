// Renders v2 drawing components to SVG strings server-side.
// renderToStaticMarkup is allowed in Node.js API routes — the restriction
// only applies to Server Components that import 'use client' modules via Turbopack.
export const runtime = 'nodejs'

import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import type { CombinationSection } from '@/lib/v2/openingTypes'
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

export function renderV2DrawingSvg(op: any): string {
  const typeId = OLD_TO_V2_TYPE[op.type] ?? op.type
  const wIn    = op.width_in  ?? undefined
  const hIn    = op.height_in ?? undefined
  const shape  = (op.shape ? OLD_SHAPE_TO_V2[op.shape] : undefined) ?? op.shape ?? undefined
  const sl     = op.sidelight_left && op.sidelight_right ? 'Both'
               : op.sidelight_left  ? 'Left'
               : op.sidelight_right ? 'Right'
               : undefined
  const uid    = op.id ?? 'pdf'
  const sections = Array.isArray(op.sections) ? op.sections : []

  let element: React.ReactElement

  switch (typeId) {
    case 'casement':
      element = React.createElement(CasementDrawing, { sub: op.window_subtype ?? '', shape, widthIn: wIn, heightIn: hIn, uid }); break
    case 'slider':
      element = React.createElement(SliderDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid }); break
    case 'endVent':
      element = React.createElement(SliderDrawing, { sub: (op.window_subtype ?? '').toLowerCase().includes('double') ? 'doubleendvent' : 'endvent', widthIn: wIn, heightIn: hIn, uid }); break
    case 'hopper':
      element = React.createElement(HopperDrawing, { widthIn: wIn, heightIn: hIn, uid }); break
    case 'awning':
      element = React.createElement(AwningDrawing, { sub: op.window_subtype ?? undefined, widthIn: wIn, heightIn: hIn, uid }); break
    case 'singleHung':
      element = React.createElement(SingleHungDrawing, { shape, widthIn: wIn, heightIn: hIn, uid }); break
    case 'doubleHung':
      element = React.createElement(DoubleHungDrawing, { widthIn: wIn, heightIn: hIn, uid }); break
    case 'tiltTurn':
      element = React.createElement(TiltTurnDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid }); break
    case 'bay':
      element = React.createElement(BayDrawing, { sub: op.window_subtype ?? undefined, widthIn: wIn, heightIn: hIn, uid, bayAngle: op.bay_angle ?? undefined }); break
    case 'bow':
      element = React.createElement(BowDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid }); break
    case 'combination':
      element = React.createElement(CombinationDrawing, { sections: sections as CombinationSection[], heightIn: hIn }); break
    case 'transom':
      element = React.createElement(ShapeOutlineDrawing, { shape, transomPanes: op.transom_panes ?? undefined, widthIn: wIn, heightIn: hIn, uid }); break
    case 'special':
      element = React.createElement(ShapeOutlineDrawing, { shape: op.window_subtype ?? undefined, widthIn: wIn, heightIn: hIn, uid }); break
    case 'entry':
      element = React.createElement(EntryDoorDrawing, { sub: op.window_subtype ?? '', doorSwing: op.opening_direction ?? undefined, glassInsert: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn }); break
    case 'doubleEntry':
      element = React.createElement(DoubleEntryDrawing, { sub: op.window_subtype ?? '', doubleDoorSwing: op.opening_direction ?? undefined, glassInsert: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn }); break
    case 'french':
      element = React.createElement(FrenchDoorDrawing, { sub: op.window_subtype ?? 'Double french', doorSwing: op.opening_direction ?? undefined, glassSize: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn }); break
    case 'garden':
      element = React.createElement(GardenDoorDrawing, { doorSwing: op.opening_direction ?? undefined, sidelights: sl, transomAbove: op.transom_above ? 'Rect' : undefined, widthIn: wIn, heightIn: hIn }); break
    case 'patio':
      element = React.createElement(PatioDoorDrawing, { sub: op.window_subtype ?? '2 Panel', widthIn: wIn, heightIn: hIn, uid }); break
    case 'storm':
      element = React.createElement(StormDoorDrawing, { sub: op.window_subtype ?? 'Full glass', hingeSide: op.opening_direction ?? undefined, widthIn: wIn, heightIn: hIn, uid }); break
    case 'interior':
      element = React.createElement(InteriorDoorDrawing, { sub: op.window_subtype ?? 'Single', doorSwing: op.opening_direction ?? undefined, glassInsert: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn }); break
    default:
      element = React.createElement(ShapeOutlineDrawing, { shape, widthIn: wIn, heightIn: hIn, uid }); break
  }

  return renderToStaticMarkup(element)
}
