# Master Tracker

## DONE

### Invoice Math (July 3–6, 2026) — be34032, b4e3b49, ecdd691
- GST on additional charges (from `estimates.tax_rate`, stored in JSONB breakdown, rendered on page/PDF/email)
- 100% deposit double-charge blocked (final-invoice-exists guard)
- Schema drift: `invoices.additional_charges` added to `schema.sql`
- 2-decimal formatting on ALL invoice surfaces incl. Project total; invoices list header overflow fixed

### Contract Surfaces (July 3–6, 2026) — bb885bd, 14515d8, 598ce84, 2ef0311, ec96ba5, f9a0449, 8ce3db0 + follow-ups
- Contract PDF: shape-aware renderer (`openingSvgString` pipeline), `windowSvgPdf.tsx` deleted; human type names; guarded dims; octagon coord offset fixed
- Default clauses apply without visiting Settings (`getEffectiveClauses` on 4 surfaces); province added to dashboard contract select
- Public signed page: full specs per opening (expanded `OPENING_COLS`)
- FAB suppressed on contract sign route
- Document-style redesign on all 3 contract surfaces (dashboard preview, public page, PDF)
- Silent install/material defaults suppressed on contract surfaces
- Contract diagrams use technical stroke (colour stripped)

### Diagram Consolidation (July 3–6, 2026) — 62dc568, 2ef0311, fcc3139, 0709078, e9c2079, 92a2f29, 9fe11fa
- One shared `OpeningDrawing` dispatcher on all web surfaces; legacy `WindowDiagram` component unused (file kept for color constants)
- Casing normalization for shape values; octagon container height fix (estimate/builder)
- Combination: PDF renders real sections (was hardcoded 3-panel); sections JSON-string parsing guards (crash fix); wider containers; sectioned breakdown with per-section list on estimate/contract/PDF
- Builder shape preview iOS: container `minHeight` fix

---

## BACKLOG / DEFERRED

- Octagon still broken on contract page (`window_subtype` data path — diagnostic drafted)
- `bay`/`bow` `panel_type` vs `center_window_type` legacy field normalization
- Web vs PDF renderer pixel-parity (accepted divergence, documented)
- Extract color constants from `WindowDiagram.tsx`, delete file
- Product onboarding flow (signature + clauses setup before first contract) — pre-launch priority
- Estimate builder colour fields are free text (no validation) — `'eee'` can reach contracts
- Project address field on contracts (client address ≠ install address)
