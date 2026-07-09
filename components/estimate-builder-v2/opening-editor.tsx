'use client'
import { useState } from 'react'
import { C, F, SECTIONS, getType, type Opening, type Palettes, type CombinationSection } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { MiniDiagram } from './diagram'
import { FieldLabel, SelectBox, FieldGrid, type PickerState } from './primitives'
import { SectionTitle } from './builder-header'
import { PhotosUpload, type PhotoSlot } from './photos-upload'
import { SectionBuilder } from './section-builder'
import { BayDrawing, BowDrawing } from './bay-bow-drawing'
import { ShapeOutlineDrawing } from './shape-outline-drawing'
import { CasementDrawing, SliderDrawing, HopperDrawing } from './casement-slider-hopper-drawing'
import { AwningDrawing, SingleHungDrawing, DoubleHungDrawing, TiltTurnDrawing } from './awning-hung-tiltturn-drawing'
import { EntryDoorDrawing, DoubleEntryDrawing } from './entry-door-drawing'
import { FrenchDoorDrawing, GardenDoorDrawing } from './french-garden-drawing'
import { PatioDoorDrawing } from './patio-door-drawing'
import { StormDoorDrawing, InteriorDoorDrawing } from './storm-interior-drawing'

// Groups the type's fields into sections, merging any subtype-conditional extras
function groupSections(op: Opening) {
  const t = getType(op.typeId)
  const extraKeys = t.extraFieldsBySubtype?.[op.sub] ?? []
  const extraValueKeys = Object.entries(t.extraFieldsByValue ?? {})
    .filter(([, cond]) => {
      const v = op.vals[cond.field]
      if (cond.notEmpty) return v !== undefined && v !== null && v !== '' && v !== false
      return v === cond.value
    })
    .map(([k]) => k)
  const allKeys = [
    ...t.fields,
    ...extraKeys.filter(k => !t.fields.includes(k)),
    ...extraValueKeys.filter(k => !t.fields.includes(k)),
  ]
  return SECTIONS
    .map(s => ({ ...s, keys: allKeys.filter(k => F[k] && F[k].sec === s.id) }))
    .filter(s => s.keys.length > 0)
}

// Type + Subtype header, always visible
function EssentialsHead({ op, openType, onSub }: {
  op: Opening
  openType: () => void
  onSub: (subs: string[]) => void
}) {
  const t = getType(op.typeId)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <FieldLabel>Product type</FieldLabel>
        <button onClick={openType} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 13, border: `1px solid ${C.blueLine}`, background: C.blueSoft, textAlign: 'left', cursor: 'pointer' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MiniDiagram typeId={op.typeId} size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{t.name}</div>
            <div style={{ fontSize: 11.5, color: C.blueDeep, fontWeight: 600 }}>{t.cat === 'window' ? 'Window' : 'Door'} · tap to change</div>
          </div>
          <EBIcon name="chev-r" size={18} color={C.blue} />
        </button>
      </div>
      {t.subs.length > 0 && (
        <div>
          <FieldLabel>Subtype</FieldLabel>
          <SelectBox value={op.sub} placeholder="— Select —" onClick={() => onSub(t.subs)} />
        </div>
      )}
    </div>
  )
}

type Props = {
  op: Opening
  onVal: (k: string, v: string | number | boolean) => void
  onSub: (subs: string[]) => void
  openType: () => void
  openPicker: (k: string, def: { label: string; opts: string[] }, value: string | undefined, onPick: (v: string) => void) => void
  setPicker: (p: PickerState) => void
  palettes?: Palettes
  userId?: string
  onPhotoUpdate?: (slot: PhotoSlot, url: string | null) => void
  onSections?: (sections: CombinationSection[]) => void
}

function resolveFrameColor(
  extColour: string | undefined,
  framePalette?: Array<{ id: string; hex: string }>
): string | undefined {
  if (!extColour || extColour === 'White') return undefined
  const entry = framePalette?.find(p => p.id === extColour)
  if (entry && entry.hex !== '#FFFFFF') return entry.hex
  const lc = extColour.toLowerCase()
  if (lc.includes('black')) return '#1a1a1a'
  if (lc.includes('bronze')) return '#6b4423'
  return '#475467'
}

