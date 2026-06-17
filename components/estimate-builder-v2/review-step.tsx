'use client'
import { useState } from 'react'
import { C, SETTINGS, getType, type Opening } from '@/lib/v2/openingTypes'
import { type ClientInfo } from './client-step'
import { MiniDiagram } from './diagram'

function money(n: number) {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.inkSoft, marginBottom: 8 }}>
      {children}
    </div>
  )
}

type Props = {
  clientInfo: ClientInfo
  openings: Opening[]
  prices: number[]
  onEditOpenings: () => void
  onSave: () => void
}

export function ReviewStep({ clientInfo, openings, prices, onEditOpenings, onSave }: Props) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('')

  const subtotal = prices.reduce((s, p) => s + p, 0)
  const discountAmt = discountValue
    ? discountType === 'percent'
      ? subtotal * (Math.min(parseFloat(discountValue) || 0, 100) / 100)
      : Math.min(parseFloat(discountValue) || 0, subtotal)
    : 0
  const afterDiscount = subtotal - discountAmt
  const taxAmount = afterDiscount * SETTINGS.taxRate
  const total = afterDiscount + taxAmount

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Client card ── */}
      <div>
        <SectionLabel>Client</SectionLabel>
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 99, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {clientInfo.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{clientInfo.name}</div>
            {clientInfo.address && (
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>{clientInfo.address}</div>
            )}
            {(clientInfo.phone || clientInfo.email) && (
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>
                {[clientInfo.phone, clientInfo.email].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── What's included ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <SectionLabel>
            What&apos;s included ({openings.length})
          </SectionLabel>
          <button
            onClick={onEditOpenings}
            style={{ fontSize: 12, fontWeight: 700, color: C.blue, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}
          >
            Edit
          </button>
        </div>
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
          {openings.map((op, i) => {
            const t = getType(op.typeId)
            const w = op.vals.width || op.vals.owidth
            const h = op.vals.height || op.vals.oheight
            const dimStr = w && h ? `${w}×${h}"` : ''
            const room = op.vals.room as string | undefined
            const qty = (op.vals.qty as number) || 1
            const unitPrice = prices[i] / qty
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < openings.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MiniDiagram typeId={op.typeId} size={22} color={C.blue} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                    {qty > 1 ? `${qty}× ` : ''}{t.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[op.sub, dimStr, room].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{money(prices[i])}</div>
                  {qty > 1 && (
                    <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{money(unitPrice)} ea</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Discount ── */}
      <div>
        <SectionLabel>Discount (optional)</SectionLabel>
        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '13px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 9, border: `1px solid ${C.borderStrong}`, overflow: 'hidden', flexShrink: 0 }}>
            <button
              onClick={() => setDiscountType('fixed')}
              style={{ width: 42, height: 40, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                background: discountType === 'fixed' ? C.blue : 'transparent',
                color: discountType === 'fixed' ? '#fff' : C.inkMid }}
            >$</button>
            <button
              onClick={() => setDiscountType('percent')}
              style={{ width: 42, height: 40, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                background: discountType === 'percent' ? C.blue : 'transparent',
                color: discountType === 'percent' ? '#fff' : C.inkMid }}
            >%</button>
          </div>
          <input
            type="number"
            min="0"
            placeholder={discountType === 'fixed' ? '0.00' : '0'}
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            style={{ flex: 1, height: 40, padding: '0 12px', borderRadius: 9, border: `1px solid ${C.borderStrong}`, background: C.card, fontSize: 15, fontWeight: 600, color: C.ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ── Summary ── */}
      <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: C.inkMid, fontWeight: 500 }}>Subtotal</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(subtotal)}</span>
        </div>
        {discountAmt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: C.green, fontWeight: 500 }}>
              Discount{discountType === 'percent' && discountValue ? ` (${discountValue}%)` : ''}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.green, fontVariantNumeric: 'tabular-nums' }}>−{money(discountAmt)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, color: C.inkMid, fontWeight: 500 }}>{SETTINGS.taxLabel}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{money(taxAmount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{money(total)}</span>
        </div>
      </div>

      {/* ── Save button ── */}
      <button
        onClick={onSave}
        style={{ width: '100%', height: 52, borderRadius: 13, border: 'none', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: '0 6px 20px rgba(59,108,255,0.35)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}
      >
        Save estimate →
      </button>
    </div>
  )
}
