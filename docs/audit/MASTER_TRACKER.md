# Master Tracker

## DONE

### Week 2 — Invoice Math (July 3–6, 2026)

**Tax на Additional charges фінального інвойсу** — be34032
- GST on additional charges sourced from `estimates.tax_rate`, stored in JSONB breakdown, rendered on invoice page / PDF / email

**Одна політика округлення наскрізь** — b4e3b49, ecdd691
- 2-decimal formatting on ALL invoice surfaces incl. Project total; invoices list header overflow fixed

---

### Week 3 — Contract Surfaces & Diagram Consolidation (July 3–6, 2026)

**БАГ: контракт малює прямокутник-hung замість circle-casement** — bb885bd + 62dc568 (diagram consolidation)
- Contract PDF: shape-aware renderer (`openingSvgString` pipeline); `windowSvgPdf.tsx` deleted; human type names; guarded dims; octagon coord offset fixed
- One shared `OpeningDrawing` dispatcher on all web surfaces; casing normalization for shape values; octagon container height fix (estimate/builder)
- Builder shape preview iOS: container `minHeight` fix

**A2: єдина buildContractModel** — PARTIAL *(2 renderers remain, down from 4+)*
- Web surfaces: one `OpeningDrawing` dispatcher shared across estimate detail, contract pages, builder review (2ef0311, fcc3139, 0709078, e9c2079)
- PDF: one `openingSvgString` pipeline shared across contract and estimate PDFs
- Remaining gap: web renderer (React SVG) and PDF renderer (server-side string) are still separate; pixel-parity accepted as divergence (see Backlog)

**Твій новий A4-дизайн контракту** — 598ce84, 8ce3db0
- Document-style redesign on all 3 contract surfaces: dashboard preview, public signing page, PDF
- Contract diagrams use technical stroke (colour stripped)

**Additions during Week 3 sessions (not in original plan):**
- Default clauses apply without visiting Settings — `getEffectiveClauses` on 4 surfaces (ec96ba5)
- Province added to dashboard contract select
- Public signed page: full specs per opening (expanded `OPENING_COLS`) (f9a0449)
- Silent install/material defaults suppressed on contract surfaces
- Combination sectioned breakdown: per-section list with mini thumbnails on estimate/contract; text list in PDF (92a2f29, 9fe11fa)
- Combination: PDF renders real sections (was hardcoded 3-panel); sections JSON-string parsing guards — crash fix (0709078, e9c2079)
- 100% deposit double-charge blocked (final-invoice-exists guard) (b4e3b49)
- `invoices.additional_charges` added to `schema.sql` — schema drift fix (ecdd691)

---

### Week 3.5 — FAB suppression (PARTIAL)

**FAB: ховати на create/edit/sign** — PARTIAL
- ✅ Contract sign route suppressed (14515d8)
- ⬜ Remaining ~9 screens (estimate create/edit, appointment create/edit, client create/edit, invoice page, and others) — see Backlog

---

## BACKLOG / DEFERRED

- **FAB: remaining ~9 screens** (estimate/appointment/client create+edit, invoice page) — Week 3.5 continuation
- Octagon still broken on contract page (`window_subtype` data path — diagnostic drafted)
- `bay`/`bow` `panel_type` vs `center_window_type` legacy field normalization
- Web vs PDF renderer pixel-parity (accepted divergence, documented)
- Extract color constants from `WindowDiagram.tsx`, delete file
- Product onboarding flow (signature + clauses setup before first contract) — **pre-launch priority**
- Estimate builder colour fields are free text (no validation) — `'eee'` can reach contracts
- Project address field on contracts (client address ≠ install address)
- Stripe / payment integration — 0% implemented; billing UI is 100% hardcoded fake data
- Fake billing data in Settings ("Pro Plan · CA$149/mo", card ending 4242, usage stats) — buttons do nothing
- `endVent` type falls back to CA$800 (not in `OPENING_TYPES`, not in `V2_TO_OLD_TYPE_KEY`)
- Trim surcharge pricing not wired in contract view (2× TODO in `/sign/contract/[id]/page.tsx` lines 350, 710)
- Draft persistence: refreshing estimate builder loses all data
- Team-scoping gaps: clients, appointments, contracts, invoices pages not team-scoped (estimators see wrong data)
- `estimates` table: open public READ RLS policy — `close_estimates_public_rls.sql` drop status unknown in prod
- `contracts` table RLS: state indeterminate from code alone
- iOS PDF viewing: blank iframe in iOS Safari; `window.open` fallback not implemented
- `console.log` in team-invite route leaks RESEND_API_KEY prefix to server logs
