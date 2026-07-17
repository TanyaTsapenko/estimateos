'use client'
import React from 'react'
import { OPENING_TYPES, fmtCAD } from '@/lib/pricing'
import { V2_TYPE_LABELS, V2_TO_OLD_TYPE_KEY } from '@/lib/v2/openingTypes'
import { getColourLabel, getGlassLabel, getInteriorColourLabel, getSubtypeLabel } from '@/lib/openingLabels'
import { substituteProvince } from '@/lib/provinces'
import { OpeningDrawing } from '@/components/estimate-builder-v2/opening-drawing'
import { Download } from 'lucide-react'

const F      = '"Inter", system-ui, sans-serif'
const HAIR   = 'rgba(15,23,42,0.08)'
const HAIR_S = 'rgba(15,23,42,0.14)'
const BLUE   = '#2563EB'
const BLUE_D = '#1D4ED8'
const INK    = '#0B1220'
const INK_M  = '#475467'
const INK_S  = '#94A0B4'

const INSTALL_LABELS: Record<string, string> = { retrofit: 'Retrofit', fullframe: 'Full frame', stud_to_stud: 'Stud to Stud' }
const MATERIAL_LABELS: Record<string, string> = { vinyl: 'Vinyl', wood: 'Wood', fiberglass: 'Fiberglass', aluminum: 'Aluminum', composite: 'Composite' }
const SECTION_TYPE_MAP: Record<string, string> = {
  'Casement': 'casement', 'Fixed': 'picture', 'Picture': 'picture',
  'Slider': 'slider', 'Awning': 'awning', 'Single Hung': 'singleHung', 'Double Hung': 'doubleHung',
}

function parseSections(raw: any): { type: string; width: number }[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {} }
  return []
}

const sheetStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 6,
  boxShadow: '0 1px 3px rgba(15,23,42,0.10), 0 8px 24px rgba(15,23,42,0.08)',
  padding: '22px 20px 26px',
  marginBottom: 14,
}

function SecTitle({ children, mt }: { children: React.ReactNode; mt?: number }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em', paddingBottom: 7, borderBottom: `1px solid ${HAIR_S}`, marginTop: mt, fontFamily: F }}>
      {children}
    </div>
  )
}

