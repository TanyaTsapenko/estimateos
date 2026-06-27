import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { CasementDrawing, SliderDrawing, HopperDrawing } from '@/components/estimate-builder-v2/casement-slider-hopper-drawing'
import { AwningDrawing, SingleHungDrawing, DoubleHungDrawing, TiltTurnDrawing } from '@/components/estimate-builder-v2/awning-hung-tiltturn-drawing'
import { EntryDoorDrawing, DoubleEntryDrawing } from '@/components/estimate-builder-v2/entry-door-drawing'
import { FrenchDoorDrawing, GardenDoorDrawing } from '@/components/estimate-builder-v2/french-garden-drawing'
import { PatioDoorDrawing } from '@/components/estimate-builder-v2/patio-door-drawing'
import { StormDoorDrawing, InteriorDoorDrawing } from '@/components/estimate-builder-v2/storm-interior-drawing'
import { ShapeOutlineDrawing } from '@/components/estimate-builder-v2/shape-outline-drawing'
import { BayDrawing, BowDrawing } from '@/components/estimate-builder-v2/bay-bow-drawing'

const OLD_TO_V2: Record<string, string> = {
  window_dh:     'doubleHung', window_sh: 'singleHung', window_cas: 'casement',
  window_sl:     'slider',     window_fix: 'picture',   window_awn: 'awning',
  window_hopper: 'hopper',     window_tilt: 'tiltTurn', window_trans: 'transom',
  window_arch:   'special',    window_bay: 'bay',        window_bow: 'bow',
  window_combo:  'combination', window_egr: 'picture',
  door_entry:    'entry',      door_double: 'doubleEntry', door_french: 'french',
  door_garden:   'garden',     door_patio: 'patio',       door_storm: 'storm',
  door_int:      'interior',
}

function buildElement(op: any): React.ReactElement {
  const typeId = OLD_TO_V2[op.type] ?? op.type
  const wIn    = op.width_in  ?? undefined
  const hIn    = op.height_in ?? undefined
  const sl     = op.sidelight_left && op.sidelight_right ? 'Both'
                 : op.sidelight_left  ? 'Left'
                 : op.sidelight_right ? 'Right'
                 : undefined

  switch (typeId) {
    case 'casement':
      return React.createElement(CasementDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'slider':
      return React.createElement(SliderDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'endVent':
      return React.createElement(SliderDrawing, {
        sub: (op.window_subtype ?? '').toLowerCase().includes('double') ? 'doubleendvent' : 'endvent',
        widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf',
      })
    case 'hopper':
      return React.createElement(HopperDrawing, { widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'awning':
      return React.createElement(AwningDrawing, { sub: op.window_subtype ?? undefined, widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'singleHung':
      return React.createElement(SingleHungDrawing, { widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'doubleHung':
      return React.createElement(DoubleHungDrawing, { widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'tiltTurn':
      return React.createElement(TiltTurnDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'bay':
      return React.createElement(BayDrawing, { sub: op.window_subtype ?? undefined, widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf', bayAngle: op.bay_angle ?? undefined })
    case 'bow':
      return React.createElement(BowDrawing, { sub: op.window_subtype ?? '', widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'entry':
      return React.createElement(EntryDoorDrawing, { sub: op.window_subtype ?? '', doorSwing: op.opening_direction ?? undefined, glassInsert: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn })
    case 'doubleEntry':
      return React.createElement(DoubleEntryDrawing, { sub: op.window_subtype ?? '', doubleDoorSwing: op.opening_direction ?? undefined, glassInsert: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn })
    case 'french':
      return React.createElement(FrenchDoorDrawing, { sub: op.window_subtype ?? 'Double french', doorSwing: op.opening_direction ?? undefined, glassSize: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn })
    case 'garden':
      return React.createElement(GardenDoorDrawing, { doorSwing: op.opening_direction ?? undefined, sidelights: sl, transomAbove: op.transom_above ? 'Rect' : undefined, widthIn: wIn, heightIn: hIn })
    case 'patio':
      return React.createElement(PatioDoorDrawing, { sub: op.window_subtype ?? '2 Panel', widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'storm':
      return React.createElement(StormDoorDrawing, { sub: op.window_subtype ?? 'Full glass', hingeSide: op.opening_direction ?? undefined, widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
    case 'interior':
      return React.createElement(InteriorDoorDrawing, { sub: op.window_subtype ?? 'Single', doorSwing: op.opening_direction ?? undefined, glassInsert: op.glass_type ?? undefined, widthIn: wIn, heightIn: hIn })
    default:
      return React.createElement(ShapeOutlineDrawing, { widthIn: wIn, heightIn: hIn, uid: op.id ?? 'pdf' })
  }
}

export async function renderDrawingPng(op: any, widthPx: number, heightPx: number): Promise<string> {
  const el  = buildElement(op)
  const svg = renderToStaticMarkup(el)
  const buf = await sharp(Buffer.from(svg))
    .resize(widthPx, heightPx, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()
  return `data:image/png;base64,${buf.toString('base64')}`
}