export function OpeningEditor({ op, onVal, onSub, openType, openPicker, setPicker, palettes, userId, onPhotoUpdate, onSections }: Props) {
  const filterKeys = (keys: string[]) => {
    if (op.typeId === 'transom' && op.vals.install !== 'Retrofit') {
      return keys.filter(k => k !== 'condition')
    }
    return keys
  }
  const groups = groupSections(op).map(g => ({ ...g, keys: filterKeys(g.keys) }))
  const basics = groups.find(g => g.id === 'basics')
  const rest = groups.filter(g => g.id !== 'basics')

  const [openSecs, setOpenSecs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (rest[0]) init[rest[0].id] = true
    return init
  })
  const toggle = (id: string) => setOpenSecs(o => ({ ...o, [id]: !o[id] }))

  const openSubPicker = (subs: string[]) => {
    setPicker({
      def: { label: 'Subtype', opts: subs },
      value: op.sub,
      onPick: (s) => onSub([s]),
    })
  }

  return (
    <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <EssentialsHead op={op} openType={openType} onSub={openSubPicker} />
      <div style={{ height: 1, background: C.border, margin: '16px 0 6px' }} />

      {basics && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px 12px' }}>
            <EBIcon name={basics.icon} size={15} color={C.inkMid} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: C.inkSoft }}>{basics.label}</span>
          </div>
          <div>
          {op.typeId === 'combination' ? (
            <>
              <SectionBuilder
                sections={Array.isArray(op.sections) && op.sections.length > 0 ? op.sections : (() => { if (typeof op.sections === 'string') { try { const p = JSON.parse(op.sections); if (Array.isArray(p) && p.length > 0) return p } catch {} } return [{ type: 'Picture', width: 36 }] })()}
                onChange={onSections ?? (() => {})}
                heightIn={op.vals.oheight !== undefined ? parseFloat(String(op.vals.oheight)) || undefined : undefined}
                glassType={op.vals.glassType as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys.filter(k => k !== 'owidth')} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'bay' ? (
            <>
              <BayDrawing
                bayAngle={op.vals.bayAngle as string | undefined}
                centerWindowType={op.vals.centerWindowType as string | undefined}
                sideUnit={op.vals.sideUnit as string | undefined}
                sub={op.sub}
                widthIn={op.vals.owidth !== undefined ? parseFloat(String(op.vals.owidth)) || undefined : undefined}
                heightIn={op.vals.oheight !== undefined ? parseFloat(String(op.vals.oheight)) || undefined : undefined}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                uid={op.tempId}
                glassType={op.vals.glassType as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'bow' ? (
            <>
              <BowDrawing
                sub={op.sub}
                panelType={op.vals.panelType as string | undefined}
                sideUnit={op.vals.sideUnit as string | undefined}
                widthIn={op.vals.owidth !== undefined ? parseFloat(String(op.vals.owidth)) || undefined : undefined}
                heightIn={op.vals.oheight !== undefined ? parseFloat(String(op.vals.oheight)) || undefined : undefined}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                uid={op.tempId}
                glassType={op.vals.glassType as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'casement' ? (
            <>
              <CasementDrawing
                shape={op.vals.shape as string | undefined}
                sub={op.sub}
                activePanel={op.vals.activePanel as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'slider' ? (
            <>
              <SliderDrawing
                sub={op.sub}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'endVent' ? (
            <>
              <SliderDrawing
                sub={op.sub?.toLowerCase().includes('double') ? 'doubleendvent' : 'endvent'}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'hopper' ? (
            <>
              <HopperDrawing
                openingAngle={op.vals.openingAngle as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                glassType={op.vals.glassType as string | undefined}
                uid={op.tempId}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'awning' ? (
            <>
              <AwningDrawing
                sub={op.sub}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'singleHung' ? (
            <>
              <SingleHungDrawing
                shape={op.vals.shape as string | undefined}
                sub={op.sub}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'doubleHung' ? (
            <>
              <DoubleHungDrawing
                sub={op.sub}
                topSashOperable={op.vals.topSashOperable as boolean | undefined}
                bottomSashOperable={op.vals.bottomSashOperable as boolean | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'tiltTurn' ? (
            <>
              <TiltTurnDrawing
                sub={op.sub}
                openDir={op.vals.openDir as string | undefined}
                openMode={op.vals.openMode as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                glassType={op.vals.glassType as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'entry' ? (
            <>
              <EntryDoorDrawing
                sub={op.sub}
                doorSwing={op.vals.doorSwing as string | undefined}
                glassInsert={op.vals.glassInsert as string | undefined}
                doorStyle={op.vals.doorStyle as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'doubleEntry' ? (
            <>
              <DoubleEntryDrawing
                sub={op.sub}
                doubleDoorSwing={op.vals.doubleDoorSwing as string | undefined}
                astragalType={op.vals.astragalType as string | undefined}
                glassInsert={op.vals.glassInsert as string | undefined}
                doorStyle={op.vals.doorStyle as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'french' ? (
            <>
              <FrenchDoorDrawing
                sub={op.sub}
                doorSwing={op.vals.doorSwing as string | undefined}
                activePanel={op.vals.activePanel as string | undefined}
                astragal={op.vals.astragal as string | undefined}
                glassSize={op.vals.glassSize as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'garden' ? (
            <>
              <GardenDoorDrawing
                doorSwing={op.vals.doorSwing as string | undefined}
                glassSize={op.vals.glassSize as string | undefined}
                sidelights={op.vals.sidelights as string | undefined}
                transomAbove={op.vals.transomAbove as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'patio' ? (
            <>
              <PatioDoorDrawing
                sub={op.sub}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                glassType={op.vals.glassType as string | undefined}
                screen={op.vals.screen as string | undefined}
                uid={op.tempId}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'storm' ? (
            <>
              <StormDoorDrawing
                sub={op.sub}
                hingeSide={op.vals.hingeSide as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                glassType={op.vals.glassType as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : op.typeId === 'interior' ? (
            <>
              <InteriorDoorDrawing
                sub={op.sub}
                doorSwing={op.vals.doorSwing as string | undefined}
                glassInsert={op.vals.glassInsert as string | undefined}
                doorStyle={op.vals.doorStyle as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : (op.typeId === 'picture' || op.typeId === 'transom' || op.typeId === 'special') ? (
            <>
              <ShapeOutlineDrawing
                shape={op.typeId === 'special' ? op.sub : op.vals.shape as string | undefined}
                transomPanes={op.typeId === 'transom' ? op.vals.transomPanes as string | undefined : undefined}
                position={op.vals.position as string | undefined}
                widthIn={op.vals.width !== undefined ? parseFloat(String(op.vals.width)) || undefined : undefined}
                heightIn={op.vals.height !== undefined ? parseFloat(String(op.vals.height)) || undefined : undefined}
                uid={op.tempId}
                grid={op.vals.grid as string | undefined}
                grilleType={op.vals.grilleType as string | undefined}
                glassType={op.vals.glassType as string | undefined}              />
              <div style={{ height: 12 }} />
              <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
            </>
          ) : (
            <FieldGrid keys={basics.keys} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
          )}
          </div>
        </>
      )}

      <div style={{ marginTop: 8 }}>
        {rest.map(g => (
          <div key={g.id} style={{ borderTop: `1px solid ${C.border}` }}>
            <SectionTitle icon={g.icon} label={g.label} open={!!openSecs[g.id]} onToggle={() => toggle(g.id)} />
            {openSecs[g.id] && (
              <div style={{ padding: '2px 0 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {g.keys.includes('photos') && userId && onPhotoUpdate && (
                  <PhotosUpload op={op} userId={userId} onChange={onPhotoUpdate} />
                )}
                <FieldGrid keys={g.keys.filter(k => k !== 'photos')} op={op} onVal={onVal} openPicker={openPicker} palettes={palettes} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