function DetCard({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px', height: '100%', boxSizing: 'border-box', ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

export interface ContractOpening {
  id: string; type: string; qty: number; total_cost: number
  window_subtype?: string | null
  width_in?: number | null; height_in?: number | null
  colour?: string | null; colour_name?: string | null; custom_colour_label?: string | null
  colour_palette_id?: string | null
  glass?: string | null; glass_kind?: string | null; low_e?: boolean | null; tempered?: boolean | null
  glass_type?: string | null
  shape?: string | null; custom_shape_label?: string | null; has_screen?: boolean | null
  grid_pattern?: string | null; opening_direction?: string | null
  panels_count?: string | null; bay_angle?: string | null
  transom_panes?: string | null; sidelight_left?: number | null; sidelight_right?: number | null
  transom_above?: boolean | null
  sections?: { type: string; width: number }[] | null
  install?: string | null; material?: string | null
  room?: string | null; notes?: string | null
  interior_colour?: string | null; interior_colour_name?: string | null
  interior_colour_palette_id?: string | null
  pane?: string | null
  lockset?: string | null; deadbolt?: boolean | null; deadbolt_type?: string | null
  brickmould?: string | null; jamb?: string | null; threshold_type?: string | null
  door_style?: string | null; glass_insert?: string | null; glass_finish?: string | null
  screen_coverage?: string | null; ventilation_type?: string | null
  closer_type?: string | null; pet_door?: string | null
  seat_board?: boolean | null; head_board?: boolean | null
  astragal?: string | null; astragal_type?: string | null
  core_type?: string | null
  energy_rating?: string | null
}

export interface ContractClause {
  id: string; title: string; content: string; enabled?: boolean; order?: number
}

export interface ContractDocumentProps {
  companyName: string
  contractDisplayId: string
  createdDate: string
  logoUrl: string | null
  companyPhone: string | null
  companyEmail: string | null
  companyAddress: string | null
  companyCityProvince: string | null
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
  clientAddress: string | null
  clientCityProvince: string | null
  openings: ContractOpening[]
  subtotal: number
  taxAmount: number
  taxLabel: string | null
  total: number
  discountAmount: number
  depositPct: number
  depositRequired?: boolean
  detCards: { label: string; value: string }[]
  enabledClauses: ContractClause[]
  province: string | null
  contractorSigUrl: string | null
  repName: string
  clientSignatureSlot: React.ReactNode
  clientSigDate: string
  downloadHref?: string
  bottomPadding?: number
}

export function ContractDocument({
  companyName, contractDisplayId, createdDate, logoUrl,
  companyPhone, companyEmail, companyAddress, companyCityProvince,
  clientName, clientPhone, clientEmail, clientAddress, clientCityProvince,
  openings, subtotal, taxAmount, taxLabel, total, discountAmount,
  depositPct, depositRequired = true,
  detCards, enabledClauses, province,
  contractorSigUrl, repName, clientSignatureSlot, clientSigDate,
  downloadHref, bottomPadding = 140,
}: ContractDocumentProps) {
  const depositAmt = total * (depositPct / 100)
  const balanceAmt = total - depositAmt

  return (
    <div style={{ padding: `12px 10px ${bottomPadding}px`, maxWidth: 390, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const, fontFamily: F }}>

      {/* ═══ SHEET 1 — SCOPE ═══ */}
      <div style={sheetStyle}>

        {/* Doc header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 15, borderBottom: `2px solid ${BLUE}`, marginBottom: 16 }}>
          <div style={{ height: 34, maxWidth: '46%', minWidth: 0, flexShrink: 0, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, background: BLUE, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{companyName.charAt(0).toUpperCase()}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' as const }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: BLUE }}>Installation Contract</div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 1 }}>{contractDisplayId}</div>
            <div style={{ fontSize: 10.5, color: INK_S, marginTop: 2 }}>{createdDate}</div>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px' }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 5 }}>Company</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{companyName}</div>
            <div style={{ fontSize: 10.5, color: INK_M, lineHeight: 1.6, wordBreak: 'break-word' as const }}>
              {companyPhone        && <div>{companyPhone}</div>}
              {companyEmail        && <div>{companyEmail}</div>}
              {companyAddress      && <div>{companyAddress}</div>}
              {companyCityProvince && <div>{companyCityProvince}</div>}
            </div>
          </div>
          <div style={{ background: '#F7F9FC', border: `1px solid ${HAIR}`, borderRadius: 10, padding: '11px 12px' }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 5 }}>Client</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{clientName || '—'}</div>
            <div style={{ fontSize: 10.5, color: INK_M, lineHeight: 1.6, wordBreak: 'break-word' as const }}>
              {clientPhone        && <div>{clientPhone}</div>}
              {clientEmail        && <div>{clientEmail}</div>}
              {clientAddress      && <div>{clientAddress}</div>}
              {clientCityProvince && <div>{clientCityProvince}</div>}
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <SecTitle>Scope of Work</SecTitle>

        {openings.map((op, i) => {
          const resolvedType = V2_TO_OLD_TYPE_KEY[op.type] || op.type
          const nameLabel = resolvedType === 'window_arch'
            ? 'Special shape'
            : (OPENING_TYPES[resolvedType]?.name ?? V2_TYPE_LABELS[op.type] ?? op.type)
          const name      = `${nameLabel}${op.window_subtype ? ` (${getSubtypeLabel(op as any)})` : ''}`
          const extCol    = op.colour && op.colour !== 'white' ? getColourLabel(op as any) : null
          const intCol    = getInteriorColourLabel(op as any)
          const glass     = getGlassLabel(op as any)
          const installLbl  = (op.install  && op.install  !== 'retrofit') ? (INSTALL_LABELS[op.install]   || op.install)  : null
          const materialLbl = (op.material && op.material !== 'vinyl')    ? (MATERIAL_LABELS[op.material] || op.material) : null
          const specExtras: string[] = []
          if (op.door_style)                                         specExtras.push(op.door_style)
          if (op.glass_insert && op.glass_insert !== 'None')         specExtras.push(op.glass_insert)
          if (op.glass_finish)                                       specExtras.push(op.glass_finish)
          if (op.lockset)                                            specExtras.push(op.lockset)
          if (op.deadbolt)                                           specExtras.push(op.deadbolt_type ? `Deadbolt — ${op.deadbolt_type}` : 'Deadbolt')
          if (op.brickmould && op.brickmould !== 'None')             specExtras.push(`${op.brickmould} brickmould`)
          if (op.jamb)                                               specExtras.push(`Jamb ${op.jamb}`)
          if (op.threshold_type)                                     specExtras.push(`${op.threshold_type} threshold`)
          if (op.screen_coverage && op.screen_coverage !== 'No Screen') specExtras.push(op.screen_coverage)
          if (op.ventilation_type)                                   specExtras.push(op.ventilation_type)
          if (op.closer_type && op.closer_type !== 'None')           specExtras.push(`${op.closer_type} closer`)
          if (op.pet_door && op.pet_door !== 'None')                 specExtras.push(`Pet door — ${op.pet_door}`)
          if (op.seat_board)                                         specExtras.push('Seat board')
          if (op.head_board)                                         specExtras.push('Head board')
          if (op.astragal && op.astragal !== 'None')                 specExtras.push(op.astragal_type ? `Astragal — ${op.astragal_type}` : 'Astragal')
          if (op.energy_rating)                                      specExtras.push(`Energy Rating: ${op.energy_rating}`)

          const isCombo   = op.type === 'combination' || op.type === 'window_combo'
          const comboSecs = isCombo ? parseSections(op.sections) : []
          const borderStyle = i < openings.length - 1 ? `1px solid ${HAIR}` : 'none'

          const specBlock = (extCol || intCol || glass || installLbl || materialLbl || specExtras.length > 0) && (
            <div style={{ fontSize: 11, color: INK_M, lineHeight: 1.6 }}>
              {(extCol || intCol) && (
                <div>
                  {extCol && <>Ext. <strong style={{ color: INK, fontWeight: 600 }}>{extCol}</strong></>}
                  {extCol && intCol && ' · '}
                  {intCol && <>Int. <strong style={{ color: INK, fontWeight: 600 }}>{intCol}</strong></>}
                </div>
              )}
              {glass && <div>Glass: <strong style={{ color: INK, fontWeight: 600 }}>{glass}</strong></div>}
              {(installLbl || materialLbl) && (
                <div>
                  {installLbl  && <>Install: <strong style={{ color: INK, fontWeight: 600 }}>{installLbl}</strong></>}
                  {installLbl && materialLbl && ' · '}
                  {materialLbl && <>Material: <strong style={{ color: INK, fontWeight: 600 }}>{materialLbl}</strong></>}
                </div>
              )}
              {specExtras.length > 0 && <div>{specExtras.join(' · ')}</div>}
            </div>
          )

          if (isCombo) {
            return (
              <div key={op.id} style={{ padding: '14px 0', borderBottom: borderStyle }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK, minWidth: 0 }}>{name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                </div>
                <div style={{ fontSize: 11, color: INK_S, marginBottom: 10 }}>
                  Qty {op.qty}{op.width_in && op.height_in ? ` · ${op.width_in}" × ${op.height_in}"` : ''}{comboSecs.length > 0 ? ` · ${comboSecs.length} sections` : ''}
                </div>
                <div style={{ width: '100%', marginBottom: 12 }}>
                  <OpeningDrawing op={{ ...op, type: resolvedType, colour: null }} hideComboLabels />
                </div>
                {comboSecs.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {comboSecs.map((sec, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: idx < comboSecs.length - 1 ? `1px solid ${HAIR}` : 'none' }}>
                        <div style={{ fontSize: 10, color: INK_S, width: 16, textAlign: 'right' as const, flexShrink: 0 }}>{idx + 1}.</div>
                        <div style={{ width: 64, flexShrink: 0, pointerEvents: 'none' as const }}>
                          <OpeningDrawing op={{ id: `${op.id}-s${idx}`, type: SECTION_TYPE_MAP[sec.type] ?? 'picture' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{sec.type}</span>
                          <span style={{ fontSize: 11, color: INK_S }}> · {sec.width}"</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {specBlock}
              </div>
            )
          }

          return (
            <div key={op.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: borderStyle }}>
              <div style={{ width: 74, flexShrink: 0, paddingTop: 2 }}>
                <OpeningDrawing op={{ ...op, type: resolvedType, colour: null }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{fmtCAD(op.total_cost)}</div>
                </div>
                <div style={{ fontSize: 11, color: INK_S, marginBottom: 5 }}>
                  Qty {op.qty}{op.width_in && op.height_in ? ` · ${op.width_in}" × ${op.height_in}"` : ''}
                </div>
                {specBlock}
              </div>
            </div>
          )
        })}

        {/* Totals */}
        <div style={{ paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: INK_M, padding: '3px 0' }}>
            <span>Subtotal</span>
            <span style={{ minWidth: 92, textAlign: 'right' as const, color: INK, fontWeight: 600 }}>{fmtCAD(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: INK_M, padding: '3px 0' }}>
              <span>Discount</span>
              <span style={{ minWidth: 92, textAlign: 'right' as const, color: '#16a34a', fontWeight: 600 }}>−{fmtCAD(discountAmount)}</span>
            </div>
          )}
          {taxLabel && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 12, color: INK_M, padding: '3px 0' }}>
              <span>{taxLabel}</span>
              <span style={{ minWidth: 92, textAlign: 'right' as const, color: INK, fontWeight: 600 }}>{fmtCAD(taxAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 15, fontWeight: 800, color: INK, padding: '8px 0', marginTop: 6, borderTop: `1px solid ${HAIR_S}` }}>
            <span>Total</span>
            <span style={{ minWidth: 92, textAlign: 'right' as const, color: BLUE_D, fontWeight: 800 }}>{fmtCAD(total)}</span>
          </div>
        </div>

        {/* Payment band */}
        {depositRequired && (
          <div style={{ background: '#F4F7FE', border: '1px solid rgba(37,99,235,0.14)', borderRadius: 8, padding: '12px 14px', marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
              <span style={{ color: BLUE_D, fontWeight: 700 }}>Deposit due upon signing ({depositPct}%)</span>
              <span style={{ color: BLUE_D, fontWeight: 800 }}>{fmtCAD(depositAmt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
              <span style={{ color: INK_M }}>Balance on completion ({100 - depositPct}%)</span>
              <span style={{ fontWeight: 700 }}>{fmtCAD(balanceAmt)}</span>
            </div>
          </div>
        )}

        {/* Detail cards */}
        {detCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 16, alignItems: 'stretch' }}>
            {detCards.map((d, i) => (
              <DetCard key={d.label} label={d.label} value={d.value} fullWidth={detCards.length % 2 === 1 && i === detCards.length - 1} />
            ))}
          </div>
        )}

        {/* Sheet 1 footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: INK_S, marginTop: 22, paddingTop: 10, borderTop: `1px solid ${HAIR}` }}>
          <span>{companyName} · Installation Contract</span>
          <span>Page 1</span>
        </div>
      </div>

      {/* ═══ SHEET 2 — TERMS + SIGNATURES ═══ */}
      <div style={sheetStyle}>

        <SecTitle>Terms &amp; Conditions</SecTitle>
        {enabledClauses.map((clause, i) => (
          <div key={clause.id} style={{ padding: '11px 0', borderBottom: i < enabledClauses.length - 1 ? `1px solid ${HAIR}` : 'none' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 3 }}>{clause.title}</div>
            <div style={{ fontSize: 11, color: INK_M, lineHeight: 1.65 }}>
              {substituteProvince(clause.content, province)}
            </div>
          </div>
        ))}

        <SecTitle mt={22}>Signatures</SecTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 18 }}>

          {/* Contractor */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 8 }}>Contractor</div>
            <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              {contractorSigUrl
                ? <img src={contractorSigUrl} alt="Contractor signature" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
                : <div style={{ height: 64 }} />
              }
            </div>
            <div style={{ borderTop: '1.5px solid ' + INK, marginTop: 6, paddingTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{companyName}</div>
              <div style={{ fontSize: 10, color: INK_S, marginTop: 1 }}>{[repName, createdDate].filter(Boolean).join(' · ')}</div>
            </div>
          </div>

          {/* Client — slot injected by parent */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: INK_S, marginBottom: 8 }}>Client</div>
            <div style={{ height: 64 }}>
              {clientSignatureSlot}
            </div>
            <div style={{ borderTop: '1.5px solid ' + INK, marginTop: 6, paddingTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{clientName || '—'}</div>
              <div style={{ fontSize: 10, color: INK_S, marginTop: 1 }}>{clientSigDate}</div>
            </div>
          </div>
        </div>

        {/* Sheet 2 footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: INK_S, marginTop: 22, paddingTop: 10, borderTop: `1px solid ${HAIR}` }}>
          <span>{companyName} · Installation Contract</span>
          <span>Page 2 of 2</span>
        </div>
      </div>

      {/* Download link (signed/view mode) */}
      {downloadHref && (
        <a
          href={downloadHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px 0', background: BLUE, color: '#fff', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 24, textDecoration: 'none', boxSizing: 'border-box' as const }}
        >
          <Download size={16} /> Download Contract
        </a>
      )}
    </div>
  )
}
