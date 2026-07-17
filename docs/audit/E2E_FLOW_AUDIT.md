# EstimateOS — End-to-End Flow Audit

> Pedantic read-only audit. Every label, color, variable, code path, and DB column traced to exact file:line.
> Generated 2026-07-17 from three parallel read agents covering all app layers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Auth & Onboarding](#2-auth--onboarding)
3. [Estimate Builder](#3-estimate-builder)
4. [Drawing System](#4-drawing-system)
5. [Public Estimate Page](#5-public-estimate-page)
6. [Contract System](#6-contract-system)
7. [Dashboard Home](#7-dashboard-home)
8. [Invoices Page](#8-invoices-page)
9. [Appointments Page](#9-appointments-page)
10. [Email System](#10-email-system)
11. [PDF Generation](#11-pdf-generation)
12. [Pricing Engine](#12-pricing-engine)
13. [Library Utilities](#13-library-utilities)
14. [Security & Data Integrity](#14-security--data-integrity)

---

## 1. Architecture Overview

**Stack:** Next.js App Router · TypeScript · Supabase (Postgres + Storage + Auth) · Resend (email) · Upstash Redis (rate limiting)

**Key directories:**

| Path | Purpose |
|------|---------|
| `app/dashboard/` | All authenticated contractor pages |
| `app/auth/` | Login / register / reset |
| `app/estimate/[id]/` | Public client-facing estimate view |
| `app/sign/contract/[id]/` | Client contract signing page |
| `app/api/` | All server-side API routes |
| `components/estimate-builder-v2/` | Opening drawing SVG components |
| `lib/` | Shared utilities (pricing, activity, validation, team scoping) |
| `emails/` | Email HTML templates |

**DB tables referenced:** `estimates`, `estimate_openings`, `contracts`, `invoices`, `profiles`, `appointments`, `activity_log`, `notifications`, `team_invites`, `color_palette`, `price_lists`, `window_subtypes`

---

## 2. Auth & Onboarding

### Landing Page (`/app/page.tsx`, 74 lines)

**Hero:** "Close jobs before you leave the driveway"
Background: dark gradient

**3-point feature list:**
1. "Estimate on-site in minutes — Add windows & doors, get instant pricing"
2. "Client signs on your phone — Digital signature, legally binding"
3. "Invoice sent automatically — GST/HST calculated · PDF to client"

**Buttons:**
- "Get Started — Free Trial →" → `/auth/register`
- "Sign In →" → `/auth/login`

**Footer:** "14-day free trial · No credit card needed"

---

### Register Page (`/app/auth/register/page.tsx`, 228 lines)

**Hero:** "Free 14-day trial. No card."

**Form fields:**
- First name (required)
- Last name (required)
- Email (required, validated via `isValidEmail()`)
- Password (required, min 8 chars)
- Checkbox: "By signing up you agree to our Terms and Privacy Policy"

**Error messages (line 67–69):**
- "Email is required" / "Please enter a valid email address"
- "Password must be at least 8 characters"
- "Please agree to the Terms and Privacy Policy"

**Buttons:**
- "Create account →" (or "Creating account…" when loading)
- "Continue with Google"
- "Already have an account? Sign in"

**Post-signup flow (line 71–90):**
1. `supabase.auth.signUp()` called
2. If session exists → redirect `/onboarding`
3. If no session (email verification required) → redirect `/auth/check-email`
4. Calls `/api/register-profile` to create profile row

---

### Login Page (`/app/auth/login/page.tsx`, 178 lines)

**Hero:** "Sign in to your account."

**Form:** Email · Password · "Forgot password?" link → `/auth/forgot-password`

**Error messages (line 60–62):**
- "Email is required" / "Please enter a valid email address"
- "Password is required"

**Buttons:**
- "Sign in →" (or "Signing in…")
- "Continue with Google"
- "Don't have an account? Sign up free"

**Flow (line 57–66):** `supabase.auth.signInWithPassword()` → redirect `/dashboard` on success

---

## 3. Estimate Builder

**File:** `/app/dashboard/estimates/new/page.tsx` (956 lines)

### Opening Catalog

#### Windows (`CATALOG.window.types`)

| Type | Subtypes |
|------|---------|
| casement | Left casement, Right casement, Double casement, French casement, Fixed casement |
| awning | Standard awning, Push-out awning |
| picture | _(none)_ |
| slider | XO, OX, XX, End vent, Double end vent, Lift-out |
| endVent | Single end vent (XOX), Double end vent (OXO) |
| singleHung | Standard, Tilt-In |
| doubleHung | Standard, Tilt-in |
| hopper | Standard hopper, Basement hopper |
| tiltTurn | Single, Double |
| bay | 3 lite, 4 lite, 5 lite |
| bow | 4 lite, 5 lite, 6 lite, 7 lite |
| combination | _(multi-section builder)_ |
| special | Arch, Half arch, Circle, Half circle, Triangle, Trapezoid, Pentagon, Octagon, Gothic, Eyebrow, Custom |
| transom | Fixed transom, Operable transom |

#### Doors (`CATALOG.door.types`)

| Type | Subtypes |
|------|---------|
| entry | Single Door, Single + Left Sidelite, Single + Right Sidelite, Single + Double Sidelite, Single + Transom, Single + Sidelites + Transom |
| doubleEntry | Equal double, Unequal double, Double + Sidelites, Double + Transom, Double + Sidelites + Transom |
| french | Single french, Double french, French + sidelites |
| garden | _(none)_ |
| patio | XO, OX, XOX, OXXO |
| storm | Full glass, Half glass, Screen |
| interior | Single, Double, Pocket, Bifold |

---

### Dimension Convention

**Order: WIDTH FIRST, HEIGHT SECOND** (e.g., 32" × 48")

- Standard openings: `width` / `height` fields
- Multi-section (bay, bow, combination): `owidth` / `oheight` (overall)
- Input uses `inputMode="decimal"` for numeric entry
- Defaults (when missing): 32" width × 48" height

---

### Field Options

**Material (Windows):** Vinyl, Wood, Aluminum, Fiberglass, Composite, Clad Wood

**Material (Doors — Entry/Interior):** Steel, Fiberglass, Wood

**Material (Storm doors):** Aluminum, Composite, Wood Core

**Pane types:** Double, Triple

**Glass finishes:** Clear, Frosted, Tinted, Obscure

**Glass toggles:** Low-E coating, Tempered, Argon fill, Laminated glass

**Door glass insert:** None, 1/4 Lite, 1/2 Lite, 3/4 Lite, Full Lite

**Grid patterns:** None, Colonial, Prairie, Georgian, Diamond

**Installation types:**
- `Retrofit` → `'retrofit'`
- `Full Frame` / `New construction` → `'fullframe'`
- `Stud-to-Stud` / `Stud to stud` → `'stud_to_stud'`

**Screen options (windows):** None, Standard, Retractable, Premium Mesh

**Screen coverage (sliders):** Half Screen, Full Screen, No Screen

**Door ventilation types:** Fixed Glass, Retractable Screen, Self-Storing Screen, Interchangeable Screen

**Frame colours (FRAME_COLOURS):** White, Almond, Sandstone, Commercial Brown, Charcoal, Black, Forest Green, Brick Red
- Custom colour palettes loaded from `color_palette` table

---

### Saving Flow

**Draft persistence (line 311–339):**
- Auto-saves to `sessionStorage` key `estimate-draft` (clientInfo, openings, activeIdx, mode, trimState, scopeNotes)
- Restored on mount; discarded if URL client name differs

**Save button flow (line 608–764):**
1. Validate trim requirements
2. `buildOpeningRow()` transforms each opening to DB row shape
3. Edit mode: DELETE old `estimate_openings` → INSERT new
4. New estimate: INSERT into `estimates` + `estimate_openings`
5. Clear sessionStorage draft

**DB columns written to `estimate_openings`:**
`qty`, `width_in`, `height_in`, `width` (size bucket: sm/md/lg/xl), `shape`, `colour`, `interior_colour`, `glass`, `glass_kind`, `low_e`, `tempered`, `pane`, `material`, `grid_pattern`, `install`, `floor`, `room`, `has_screen`, `tilt_clean`, `opening_direction`, `astragal`, `lockset`, `deadbolt`, `brickmould`, `jamb`, `threshold_type`, `door_style`, `glass_insert`, `glass_finish`, `screen_coverage`, `ventilation_type`, `closer_type`, `pet_door`, `seat_board`, `head_board`, `energy_rating`, `interior_photo_url`, `exterior_photo_url`, `photo_3_url`, `photo_4_url`, `unit_cost`, `total_cost`, `sort_order`, `sections` (JSON)

**Scope notes:** Free-text textarea; saved to `estimates.scope_notes`

**Trim options (TrimState):**
- casing: `none` / `standard` / `custom` — oak/vinyl/MDF/custom variants
- jamb: `none` / `4 9/16"` / `6 9/16"` / custom
- brickmold: toggle + colour
- rosettes, caping, nail fin, drip cap, blue skin: toggles
- Costs via `computeTrimCost()`

---

## 4. Drawing System

**Directory:** `components/estimate-builder-v2/`

**Components:**

| File | Components |
|------|-----------|
| `casement-slider-hopper-drawing.tsx` | CasementDrawing, SliderDrawing, HopperDrawing |
| `awning-hung-tiltturn-drawing.tsx` | AwningDrawing, SingleHungDrawing, DoubleHungDrawing, TiltTurnDrawing |
| `entry-door-drawing.tsx` | EntryDoorDrawing, DoubleEntryDrawing |
| `french-garden-drawing.tsx` | FrenchDoorDrawing, GardenDoorDrawing |
| `patio-door-drawing.tsx` | PatioDoorDrawing |
| `storm-interior-drawing.tsx` | StormDoorDrawing, InteriorDoorDrawing |
| `bay-bow-drawing.tsx` | BayDrawing, BowDrawing |
| `shape-outline-drawing.tsx` | ShapeOutlineDrawing (shapes, arches, transoms) |
| `section-builder.tsx` | CombinationDrawing |

**View convention:** All drawings render from **INTERIOR VIEW**

**Props (common):** `widthIn`, `heightIn`, `grid`, `glassType`, `frameColor`, `sub` (subtype), `uid`

**Handing:** Casement/entry doors: L/R via subtype string. Sliders: via `operSide` (e.g., "Left (XO)"). SVG paths mirror based on handing.

**Dispatching:** `OpeningDrawing` component at `opening-drawing.tsx:53–116` maps `typeId` → specialized component. DB type mapped via `OLD_TO_V2_TYPE` (lines 13–20).

**PNG rendering for PDFs:**
- Estimate PDF: 600×720 px with dimension labels
- Contract PDF: 400×480 px standard, 600×200 px for combos
- Combination sections: 120×144 px

---

## 5. Public Estimate Page

**File:** `/app/estimate/[id]/page.tsx` (544 lines)

**Validation:** `GET /api/public/estimate/[id]` — server-side; restricts to published/signed estimates only. No token auth; ID in URL.

**Data exposed without authentication:**
- Estimate number, client name, address, email, phone
- All openings: type, dimensions, color, glass specs, material, pricing
- Pricing: subtotal, tax, total, discount, deposit %
- Scope notes
- Company profile: name, phone, logo, address, warranty info
- Tax rate and province

**Not exposed:**
- Client signature / contract details
- Payment methods
- Rep internal notes
- Internal cost breakdowns

**Action buttons (line 533–539):**
- "Download PDF" → `/api/estimate-pdf?id={id}`
- Status shown: "Already signed" (status=signed), "Estimate declined" (status=declined), or "Active" + download

**Signing route:** Separate page `/sign/[id]/page.tsx` — not on this view

---

## 6. Contract System

### Send Contract (`/app/api/send-contract/route.ts`, 119 lines)

**Subject:** `Contract from ${companyName} — Ready to Sign`

**Contract badge:** `CON-` + first 6 chars of contractId (uppercase)

**Deposit calculation (line 41):** `depositPct = est?.deposit_percent ?? prof?.deposit_percent ?? 30`

**Money format (line 20):** `'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
→ `CA$1 235,50` (space thousand separator, comma decimal)

**Email sections:**
- Logo or gradient badge
- H1: "Your contract is ready to sign."
- Intro paragraph (conditional on project address)
- Totals block: "Project total" + "Deposit due on signing"
- CTA: "Review & sign contract →" (blue `#3B5BF5`)
- Contact footer with phone (conditional)

**Email metadata:**
- `from: "${companyName} <noreply@useapexscale.com>"`
- `reply_to`: `company_contact_email` or `interac_email` (conditional)
- `open_tracking: true`
- `tags: [{ name: 'contract_id', value: contractId }]`

**Activity log:** event `'contract_sent'`

---

### Contract Signing Page (`/app/sign/contract/[id]/page.tsx`, 650 lines)

**Signature capture (line 66–76, 320–362):**
- SVG canvas: `viewBox="0 0 600 200"`, rendered height 64px
- Pointer events (mouse/touch): `onPointerDown` starts path, `onPointerMove` appends, `onPointerUp` commits
- Validation: total path length ≥ 50 pixels (line 43–58)
- Export: SVG → canvas `drawImage()` → PNG Base64

**Checkbox text:** "I have read and agree to the Terms & Conditions and authorize the work described in this contract."

**Buttons:** "Sign Contract" · "Decline"

**Connection loss message:** "Connection lost — your signature is preserved. Tap below to retry." (line 625)

---

### Sign Contract API (`/app/api/sign-contract/route.ts`, 138 lines)

**Input validation (line 8–9):** `contractId` + `signatureBase64` required; returns 400 if missing

**IP capture (line 12–15):**
```
ip = x-forwarded-for (first entry) ?? x-real-ip ?? 'unknown'
userAgent = user-agent ?? 'unknown'
```

**Double-sign protection (line 22–24):** Returns 200 with existing signature URL if already signed (idempotent)

**Signature upload (line 27–33):**
- Strips `data:image/png;base64,` prefix
- Buffer → upload to `signatures` bucket: `contract-signatures/${contractId}-client-${Date.now()}.png`
- `upsert: false` prevents overwriting

**SHA-256 document hash (line 43–61):**
Fields hashed: `estimate_id`, `total`, `deposit_percent`, `payment_method`, `contract_terms_snapshot`, all openings (id, type, qty, total_cost, pane, colour, interior_colour, material, lockset, deadbolt, deadbolt_type, brickmould, jamb, threshold_type, door_style, glass_insert, glass_finish)

**Contract DB update (line 63–71):** `status='signed'`, `client_signature_url`, `signed_at` (ISO 8601), `ip_address`, `user_agent`, `document_hash`, `agreed_to_terms`

**Estimate update (line 73–76):** `status='signed'`, `signed_at`

**Contractor notification (line 78–85):**
```
type: 'estimate_signed'
title: 'Contract signed'
body: '${clientName || "Client"} signed the contract'
link: '/dashboard/estimates/${contract.estimate_id}'
```

**Team owner notification (line 114–124):** Only if `ns?.inapp?.pushTeam === true`
```
type: 'team_activity'
body: '${repName}'s estimate ${estNumber} was signed by ${clientName}'
```

**Activity:** event `'contract_signed'`, actor `'client'`

**Appointment update (line 126–131):** If appointment exists for estimate, sets status `'completed'`

---

### Post-Signing Actions (sign page, line 184–220)

1. `POST /api/send-contract-signed` — signed confirmation email to client
2. `POST /api/notify-contractor-signed` — notification email to contractor
3. `POST /api/create-deposit` — creates deposit invoice record (does NOT charge)

**Post-sign screens:**
- **Anonymous client:** Success confirmation with "What happens next" steps
- **Authenticated rep:** Deposit summary overlay with resend-email option
- **Both:** Download signed contract PDF option

---

### Deposit Invoice (`/app/api/deposit-invoice/route.ts`, 188 lines)

**Auth:** Valid `x-internal-secret` header OR authenticated dashboard user

**Idempotent guard:** Returns `{ skipped: true }` if deposit invoice already exists for estimate

**Deposit % resolution:** `est.deposit_percent ?? prof.deposit_percent ?? 30`

**Due date:** 14 days from now

**Invoice number:** `INV-` + padded count of user's total invoices

**Invoice type:** `'final'` if depositPct === 100, else `'deposit'`

**Invoice notes:** `"${depositPct}% deposit on ${est.estimate_number} — ${companyName}"`
(or `"Full payment on ..."` if 100%)

**Email subject:** `"${depositPct === 100 ? 'Payment' : 'Deposit'} Invoice ${invoiceNum} — ${fmtInv(depositAmount)} due · ${companyName}"`

**Email sections:**
- Logo or gradient badge + invoice badge pill (`"INV-XXXX · Deposit"` or `"· Payment"`)
- H1: "Your deposit invoice." (or "payment invoice")
- Intro: "To confirm your order and schedule installation, please send the deposit by e-Transfer..."
- Amount due card: 34px blue `#1D4ED8`, due date below
- e-Transfer block: Send to (interac email), Reference (invoice number), Amount
- CTA: "View signed contract →" (blue `#3B5BF5`)
- Contact footer: "Questions? Contact ${companyName} · ${phone}"
- Footer: "Powered by ApexScale"

**On email failure:**
- Invoice is preserved
- Notification created: type `'deposit_email_failed'`, title `'Deposit email failed to send'`
- Activity logged: `'deposit_invoice_email_failed'`
- Returns `{ success: true, invoice, emailFailed: true, emailError: ... }`

---

## 7. Dashboard Home

**File:** `/app/dashboard/page.tsx`

### KPI Cards (line 1171–1195)

| Card | Label | Value field | Delta field | Accent |
|------|-------|------------|------------|--------|
| Revenue | "REVENUE" | `metrics?.revenueThisMonth` | `metrics?.revenueDelta` | `#2045B8` |
| Pipeline | "IN PIPELINE" | `metrics?.pipelineTotal` | `metrics?.pipelineCount` | `#7C3AED` |
| Signed Today | "SIGNED TODAY" | `metrics?.signedTodayTotal` | `${count} today` | `#0F8A6B` |
| Conversion | "CONVERSION" | `metrics?.conversionRate + '%'` | _(empty)_ | Dynamic |

**Conversion accent:** `#0F8A6B` (>50%) / `#DC2626` (<25%) / `#D97706` (between)

Subtitle for Revenue: "This month" · Pipeline: "Open estimates" · Signed: "This month" · Conversion: "This month"

---

### Activity Event Config (`ACTIVITY_CFG`, line 127–140)

| Event | Icon | Bg | Color | Label |
|-------|------|----|----|-------|
| estimate_sent | SendIcon | `#EFF6FF` | `#2563EB` | "sent estimate" |
| contract_sent | PenLine | `#EFF6FF` | `#2563EB` | "sent contract" |
| contract_signed | FileCheck | `#ECFDF5` | `#059669` | "signed contract" |
| estimate_signed | PenLine | `#EFEAFC` | `#6D45D9` | "signed estimate" |
| deposit_invoice_sent | FileText | `#EFF6FF` | `#2563EB` | "sent deposit invoice" |
| deposit_paid | DollarSign | `#ECFDF5` | `#059669` | "paid deposit" |
| final_invoice_sent | FileText | `#EFF6FF` | `#2563EB` | "sent final invoice" |
| final_paid | CheckCircle | `#ECFDF5` | `#059669` | "paid in full" |
| reminder_sent | SendIcon | `#EFF6FF` | `#2563EB` | "sent reminder" |
| estimate_auto_expired | ClockIcon | `#FEF3C7` | `#D97706` | "estimate expired (no response)" |
| deposit_invoice_failed | AlertTriangle | `#FEF2F2` | `#DC2626` | "failed to send deposit invoice" |
| deposit_invoice_email_failed | AlertTriangle | `#FEF2F2` | `#DC2626` | "failed to deliver deposit email" |

### Event Tone Colors (`EVENT_TONE`, line 142–155)

| Events | Bg | Color |
|--------|----|----|
| estimate_sent, contract_sent, deposit_invoice_sent, final_invoice_sent, reminder_sent | `#EEF3FF` | `#2563EB` |
| contract_signed, estimate_signed | `#EFEAFC` | `#6D45D9` |
| deposit_paid, final_paid | `#E7F6EE` | `#0F8A4D` |
| estimate_auto_expired | `#FBF1DC` | `#B7791F` |
| deposit_invoice_failed, deposit_invoice_email_failed | `#FEE2E2` | `#DC2626` |

---

### Attention Panel — "Ready for Final Invoice" Guard (line 418–432)

Filters signed/accepted estimates that meet ALL of:
1. status ≠ 'paid'
2. No pending deposit invoice (`!pendingEstimateIds.has(e.id)`)
3. Has deposit invoice row (`allDepositEstimateIds.has(e.id)`)
4. No final invoice yet (`!finalEstimateIdSet.has(e.id)`)

→ Pushes attention item: CTA "Send final invoice", actionType `'invoice'`, priority 2

---

### Dead-Deal Detection (line 747–751)

When sending final reminder AND `reminderCount >= maxCount` (default 3):
- Estimate status → `'expired'`, reason: `'no_response_after_reminders'`
- Notification created for team owner

**SuccessBanner after reminder (line 795):**
`isAutoExpiring ? 'Reminder sent — estimate marked as expired' : 'Reminder sent to ' + reminderModal.clientEmail`

---

### Team Cards (line 1204–1228)

- Rep avatar: 32×32 with first letter, gradient from `REP_GRADIENTS` array (5 colors cycling)
- Shows: name, today count, done count, signed total (compact format)
- Click → `/dashboard/appointments?rep=${rep.id}`

**Activity filter tabs:** 'all' → "All" · 'payments' → "Payments" · 'estimates' → "Estimates"

**Empty states:**
- "All caught up!" — no attention items (desktop/mobile)
- "Nothing pending" — attention subtitle when empty
- "No activity yet" / "Send your first estimate to get started." — empty activity feed
- "No action items right now." — attention empty state

---

## 8. Invoices Page

**File:** `/app/dashboard/invoices/page.tsx`

### Table Headers (line 249–257)

Grid: `110px 1fr 90px 80px 110px 100px 160px`

All caps, 10px, 700wt, 0.08em letter-spacing:
`#` · `Client` · `Type` · `Due` · `Amount` · `Status` · `Actions`

### Status Colors (line 26–30)

| Status | Text | Background |
|--------|------|-----------|
| pending | `#2563EB` | `rgba(37,99,235,.1)` |
| paid | `#059669` | `rgba(5,150,105,.1)` |
| overdue | `#DC2626` | `rgba(220,38,38,.1)` |

**Overdue detection (line 173):**
`inv.status === 'pending' && inv.due_date && inv.due_date < today` (ISO string comparison)

### Mark-Paid Flow (line 90–169)

1. Set `paying` state to invoiceId
2. `invoices`: status → `'paid'`, `paid_at` → ISO timestamp
3. If final invoice + estimateId: `estimates.status → 'paid'`
4. Create notification (if none sent in last 5 min): type `'deposit_paid'` or `'final_paid'`
5. Log activity: `'deposit_paid'` or `'final_paid'`
6. Send email: `/api/send-email` type `'deposit_receipt'` or `'final_receipt'`
7. Set paying → null

**Notification titles:**
- Deposit: "Deposit paid"
- Final: "Final payment received"
- Body: client name + amount + estimate number

### Action Buttons

**Mark paid** (pending only): text `"Mark paid"` / `"Saving…"`, bg `rgba(5,150,105,.1)`, color `#059669`

**PDF**: text `"PDF"`, bg `rgba(37,99,235,.08)`, color `#2563EB`, opens `/api/invoice-pdf?id=${inv.id}` in new tab

### Rep Filter (line 72–78, 207–217)

Only renders if `teamReps.length > 1`

- Active chip: border `1.5px solid #2563EB`, bg `#EFF4FF`, color `#2563EB`
- Inactive chip: border `1px solid rgba(15,23,42,0.08)`, bg `#fff`, color `#64748B`

### Totals (line 178–179)

```
totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
```

Amount field is raw from DB — no client-side deposit offset.

---

## 9. Appointments Page

**File:** `/app/dashboard/appointments/page.tsx`

### State Variables (line 800–827)

```
appts: Appt[]
loading: boolean = true
openId: string | null = null
editing: Appt | null = null
editOpen: boolean = false
toast: { message, variant? } | null = null
isDesktop: boolean = false
selectedId: string | null = null
desktopEditing: boolean = false
desktopFilter: 'All' | 'Upcoming' | 'Done' = 'All'
search: string = ''
userId: string | null = null
teamUserIds: string[] | null = null
repFilter: string = searchParams?.get('rep') || 'all'
teamReps: { id, name }[] = []
expandedRepIds: Set<string>
selectedDay: 'yesterday' | 'today' | 'tomorrow' | string = 'today'
expandedId: string | null = null
dayCounts: { yesterday: 0, today: 0, tomorrow: 0 }
dayAppts: TimelineAppt[]
dayLoading: boolean = true
calYear, calMonth: current year/month
monthDots: Set<string>
calendarOpen: boolean = false
```

### Data Loading (line 832–862)

1. Get current user; sanitize user ID (lowercase, trim, replace non-ASCII)
2. `getTeamUserIds()` → team user IDs
3. If manager: fetch team profiles (id, first_name, last_name)
4. Load appointments (limit 50): filter `or(user_id.in.(...), assigned_to.in.(...))`, order by date/time asc
5. Fetch estimate numbers for appointments with `estimate_id`

**Day counts (line 875–885):** Three parallel queries — yesterday/today/tomorrow count with same user filter

### Desktop Header (line 1042–1062)

- Eyebrow: "SCHEDULE" (11px, 0.14em letter-spacing, uppercase)
- Title: "Appointments" (26px, 700wt)
- Subtitle: "{todayCount} today" (13.5px, 600wt)
- Search box: 280px wide, placeholder "Search client or address"
- "New appointment" button: "+ New appointment", blue, shadow

### Desktop Rep Filter Tabs (line 1077–1095)

- Active underline: `2.5px solid #2563EB`, color `#2563EB`
- Inactive: transparent underline, color `#94A0B4`

### Detail Panel (line 1151–1156)

- No selection: "Select an appointment to see details."
- Editing: `DesktopEditPanel`
- Viewing: `DesktopViewPanel` (props: appt, onEdit, onCreateEstimate, onViewEstimate)

---

## 10. Email System

**File:** `/app/api/send-email/route.ts` (536 lines)

**Rate limiting:** Upstash Redis sliding window — 10 emails per hour per IP (prefix `'rl:email'`)

**UUID sanitization:** Applied to userId lookups throughout

### Email Types (Complete List)

| # | Type | Subject Line | Lines |
|---|------|-------------|-------|
| 1 | welcome | "Welcome to ApexScale — you're all set" | 21–37 |
| 2 | invoice | `Invoice ${invoice_number} · ${fmtCAD(amount)} due ${dueDateFmt}` | 155–227 |
| 3 | signed | `Signed — ${estimate_number} · ${fmtCAD(total)}` | 230–309 |
| 4 | reminder | `Following up on your estimate, ${client_name \|\| 'Client'}` | 312–383 |
| 5 | send | `Your estimate from ${companyName} — ${estimate_number}` | 386–427 |
| 6 | deposit_receipt | `Deposit received — ${invoice_number}` | 430–462 |
| 7 | final_receipt | `Paid in full — ${estimate_number}` | 465–500 |

---

### Invoice Email (line 155–227)

**Header kicker:** "Invoice for"
**Client name shown**
**Pills:** "Payment Due", invoice_number, "Due {dueDateFmt}"

**Amount Due card:**
- Label: "Balance Due" (if balance invoice) or "Amount Due"
- Amount: 32px, `#2563EB` (blue)
- If balance: shows "Project total" + "Deposit paid"
- Otherwise: "Net 14" terms text

**Invoice Details card:**
- "Invoice number", "Related estimate", "Payment method" (conditional)

**Message card:**
"Please find your invoice attached. Payment is due by **{dueDateFmt || 'the due date'}**. Thank you for choosing **{companyName}**."

**CTA:** "View Invoice →" — `#059669` (green)

**Contact footer:** "Questions? Contact {companyName}{phone ? ' at ' + phone : ''}"

---

### Signed Estimate Email (line 230–309)

**Header kicker:** "Prepared for"
**Green pill:** "✓ Signed"
**Pills:** estimate_number, signedDateFmt

**Estimate Total card:** 32px amount, `#2563EB`, "inc. {taxLabel}" below

**Payment Schedule card:**
- Row 1: "Deposit on signing ({depositPct}%)" → amount
- Row 2: "Balance on completion" → amount in `#2563EB`
- Row 3 (conditional): "Payment method"

**Message card:** "Thank you for signing **{estimate_number}**. We'll be in touch shortly to schedule the work and arrange the deposit."

**Signed confirmation card:**
- Bg: `#ECFDF5`, border `#BBF7D0`
- White checkmark circle bg `#059669`
- Title: "Signed by {client_name || 'Client'}" — `#065F46`
- Timestamp: "{signedDateFmt}{signedTimeFmt ? ' at ' + signedTimeFmt : ''}" — `#34D399`

**CTA:** "View Signed Estimate →" — `#2563EB` (blue)

---

### Reminder Email (line 312–383)

**Header:**
- Logo (30px) OR gradient badge with company initial
- Estimate number badge: bg `#EEF3FF`, color `#2563EB`

**Template variable substitution (line 330–335):**
```
{client_name}     → est.client_name || ''
{address}         → est.client_address || ''
{amount}          → CA$X,XXX.XX
{expiry_date}     → Intl.DateTimeFormat('en-CA', { year:'numeric', month:'long', day:'numeric' })
{estimate_number} → est.estimate_number || ''
```

**Message block (line 357–360):**
- Each line → `<p style="font-size:16px;color:#1E2A3B;…">` with 12px margin-bottom
- Empty lines → `<p style="margin:0 0 12px;">&nbsp;</p>`
- Rep name appended: `— ${repName}`

**Reply-to (line 343–346):** `prof?.company_contact_email || prof?.interac_email`

**Estimate summary box (line 362–372):** Bg `#F7F9FC`, shows estimate_number + valid_until + amount in `#2563EB`

**CTA:** "View estimate ➜" — `#3B5BF5`

**Reply footer (line 377–380):** "Or reply to this email — it goes straight to **{companyName}**." (conditional on remReplyTo)

---

### Send Estimate Email (line 386–427)

**H1:** "Your estimate is ready."
**Estimate summary box:** Border-left `3px solid #2563EB`; shows "Estimate total" (blue) + "Valid until" (black)
**CTA:** "View estimate ➜" — `#3B5BF5`

---

### Deposit Receipt Email (line 430–462)

**Header badge:** "{invoice_number} · Paid" (green)
**Checkmark:** SVG in 52px circle, bg `#E7F6EE`
**H1:** "Deposit received."
**Message:** "Thanks, {client_name || 'there'}! We've received your deposit for **{projectAddress}**. Your project is officially underway."
**Amount:** Label "Amount received" (uppercase, `#94A0B4`); value 32px, `#0F8A4D` (green)
**Footer:** "We'll be in touch to schedule your installation."

---

### Final Receipt Email (line 465–500)

**Header badge:** "{estimate_number} · Paid in full" (green)
**H1:** "Paid in full — thank you!"
**Message:** "Your project at **{projectAddress}** is complete and fully paid. It's been a pleasure working with you."
**Amount:** Label "Total paid"; value 32px, `#0F8A4D` (green)
**Contact footer:** "Questions? Contact **{companyName}**{phone ? ' · ' + phone : ''}"

---

### Empty/Undefined Rendering Risks

| Field | Rendering | Location |
|-------|-----------|---------|
| `est.client_name` | Falls back to `'Client'` everywhere | Throughout |
| `prof?.phone` | Conditional — omitted if falsy | line 224, 401 |
| `prof?.logo_url` | Gradient badge with company initial | line 99–101 |
| `dueDateFmt` | Falls back to `'the due date'` in message card | line 185 |
| `signedTimeFmt` | Omitted if `est.signed_at` falsy | line 295 |
| `remSettings?.template_1/2` | Falls back to `''` → empty body | line 323 |
| `est.total` (reminder amt) | Empty string if falsy → `{amount}` renders blank | line 327–329 |
| `est.valid_until` (reminder) | Empty string → `{expiry_date}` renders blank | line 325 |
| `remReplyTo` | No reply-to section rendered | line 377–380 |

---

## 11. PDF Generation

### Estimate PDF (`/app/api/estimate-pdf/route.ts`, 139 lines)

1. Fetch estimate, openings, profile, price_lists, window_subtypes
2. Build custom label mapping + subtype mapping
3. Render opening PNGs (600×720 px) with dimension labels
4. Render combo section PNGs (120×144 px)
5. Render via React PDF (`EstimatePDF` component)
6. If warranty PDF URL: merge with `pdf-lib`
7. Return filename: `Estimate-{estimate_number}-{clientSlug}.pdf`

**Graceful fallback:** Drawing render failures → `{ png: '', wLabel: '', hLabel: '' }`

---

### Invoice PDF (`/app/api/invoice-pdf/route.ts`, 391 lines)

**Money format:** `'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
→ `CA$1 235,50` (space thousand separator, comma decimal in Canadian locale)

**Services section opening name:** `[OpeningType.name] × [qty]` (e.g., "Double-Hung Window × 3")

**Label inventory:**

| Section | Label |
|---------|-------|
| Header | "Bill to" / "Amount due" |
| Status card | "Payment received" / "Payment pending" / "Payment overdue" |
| Dates | "Issued" / "Due date" / "Terms" = "Due on receipt" |
| From/Bill | "From" / "Bill to" |
| Estimate ref | "Related estimate" / "Estimate" badge |
| Services | "Services rendered" |
| Totals | "Subtotal" / "{TAX_LABEL}" / "Deposit paid" / "Additional charges" / "{TAX_LABEL} on charges" / "Deposit rate" / "Total due" |
| Payment | "Payment instructions" / "Send e-transfer to" / "Reference number" / "Questions" |
| Other | "Notes" / "Authorized by" |
| Footer | "Prepared by {companyName}" / "Powered by ApexScale · useapexscale.com" |

**Status styling:**

| Status | Bg | Border | Color | Label |
|--------|----|----|----|----|
| paid | `#ECFDF5` | `#BBF7D0` | `#059669` | "Payment received" |
| due | `#EFF6FF` | `#BFDBFE` | `#2563EB` | "Payment pending" |
| overdue | `#FEF2F2` | `#FECACA` | `#DC2626` | "Payment overdue" |

**Header gradient:** `#080E1C → #0E1F3D → #0C2847`

---

### Contract PDF (`/app/api/contract-pdf-gen/route.ts`, 141 lines)

1. Fetch contract, estimate, openings, profile, price_lists, window_subtypes, contract clauses
2. Build labels + subtypes mappings
3. Apply effective clauses (ordered, filtered)
4. Render opening PNGs (400×480 px standard, 600×200 px combos), section PNGs (120×144 px)
5. Render via `ContractPDF` component
6. Return filename: `Contract-{estimate_number}-{clientSlug}.pdf`

**Filename slug:** `(client_name || 'Client').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-') || 'Client'`

---

## 12. Pricing Engine

**File:** `/lib/pricing.ts` (386 lines)

### `fmtCAD()` (line 217–219)

```typescript
'CA$' + Math.round(n).toLocaleString('en-CA')
```
Rounds to integer, space thousand separator.
- `1234.56` → `CA$1 235`
- `1000000.01` → `CA$1 000 000`

---

### `computePrice()` (line 247–354)

**Standard openings:** `base[typeId] + Math.round((w * h) / 144 * areaRatePerSqFt)`
- `w × h / 144` = square feet
- `base` and `areaRatePerSqFt` from custom pricing or `SETTINGS.pricing`

**Bay/Bow:** Sum of sections (2 × side + (litCount-2) × center) × (1 + bay/bow_surcharge/100)

**Combination:** Sum of section prices × (1 + combination_surcharge/100)

**Application order of surcharges:**
1. Base unit price
2. Install type (fullframe / stud_to_stud)
3. Floor level (second_floor / third_floor)
4. Frame condition (frame_repair / frame_rotted)
5. Egress requirement
6. Glass upgrades (triple_pane / lowe / argon / tempered / laminated_glass / frosted / tinted / obscure)
7. Grid
8. Screen type (retractable / premium)
9. Colour (palette lookup priority, then generic custom_colour if White→no surcharge)
10. Material (door vs window split)
11. Hardware (deadbolt / multipoint_lock)
12. Pet door (S/M/L)
13. Brickmould / non-standard jamb depth
14. Shape multiplier — applied LAST on full unit price (arch_pct / custom_shape_pct)
15. × qty

---

### Surcharge Fields (57 total)

**Shape & Colour:** `arch_pct`, `custom_shape_pct`, `black_grey`, `custom_colour`, `lowe`, `frosted`, `tinted`, `tempered`, `obscure`

**Install & Frame:** `fullframe`, `stud_to_stud`, `second_floor`, `third_floor`, `frame_repair`, `frame_rotted`

**Trim:** `casing_oak`, `casing_vinyl`, `casing_mdf`, `casing_custom`, `casing_size_3_3_8`, `jamb_oak`, `jamb_wood`, `jamb_vinyl`, `jamb_plywood`, `jamb_custom`, `brickmold`, `rosettes_round`, `rosettes_45`, `rosettes_flat`, `caping`, `nail_fin`, `drip_cap`, `blue_skin`

**Glass & Energy:** `triple_pane`, `argon`, `laminated_glass`

**Materials (Windows):** `material_wood`, `material_aluminum`, `material_fiberglass`, `material_composite`, `material_clad_wood`

**Materials (Doors):** `door_fiberglass`, `door_wood`

**Grid & Hardware:** `grid_upcharge`, `deadbolt`, `multipoint_lock`

**Screens & Extras:** `screen_retractable`, `screen_premium`, `pet_door_s`, `pet_door_m`, `pet_door_l`, `egress_required`

**Non-standard:** `jamb_nonstandard`

**Bay/Bow/Combo:** `bay_surcharge`, `bow_surcharge`, `combination_surcharge`

---

### Colour Surcharge Logic (line 312–316)

```typescript
const anyColour = String(v.extColour || v.doorExt || v.colour || '')
if (anyColour && anyColour !== 'White') {
  const paletteAddon = custom?.colourPalette?.[anyColour]
  p += (paletteAddon != null && paletteAddon > 0) ? paletteAddon : (s.custom_colour ?? 0)
}
```

1. `extColour` → `doorExt` → `colour` (first truthy)
2. White = no surcharge
3. Palette entry > 0 → use palette value
4. Palette entry missing/0 → use generic `custom_colour`

---

## 13. Library Utilities

### `logActivity()` (`/lib/activity.ts`, 15 lines)

Inserts into `activity_log`: `user_id`, `event_type`, `actor_type`, `actor_name`, `entity_type`, `entity_id`, `entity_number`, `client_name`, `amount`

---

### `getTeamUserIds()` (`/lib/teamScope.ts`, 37 lines)

Returns `{ userIds: string[], isOwnerOrManager: boolean }`

Logic:
1. Sanitize input userId
2. Check profile `team_owner_id`, `role`, `member_role`
3. Owner/manager: fetch all profiles with matching `team_owner_id`
4. Estimator/sales: return `[sanitizedId]` only

---

### `getCompanyName()` (`/lib/getCompanyName.ts`, 23 lines)

Fallback chain:
1. `profile.company_name`
2. If team member: owner's `company_name`
3. `${first_name} ${last_name}`.trim()
4. `'Your Contractor'`

---

### `clientValidation.ts` (51 lines)

| Function | Rule |
|----------|------|
| `formatPhone(raw)` | Extracts 10 digits → `(XXX) XXX-XXXX` |
| `validateName(v)` | Min 2 chars |
| `validatePhone(v)` | Exactly 10 digits (empty allowed) |
| `validateEmail(v)` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (empty allowed) |
| `validateAddress(v)` | Min 5 chars (empty allowed) |
| `validatePositiveNumber(v, name)` | Non-negative number |
| `validateQuantity(v)` | 1–100 inclusive |
| `validateDimension(v, name)` | 1–300 inches inclusive |
| `hasErrors(e)` | True if any ClientErrors value truthy |

---

### `rateLimit.ts` (20 lines)

Two Upstash Redis sliding window limiters:

| Limiter | Limit | Window | Prefix |
|---------|-------|--------|--------|
| `emailRateLimit` | 10 req | 1 hour | `'rl:email'` |
| `inviteRateLimit` | 5 req | 1 hour | `'rl:invite'` |

---

### `validation.ts` (14 lines)

```typescript
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
```

---

## 14. Security & Data Integrity

### Contract Signing Integrity

- SHA-256 hash of contract terms + all opening details stored on signing
- Enables post-signature tamper detection
- Signature PNG stored with timestamp in filename; `upsert: false` prevents overwriting
- IP + User-Agent captured from request headers for audit trail
- Double-sign protection: idempotent — returns existing signature URL

---

### Rate Limiting Gaps

- Global IP-based limit (10 emails/hr per IP) via Upstash — no per-user or per-estimate limit
- `x-forwarded-for` first entry used as client IP; `'unknown'` fallback if no header
- Localhost default `127.0.0.1` bypasses limit in development

---

### Internal API Auth (`deposit-invoice/route.ts`)

- Accepts `x-internal-secret` header OR authenticated Supabase session
- Secret comparison is string equality (not constant-time) — acceptable for server-to-server
- `create-deposit/route.ts` passes secret from `process.env.INTERNAL_API_SECRET` — never exposed to client bundle

---

### Data Exposure on Public Pages

- `/estimate/[id]` exposes full estimate including client contact, all specs, company info — no auth required
- Access control relies entirely on API-side filtering in `/api/public/estimate/[id]`
- No expiry on public estimate links (valid indefinitely unless status changes)

---

### Undefined Rendering Vulnerabilities

- Reminder email body becomes blank if `est.total` falsy or `remSettings.template_1/2` undefined
- All amount/date template substitutions default to empty string (no fallback visible to client)
- `signedTimeFmt` silently omitted from signed email if `est.signed_at` falsy

---

---

## 15. Onboarding Flow

### Step 1 — Company Info (`/app/onboarding/page.tsx`)

**Progress indicator:** Two dots; active = blue `#2563EB` 28px wide, inactive = `#DBEAFE` 16px; height 3px; label `"Step {step} of 2"` in `#6B7280` 12px

**Step 1 heading:** "Tell us about your " + "company." (blue `#2563EB`)

**Fields:**

| Label | Type | Placeholder | Required | Notes |
|-------|------|-------------|----------|-------|
| Company name * | text | "Northview Windows & Doors" | Yes | |
| Phone number | tel | "(403) 555-0100" | No | maxLength=14, formatted (NNN) NNN-NNNN |
| Province * | select | "Select province" | Yes | AB BC SK MB ON QC NS NB PE NL YT NT NU |

**Phone validation:** `formatPhone()` → strips non-digits, slices 10, formats `(XXX) XXX-XXXX`. On blur: if non-empty and invalid → `"Please enter a valid Canadian phone number"` in `#EF4444` 12px

**`step1Valid`:** `company.trim().length > 0 && province.length > 0` — phone NOT required for enabling button

**"Continue" button:** enabled bg `#2563EB`, disabled bg `#93C5FD`. On click: if phone non-empty and invalid → sets phoneError, returns. Otherwise `setStep(2)`. **No DB write at step 1.**

---

### Step 2 — Trade Selection

**Step 2 heading:** "Your " + "specialty." (blue `#2563EB`)

**NICHES (6 tiles, 2-column grid):**

| id | Label | Icon |
|----|-------|------|
| windows_doors | "Windows & Doors" | Square |
| roofing | "Roofing" | Home |
| siding | "Siding" | Layers |
| flooring | "Flooring" | Grid3x3 |
| hvac | "HVAC" | Wind |
| other | "Other" | MoreHorizontal |

Selected tile: bg `#EFF6FF`, border `0.5px solid #2563EB`, icon `#2563EB`
Unselected: bg `#fff`, border `0.5px solid #E5E7EB`, icon `#9CA3AF`
Tile text: 13px, 600wt, `#0A1628`

**"Back" button:** bg transparent, border `0.5px solid #E5E7EB`, color `#6B7280`

**"Finish setup" button:** bg `#2563EB`, disabled opacity 0.7. Label: "Saving..." / "Finish setup"

**`handleFinish()` — DB write and redirect:**
1. Guard: if `!trade` → `setError('Please select your trade')`, return
2. `supabase.auth.getUser()`
3. Sanitize userId: `.toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')`
4. **DB write** — `profiles.upsert(onConflict: 'id')`: `id`, `company_name`, `phone`, `province`, `trade`, `onboarding_done: true`, `updated_at`
5. Fire-and-forget welcome email: `POST /api/send-email` `{ type: 'welcome', firstName, email }` — errors silently swallowed via `.catch(() => {})`
6. Redirect → `/onboarding/welcome`

---

### Welcome Page (`/app/onboarding/welcome/page.tsx`)

**Reads:** `supabase.auth.getUser()` → `user_metadata.first_name` only. No DB query.

**Hero:**
- Rocket icon (Lucide, 28px, `#2563EB`) in 64×64 `#EFF6FF` square (border-radius 20)
- Sub-label: `"You're all set, {name}"` (if name) or `"You're all set"` — `#6B7280`, 12px
- Heading: "Ready to close your " + "first job." (blue) — 26px, 800wt

**Setup checklist:**
- Label: "Set up your business" — 11px, 700wt, uppercase, `#9CA3AF`
- Sub: "Complete these in Settings before your first estimate:" — 13px, `#6B7280`
- 4 rows in white card (border-radius 16, border `0.5px solid #E5E7EB`):

| Icon | Title | Subtitle |
|------|-------|---------|
| Building2 | "Company" | "Logo, address, defaults" |
| Users | "Team" | "Invite your team members" |
| FileText | "Contract" | "Terms template" |
| List | "Price list" | "Opening types & rates" |

Icon size 17px, color `#2563EB`, in 36×36 `#EFF6FF` square (border-radius 10)
Title: 14px, 600wt, `#0A1628`. Sub: 12px, `#6B7280`

**Button:** "Go to dashboard" → `/dashboard`. **No DB write.**

---

## 16. Estimates List Page

**File:** `/app/dashboard/estimates/page.tsx`

### Filters

**Status chips:** `['All', 'Draft', 'Sent', 'Signed', 'Invoiced', 'Paid']`
- Active: bg `#2563EB`, color `#fff`
- Inactive: bg `#fff`, color `#64748B`
- Initialized from URL `?status=` param

**Rep filter chips** (owner/manager with team only):
- "All reps" (id: `'all'`) + one per team member
- Active: border `#2563EB`, bg `#EFF4FF`, color `#2563EB`
- Inactive: border `rgba(15,23,42,0.08)`, bg `#fff`, color `#64748B`

**Search:** placeholder `"Search by client or #"` — searches `client_name` + `estimate_number`

### Status Badges

| Status (DB) | Display text | Text color | Background |
|-------------|-------------|------------|-----------|
| draft | DRAFT | `#64748B` | `rgba(100,116,139,.1)` |
| sent | SENT | `#2563EB` | `rgba(37,99,235,.1)` |
| signed | ACCEPTED | `#059669` | `rgba(5,150,105,.1)` |
| declined | DECLINED | `#DC2626` | `rgba(220,38,38,.1)` |
| invoiced | INVOICED | `#7C3AED` | `rgba(124,58,237,.1)` |
| paid | PAID | `#059669` | `rgba(5,150,105,.1)` |
| expired | EXPIRED | `#92400E` | `#FEF3C7` |

**Viewed dot** (sub-row, when `viewed_at` non-null and status ≠ `'draft'`):
- Opened today: green dot `#16A34A` + `"Opened today · {time}"`
- Opened earlier: amber dot `#D97706` + `"Opened {Mon DD} · {time}"`

### Desktop Table Columns

`#` | `Client` | `City` | `Date` | `Total` | _(chevron, empty header)_

### Stat Boxes (hidden for estimator / admin roles)
- "Total value" — sum of totals where status ∈ `['signed','invoiced','paid']`
- "Signed" — count where status = `'signed'`
- "Open" — count where status ∈ `['draft','sent']`

### TopBar meta

`"{estimates.length} total · {signedCount} accepted"`

### Actions

**"New Estimate"** — top-right; condition: `role !== 'admin'`; routes to `/dashboard/estimates/new`

### Empty States

| Situation | Heading | Subtitle |
|-----------|---------|---------|
| Loading | "Loading…" (`#94A3B8`) | — |
| Search, no results | "No results" | — |
| No estimates | "No estimates yet" | "Tap the button below to create your first estimate." |
| Filter, no results | "No {filter.toLowerCase()} estimates" | — |

### DB Queries

1. `estimates` — `select('id, estimate_number, client_name, client_city, status, total, created_at, viewed_at, user_id')` — `.in('user_id', userIds)` — `.order('created_at', ascending: false)` — `.limit(200)`
2. `estimates` — `select('total, status')` — `.in('user_id', userIds)` — no limit (full scan for stats)
3. `profiles` — `select('id, first_name, last_name')` — only when `isOwnerOrManager && userIds.length > 1`

---

## 17. Estimate Detail Page

**File:** `/app/dashboard/estimates/[id]/page.tsx`

### TopBar / Hero

- Back label: "Estimates"
- `estimate_number` in monospace blue
- Status badge (same rules as list)
- When `estimate.opened_at` set AND status `'sent'`: extra badge "OPENED" — color `#d97706`, bg `rgba(217,119,6,.1)`
- "Edit" button: condition `estimate.status === 'draft'` → `/dashboard/estimates/new?edit={id}`

**Hero:** company eyebrow, `"{estimate_number} · {createdDate}"`, total 48px bold white, `"inc. {taxLabel} · Valid until {estimate.valid_until || 'N/A'}"`, client card with initials

### Openings Section Header

`"What's included ({openings.length})"`

Each opening card: type name, qty multiplier if > 1, subtitle (`subtype · size · room`), then attribute chips.

**Blue chip** (bg `#EEF3FF`, color `#1D4ED8`): renders for (only when value present and non-default):
`Ext: {colour}`, `Int: {intColour}`, glass labels (each part of comma-split), install type (when ≠ retrofit), frame condition, floor (when ≠ ground), material (when ≠ vinyl), grid pattern (when ≠ none), bay angle, opening direction, panel count, transom panes, sidelite widths, glass type, core type, astragal, astragal_type, door_style, glass_insert, glass_finish, lockset, `Deadbolt`, deadbolt_type, `{brickmould} brickmould`, `Jamb {jamb}`, `{threshold_type} threshold`, screen_coverage (when ≠ 'No Screen'), ventilation_type, `{closer_type} closer`, `Pet door {size}`, `Seat board`, `Head board`, `Energy Rating: {rating}`

**Orange chip** (bg `#FFF7ED`, color `#C2410C`): `<FileText> {op.notes}`

**Photo slots** (4 per opening): labels `'Interior'` / `'Exterior'` / `'Measurement'` / `'Additional'`; delete = `estimate_openings.update({ [col]: null })`

### Price Summary Section

Rows (in order):
- Additional charges items (label + amount)
- "Subtotal"
- "Discount ({value}%)" or "Discount" — only when `discount_amount > 0`; green `#0F8A4D` with `−` prefix
- `{taxLabel}` (province-derived)
- "Total" — `#2563EB`, 22px

Deposit sub-section (when `depositInvoice` present):
- "Deposit amount" — amber `#F59E0B`
- "Remaining balance" — `#0B1220`
- "Status" — green `#0F8A4D` if paid, else blue `#2563EB`; text-transform capitalize

### Actions

**Signed/Invoiced banner** (when `isSigned || isInvoiced`):
- Eyebrow: `'PAID'` / `'INVOICED'` / `'ACCEPTED'` + optional `· {signedDate}`
- Title: `"{client_name || 'Client'} accepted this estimate"`
- Button A (deposit pending): `"Deposit pending — {fmtCAD(amount)}"` — bg `#EEF3FF`, color `#2563EB`, Clock icon → `/dashboard/invoices`
- Button B (ready for final): `"Final invoice — {fmtCAD(balance)}"` or `"Create invoice"` — green, Receipt icon → `/dashboard/estimates/{id}/invoice`

**"Send the estimate" card** (when `!isSigned && !isInvoiced && !isDeclined`):
- Title: "Send the estimate"
- Subtitle: `"So {client_name || 'your client'} can review it anytime"`
- Email row with Change/Done toggle
- Button: "Send now" / "Sending…"

**"Close the deal" section:**
- Left card: FileSignature icon, "Sign now", subtitle "Together, on this phone" — bg `#2563EB` → `/dashboard/estimates/{id}/payment-setup?trigger=sign`
- Right card: Mail icon, "Send contract", subtitle "For them to e-sign" — bg `#fff` → `/dashboard/estimates/{id}/payment-setup?trigger=send`

**"More actions":** "View Estimate PDF" / "View signed contract" (when `!!contract`) / "Duplicate estimate" / "Delete estimate" (color `#DC2626`)

### Modals / Toasts

**Delete confirm:** "Delete estimate?" / "{estimate_number} will be permanently deleted. This cannot be undone."

**Duplicate modal:** "Duplicate estimate?" / "A copy will be created as a new Draft estimate. You can edit it before sending."

**Toasts (SuccessBanner, auto-dismiss 3500ms):**
- `"Sent to {sentTo || email}"` — after send
- `"Client link copied"` — after copy
- `"No client email on this estimate"` — error
- `e.message` — fetch failure
- Duplicate: dark floating box 5000ms → `"Duplicate created — {EST-XXXX}"` + "Open →" button

### DB Queries

1. `estimates` — `select('*')` — `.eq('id', id).eq('user_id', sanitizedId)` — `.maybeSingle()`
2. `estimate_openings` — extensive columns — `.eq('estimate_id', id).order('sort_order')`
3. `price_lists` — custom labels for custom types
4. `profiles` — `select('id, contract_terms, company_name, email, phone, signature_url')` — for owner
5. `invoices` — deposit invoice lookup (when status ∈ `['signed','invoiced','paid']`)
6. `contracts` — signed contract lookup (same condition)

**Not found state:** "Estimate not found" + "← Back to Estimates" button

---

## 18. Contract Editor Page

**File:** `/app/dashboard/estimates/[id]/contract/page.tsx`

**URL params:**
- `trigger`: `'sign'` (in-person) or `'send'` (email to client), default `'send'`
- `payment_method`: persisted to estimate and contract
- `deposit_percent`: overrides profile default; fallback `profile.deposit_percent ?? 30`

**Loading state:** "Loading…" (`#94A0B4`); not found: "Contract not found."

### Trigger=sign flow

**Signature pad:** SVG, dashed blue border, placeholder "Tap here to sign" (34px, blue) when empty. "Clear" button when non-empty. Min path length: 50 units.

**Checkbox:** "I have read and agree to the Terms & Conditions and authorize the work described in this contract." — "Terms & Conditions" in blue bold

**CTA button:** "Sign Contract" / "Signing…" / "Retry signing →" (when `signingFailed`)
Disabled when: `!hasValidSig || !agreedToTerms || sending`

### Trigger=send flow

**Client signature slot:** "Awaiting signature" (blue, 11px, 600wt)

**CTA button:** "Send to client →" / "Sending…"
Disabled when: `sending`

### Validation Errors (SuccessBanner flash)

- "Please sign using your finger or stylus"
- "Please agree to the terms before signing"
- "No client email on this estimate"
- "Error creating contract: {message}"
- "Could not render signature. Please try again."
- "Signing failed: {error}"
- "Failed to send: {error}"
- "Error: {message}"
- SUCCESS: "Contract sent to {client_email}" → redirects to estimate detail after 1600ms

### Connection-lost warning

`"Connection lost — your signature is preserved. Tap below to retry."`
Bg `#FEF3C7`, border `#F59E0B`, text `#92400E`

### Success overlay (after in-person signing)

- Checkmark: green `#16A34A` on `#DCFCE7` circle
- Title: "You're all signed!"
- Body: "Thank you, {client_name}. Payment instructions have been sent to your email."
- Deposit card: "Deposit Due", amount in `#2563EB` 36px, `"{depositPct}% of {total}"`, "Status" → "SIGNED" green, "Sent to" → `client_email`
- Button: "View signed contract →" (blue)
- Button: "Done" (`#94A0B4`) → estimate detail

### Detail shown in contract (from profile)

- 'Warranty period' (when set)
- 'Completion timeframe' (when set)
- 'Accepted payment' (from URL param or `profile.payment_methods`)
- 'Project manager' (when set)

### Post-sign API calls (Promise.allSettled)

1. `POST /api/sign-contract`
2. `POST /api/notify-contractor-signed`
3. `POST /api/create-deposit`
4. (send trigger only) `POST /api/send-contract`

**Security note:** Estimate is fetched without `user_id` filter — no ownership verification.

---

## 19. Create/Send Invoice Page

**File:** `/app/dashboard/estimates/[id]/invoice/page.tsx`

### Already-exists guard

When `existingFinalInvoice` present:
- Title: "Final invoice already exists"
- Body: "{invoice_number} has already been sent for this estimate."
- Button: "View invoices" → `/dashboard/invoices`

### isFinal path (deposit exists)

**Info card rows:**
- Client name (bold `#0A1628`) + email (`#94A3B8`)
- `estimate_number`
- "Project total" — `#475467`
- "Deposit paid" — green `#059669` with `−` prefix
- "Additional charges" — conditional
- "Tax on charges ({rate}%)" — conditional
- "Balance due" — `fmtInv(invoiceAmount)` in blue `#2563EB`, 28px

**Additional charges section:**
- Header: "ADDITIONAL CHARGES" + "+ Add" button (blue)
- Empty: "None — tap + Add to include extras"
- Each row: label input (placeholder "e.g. Permit fee, Travel...") + `$` amount + red X

**Form card:**
- "Due Date *" — date input, default today + 14 days
- Quick buttons: "Net 14" / "Net 30"
- Interac e-Transfer section (when `interacEmail` on profile): "Send to" → email, "Message" → `"{estimate_number} balance"`, "Amount" → blue
- "Notes (Optional)" — textarea, placeholder "Additional notes for client (optional)", 3 rows

**Primary button:** "Send Final Invoice" / "Sending..." → opens confirm modal

**Send confirm modal:**
- Title: "Send Final Invoice?"
- Body: "This will send a final invoice of {amount} to {client_email}. This cannot be undone."

### Non-final path (no deposit)

- Invoice amount: 32px blue `fmtInv(invoiceAmount)`, sub: `"from signed estimate {estimate_number}"`
- Same date + notes fields
- Info banner: "The estimate status will update to "Invoiced" automatically." (Info icon, gray)
- Primary button calls `createInvoice()` directly — no confirm modal

### Error States

Bg `#FEF2F2`, border `#FECACA`, text `#DC2626`:
- "Due date is required"
- "Invoice amount must be greater than zero"
- "Final invoice already sent"
- `invErr.message`

### After send

- `invoices.insert({...})` → DB record
- `estimates.update({ status: 'invoiced' })`
- `POST /api/send-invoice` (fire-and-forget `.catch(() => {})`)

---

## 20. Reports Page

**File:** `/app/dashboard/reports/page.tsx`

**Access:** `role !== 'owner'` → redirect `/dashboard`

### Period Filter Chips

`30d` "Last 30d" · `90d` "Last 90d" · `ytd` "This year" · `all` "All time"
Default: `'30d'`. Active: bg `#2563EB`, white; inactive: transparent, `#64748B`

### KPI Cards

| Icon | Label | Sub-label | Value |
|------|-------|----------|-------|
| DollarSign | "Revenue" | "Signed" | Sum totals where status=`'signed'` |
| Send | "Pipeline" | "Pending" | Sum totals where status=`'sent'` |
| Target | "Close rate" | "Win rate" | `"{winRate}%"` (signed/total × 100, rounded) |
| TrendingUp | "Avg per job" | "Average" | Revenue ÷ signed count |

### Sales Funnel (4 rows)

| Label | Count | Color |
|-------|-------|-------|
| "Created" | all filtered | `#94A3B8` |
| "Sent" | filtered − drafted | `#2563EB` |
| "Signed" | signed | `#0F8A6B` |
| "Declined" | declined | `#DC2626` |

Each row: count (22px bold, colored), label, progress bar, percentage

### TopBar meta

`"{filtered.length} estimates · {fmtCAD(revenue)} revenue"` — `#94A3B8`

### Empty State

- "No data yet" (14px, 700wt, `#0A1628`)
- "Create and send estimates to see your reports here." (12px, `#94A3B8`)

### DB Query

`estimates` — `select('id, status, total, client_province, created_at')` — `.in('user_id', userIds)` — `.order('created_at', ascending: false)` — no limit

**Note:** `client_province` is selected but never used in any calculation.

---

## 21. Clients Pages

### Clients List (`/app/dashboard/clients/page.tsx`)

**TopBar:** eyebrow "CONTACTS", title "Clients", right `"{clients.length} client{plural}"` in `#94A3B8`

**Stat boxes:**
- "Clients" — `clients.length`
- "Signed jobs" — sum of `signedCount` across all
- "Total value" — sum where status ∈ `['signed','invoiced','paid']`

**Search:** `"Search by name or phone"` — `name` + `phone` (includes)

**Desktop table columns:** `Name` | `Phone` | `Estimates` | `Value` | _(chevron)_

**Value display:** if `totalValue > 0` → green `#059669` amount + `"{signedCount} signed"` sub. If 0 → `"—"` in `#94A3B8`

**No action buttons** on this page — clients created automatically from appointments

**Empty states:**
- Loading: "Loading…"
- Search no results: "No clients found" + "Try a different name or phone number."
- No clients: "No clients yet" + "Clients are added automatically when you create appointments."

**DB Queries:**
1. `clients` — `select('id, name, phone, email, address, city, created_at')` — `.order('created_at', ascending: false)` — `.limit(50)`
2. `estimates` — `select('id, client_id, status, total')` — `.in('user_id', userIds)` — `.not('client_id', 'is', null)` — **`.limit(20)`** ← truncates counts for large teams

---

### Client Detail (`/app/dashboard/clients/[id]/page.tsx`)

**"···" dropdown:** "Edit client" (Pencil icon) / "Delete client" (X icon, `#C0341A`)

**Hero badge:** "REPEAT CUSTOMER" (star icon, white) — shown when > 1 projects signed/accepted/invoiced/paid

**Stats strip:** "Visits" (non-cancelled appts) / "Lifetime" (sum signed+invoiced+paid totals) / "Win rate" (`Math.round(signedEsts/totalEsts*100)%` or `"—"`)

**Quick-comms:** "Call" (`tel:`) / mail icon (`mailto:`) / "Text" (`sms:`) — shown when phone/email present

**Details card (when phone/email/address present):**
- PHONE row: `tel:` link + "Call" right label
- EMAIL row: `mailto:` link
- ADDRESS row: `https://maps.apple.com/?q={addr}`

**Notes card:** label "NOTES" (amber `#9A7B2E`, bg `#FFFCF2`, border `#FBF3E0`)
- Edit button: Pencil + "Edit" (amber)
- Save button: "Save" / "Saving…" (disabled 0.6 opacity); "Saved" green `#16A34A` for 2500ms
- Textarea placeholder: "Gate codes, access info, preferences…"
- **Auto-saves on blur** (`onBlur={saveNotes}`) — fires even when nothing changed

**NEXT VISIT card:** date as `"Mon, Sep 15"`, time `" · 2:30 PM"`, truncated notes → `/dashboard/appointments/{id}/edit`

**PROJECT HISTORY section:**
- Empty: "No projects yet"
- Each ProjectCard: status rail (Won=`#16A34A`, Lost=`#C0341A`, Scheduled=`#2563EB`), work title (first line of notes, max 60 chars), status pill, expandable

**StepTimeline (expanded):**
- No estimate: "Scheduled — no estimate yet." + "+ Create estimate" → `/dashboard/estimates/new?appointment_id={id}`
- Status lost: 2 steps — estimate chip + "Declined" / "Went with competitor" (red)
- Status won/scheduled: 4 steps: 1) estimate + total, 2) "Contract signed" (signed/pending), 3) "Deposit" (amount + paid/unpaid/pending), 4) "Invoice" (amount + paid/unpaid/pending)

**Sticky CTA:** "New Appointment" → `/dashboard/appointments/new?{prefilled params}`

**Delete confirm:** "Delete this client?" / "This cannot be undone." → `clients.delete()` → `/dashboard/clients`

---

### New Client (`/app/dashboard/clients/new/page.tsx`)

**TopBar:** back → `/dashboard/clients`, label "Clients"; title "New client" (lowercase 'c')

**Sections:**

*CONTACT INFO:*
- Full name * (placeholder "Jane Smith") — `validateName()`
- Phone * (placeholder "(780) 555-0100", inputMode tel) — `formatPhone()` + `validatePhone()`, required
- Email (placeholder "jane@example.com") — `validateEmail()`, optional

*ADDRESS:*
- Street address — `AddressAutocomplete`, placeholder "123 Main St" — auto-fills city/province/postal
- City — placeholder "Edmonton"
- Province — select, options AB BC MB NB NL NS NT NU ON PE QC SK YT, default 'AB'
- Postal code — placeholder "T5J 2R7", `formatPostal()`, auto-formatted

*NOTES:*
- Textarea, placeholder "Any details about this client…", 4 rows

**Global error banner:** `#FEF2F2` bg — "Failed to save client. Please try again."

**Save button:** "Save client" (bg `#2563EB`) / "Saving…" (bg `#93C5FD`, cursor not-allowed)

**On save:**
1. Resolve `team_owner_id` from `profiles`
2. `clients.insert({ owner_id, name, phone, email, address, city, province, postal_code, notes })`
3. → `/dashboard/clients/{created.id}`

---

## 22. Appointments — New & Edit

### New Appointment (`/app/dashboard/appointments/new/page.tsx`)

**Pre-fill via URL params:** `prefill_name`, `prefill_phone`, `prefill_email`, `prefill_address`, `prefill_city`, `prefill_province`, `prefill_postal`

**LEAD_SOURCES:** `['Phone call', 'Website', 'Referral', 'Google', 'Kijiji', 'Other']`

**Status hardcoded to `'scheduled'`** on new; no status field shown.

**Fields:**

| Label | Type | Placeholder | Validation |
|-------|------|-------------|-----------|
| Client Name * | text | "Jane Smith" | `validateName()` — onBlur + on save |
| Phone | tel | "(403) 555-0100" | `validatePhone()`, `formatPhone()` on change |
| Email | email | "jane@email.com" | `validateEmail()` — onBlur + on save |
| Lead Source | select | — | LEAD_SOURCES |
| Address | AddressAutocomplete | "123 Maple St, Calgary, AB" | `validateAddress()` |
| City | text | "Calgary" | None |
| Province | select | — | TAX_RATES keys |
| Postal Code | text | "A1A 1A1" | `formatPostal()` |
| Date | date | — | min=today; required |
| Arrives after | TimePickerDropdown | — | |
| Arrives before | TimePickerDropdown | — | `allowNone`, `minAfter={appointment_time}` |
| Notes | textarea (3 rows) | "What does the client need?..." | None |
| Assigned To | select or disabled input | "Only you on the team" | |

**Quick duration buttons:** "1 hr" / "2 hr" / "3 hr" / "4 hr" (60/120/180/240 min)
Active: bg `#2563EB`, color `#fff`, border `#2563EB`. Inactive: bg `#fff`, color `#475467`, border `#D0D5DD`

**Overlap warning:** bg `#FEF3E2`, border `#FBDFA8`, text `#92400E`
Message: `"{assignedMemberName} already has an appointment with {clientName} at {time} that overlaps."`

**Submit:** "Save Appointment →" / "Saving…"; disabled when `saving || hasErrors(errors)`

**On save — client find-or-create:**
1. If phone: lookup `clients` by `owner_id + phone`
2. Else if email: lookup by `owner_id + email`
3. If not found: `clients.insert({ owner_id: sanitizedId, ... })` ← **bug: uses creator's ID, not resolved `ownerId`**
4. Client insert errors are console.error'd only — don't abort appointment save

**Redirect:** if `prefillClientId` → `/dashboard/clients/{id}`, else → `/dashboard/appointments`

---

### Edit Appointment (`/app/dashboard/appointments/[id]/edit/page.tsx`)

Same fields as new, with differences:
- No AddressAutocomplete — plain `<input>` for address
- No `client_address` validation
- Can set past dates (no `min` on date input)
- Overlap query adds `.neq('id', id)` to exclude current record
- "Assigned to" threshold: `teamMembers.length >= 2` (owner is included in `teamMembers` here, unlike new page)

**Action buttons:**
- "Cancel" — `router.back()`
- "Save changes" / "Saving…" — bg `#2563EB`, shadow `0 4px 14px rgba(37,99,235,0.35)`
- "Delete appointment" — bg `#FEF2F2`, color `#EF4444`

**Delete confirm:** "Delete appointment?" / "This appointment will be permanently deleted. This cannot be undone." / confirm "Delete"

**On save DB write:** `appointments.update({...}).eq('id', id)` — **save errors not surfaced to user** (error destructured but no `setError()` call)

**On delete:** `appointments.delete().eq('id', id)` — **no error handling at all** → always redirects to `/dashboard/appointments`

---

## 23. Settings

### Settings Shell (`/app/dashboard/settings/page.tsx`)

**Nav groups:**

| Group | id | Icon | Label | Description |
|-------|----|------|-------|-------------|
| ACCOUNT | profile | user | Profile | Name, email & avatar |
| ACCOUNT | password | lock | Password | Sign-in & 2FA |
| ACCOUNT | notifications | bell | Notifications | Email & push |
| BUSINESS | company | company | Company | Logo, address, defaults |
| BUSINESS | quote | quote | Quote Settings | Estimate validity & defaults |
| BUSINESS | reminders | bell | Follow-ups | Follow-up timing & templates |
| BUSINESS | team | team | Team | Manage team members (dynamic count) |
| BUSINESS | contract | contract | Contract | Terms template |
| BUSINESS | price | price | Price list | Opening types & rates |
| BILLING | billing | card | Plan & billing | Pro · CA$24/mo |
| BILLING | invoices | invoice | Invoices | Subscription history |

**Routing:** `quote` → `/dashboard/settings/quote`, `reminders` → `/dashboard/settings/reminders`, `price` → `/dashboard/price-list`. All others render inline.

**Permission gating:**
- `estimator`: only `profile` + `password` visible
- `admin`: excludes `billing`, `invoices`, `notifications`
- `team`: owner only
- `company`, `quote`, `contract`: require `permissions.settings === true`
- `price`: requires `permissions.price_list === true`

**Estimator info banner:** bg `#EFF6FF`, border `#BFDBFE`, text `#1D4ED8` — "Contact your account owner to change company settings."

**Desktop "Sign out" button:** bg `#FEF2F2`, border `#FECACA`, color `#DC2626`

**Desktop header pill:** "PRO PLAN" (blue)

---

### Profile Section

**DB read:** `profiles` `select('first_name, last_name, phone')` + `user.user_metadata.avatar_url`

**Fields:**

| Label | Type | Required | Placeholder |
|-------|------|----------|-------------|
| First name | text | yes | — |
| Last name | text | yes | — |
| Email | email (readOnly) | yes | — |
| Phone | text | no | +1 (555) 000-0000 |

Email hint: "Contact support to change your email"

**Avatar:** `accept="image/*"`, max 5 MB — error "Image must be under 5 MB". Storage: `avatars/{userId}/avatar.{ext}`

**Toasts:** "Image must be under 5 MB" / "Avatar upload failed" / "Failed to save profile" / "Please enter a valid phone number" / "Profile saved"

---

### Password Section

**Fields:** Current password (eye toggle) / New password (min 8, eye toggle) / Confirm new password (eye toggle)

**Error messages:**
- "Password must be at least 8 characters" (when 0 < len < 8)
- "At least 8 characters" (hint when empty)
- "Passwords do not match"

**Sessions sub-section:** "Sign out all devices" — "Ends all active sessions including this one" — button bg `#FEF2F2`, color `#DC2626`

**ConfirmModal:** "Sign out all devices" / "This will sign you out of all devices, including this one. Continue?" / "Sign out all"

**Toasts:** "Could not get user email" / "Current password is incorrect. If you signed up with Google, use Forgot password to set one." / "Error: {message}" / "Password updated"

---

### Notifications Section

**DB:** `profiles.notification_settings` JSONB — nested: `{ email: {...}, digest: string, inapp: {...} }`

**Email notification toggles:**
- Estimate viewed — "Client opened your estimate"
- Estimate signed — "Client signed your estimate"
- Estimate declined — "Client declined your estimate"
- Estimate expired — "Estimate passed 30 days without response"
- Deposit paid — "Client paid the deposit"
- Invoice overdue — "Invoice payment is overdue"
- Team invite — "Someone invited you to a team"

**Digest selector:** "off" / "weekly" / "daily"
Active: border `#2563EB`, bg `rgba(37,99,235,0.08)`, color `#2563EB`

**In-app toggles:**
- New estimates — "Notify on new estimate activity"
- Payments — "Deposits and invoice payments"
- Estimate declined — "Client declined your estimate"
- Estimate expired — "Estimate passed 30 days without response"
- Team activity — "Team member actions"

**Toasts:** "Failed to save notifications" / "Notifications saved"

---

### Company Settings (`/app/dashboard/settings/company/page.tsx`)

**Access guard:** `role === 'estimator'` → "Access restricted" — "Company Settings is managed by your account owner or manager." + "Back to Settings" button

**Sections:** Business details / Address / Business credentials / Tax & Compliance / Defaults / Documents & Signature

**Form fields (complete):**

*Business details:*
| Label | Placeholder | DB column |
|-------|-------------|----------|
| Company Logo | — | `logo_url` (storage + profiles) |
| Company name * | — | `company_name` |
| Phone | +1 (555) 000-0000 | `phone` |
| Website | https:// | `website` |

*Address:*
| Label | Placeholder | DB column |
|-------|-------------|----------|
| Street address | 123 Maple St | `address` |
| City * | — | `city` |
| Province * | — Select — | `province` |
| Postal Code | — | `postal` |

*Business credentials:*
| Label | Placeholder | DB column |
|-------|-------------|----------|
| Licence # | — | `licence` |
| Issuing Province | — Select — | `licence_issuing_province` |
| Licence Expiry Date | — | `licence_expiry_date` |
| Insurance Provider | e.g. Intact Insurance | `insurance_provider` |
| Policy # | — | `insurance` / `insurance_policy_number` ← written to both |
| Insurance Expiry Date | — | `insurance_expiry_date` |
| WSIB / WCB Number | — | `wsib_number` |

*Tax & Compliance:*
| Label | Hint | DB column |
|-------|------|----------|
| GST / HST Number | "Shown on invoices" | `gst_hst_number` |
| Company Contact Email | "Used as reply-to on emails sent to clients, and shown on PDFs" | `company_contact_email` |
| Financing Info | "Shown to clients on estimates as a financing option" | `financing_info` |
| Google Review Link | "Link to your Google Business Profile review page" | `google_review_link` |

Placeholder for Financing Info: "e.g. Financing available — as low as $150/month, OAC"
Placeholder for Google Review Link: "https://g.page/r/..."

*Defaults:*
| Label | Hint | DB column |
|-------|------|----------|
| Interac e-Transfer Email | "Shown on deposit invoice emails sent to clients" | `interac_email` |

Placeholder: "payments@yourcompany.ca"

*Documents & Signature:*
| Label | Placeholder | DB column |
|-------|-------------|----------|
| Signing Representative Name | Jane Smith | `signing_rep_name` |
| Title | Owner / GM | `signing_rep_title` |
| Warranty Summary | "Describe your warranty terms..." | `warranty_summary` |

**Inline validation warnings (`#D97706`):** `companyContactEmail` / `interacEmail` (invalid email) / `postal` (format A1A 1A1) / `googleReviewLink` (not starting https://)

**Website auto-fix:** prepends `https://` on save if not starting with `http://` or `https://`

**Logo:** PNG/JPG/SVG/WebP, max 5 MB; `logos/{userId}/logo.{ext}`. "Remove logo" in `#DC2626`.

**Toasts:** "Error saving: {message}" / "Changes saved" (submessage "Company profile updated") / logo: "Only PNG, JPG, SVG or WebP allowed" / "File must be under 5 MB" / "Upload failed" / "Error saving logo: {message}" / "Logo uploaded" / "Logo removed"

**Note:** The `warranty_pdf_url` upload (Warranty PDF, max 20 MB, storage `logos/{userId}/warranty.pdf`) exists ONLY in the inline `CompanySection` inside `settings/page.tsx` — NOT in this standalone page.

---

### Quote Settings (`/app/dashboard/settings/quote/page.tsx`)

**Access guard:** "Quote Settings is managed by your account owner or manager."

**One field:** "Estimate valid for" — select — options: 15 days / 30 days / 45 days / 60 days
Hint: "How long estimates remain valid after sending"
DB column: `default_valid_days`

**Toasts:** "Error saving: {message}" / "Saved"

---

### Reminder Settings (`/app/dashboard/settings/reminders/page.tsx`)

**Access guard:** "Reminder Settings is managed by your account owner or manager."

**DB:** `profiles.quote_settings.reminders` sub-key

**RemSettings defaults:**
- `auto_enabled: true`
- `max_count: 2`
- `first_after_days: 2`
- `second_after_days: 5`
- `template_1`: "Hi {client_name}, I wanted to follow up on the estimate {estimate_number} we prepared for {address}. Please let me know if you have any questions or would like to make any changes. The estimate is valid until {expiry_date}."
- `template_2`: "Hi {client_name}, this is a final follow-up regarding estimate {estimate_number} for {address} totalling {amount}. If you're still interested, please sign before {expiry_date} — after that the pricing may change. Feel free to reach out anytime."

**Card 1 — General:**
- "Auto reminders" toggle / "Automatically suggest reminders for stale estimates"
- "Max reminders per estimate" — select: 1, 2, 3

**Card 2 — Timing:**
- "First reminder" — select: 1 day / 2 days / 3 days / 5 days / 7 days; sub "After estimate is sent"
- "Second reminder" — same options; sub "After first reminder"

**Card 3 — Email template:**
- Tabs: "First reminder" / "Second reminder" — active: bg `#2563EB`, inactive: bg `#F1F5F9`, `#64748B`
- Textarea (7 rows)

**Available variables panel:** bg `#F8FAFF`, border `#DBEAFE`, header "AVAILABLE VARIABLES" (`#2563EB`)
Chips: `{client_name}` / `{address}` / `{amount}` / `{expiry_date}` / `{estimate_number}` — color `#1D4ED8`, bg `#EFF6FF`, monospace

**Save note:** `save()` does an extra `profiles.select('quote_settings')` read before the update to merge sub-keys — redundant round-trip on every save.

**Toasts:** "Error saving: {message}" / "Saved"

---

### Contract Settings (`/app/dashboard/settings/contract/page.tsx`)

**Access guard:** "Contract Settings is managed by your account owner or manager."

**DB read:** `profiles` `select('signature_url, warranty_period, deposit_required, deposit_percent, deposit_timing, project_manager, completion_timeframe, payment_methods, contract_clauses')` + migration fallback columns

**Card 1 — Contract Defaults:**

*Warranty Period:*
Select options: "1 year" / "2 years" / "5 years" / "10 years" / "Custom..."
When custom: text input, placeholder "e.g. Lifetime, 6 months, 3 years on parts"

*Deposit toggle:*
Hint: "This sets your default deposit percentage for new estimates. You can adjust or remove the deposit on individual projects when creating an estimate."
When ON:
- "Deposit Amount" — number input (0–100), suffix `%`, placeholder "10"
- "Deposit due" radio rows:
  - "Upon signing" — "Client pays deposit when signing the contract" (value: `'signing'`)
  - "Upon delivery" — "Client pays deposit when materials are delivered" (value: `'delivery'`)
  - Selected: border `0.5px solid #2045B8`, bg `#EEF2FF`; unselected: `#E2E8F0`, white

**Card 2 — Additional Contract Details:**

| Sub-label | Placeholder | DB column |
|-----------|-------------|----------|
| Project Manager | e.g. John Smith | `project_manager` |
| Completion Timeframe | "10-16 weeks from the date of signed contract" | `completion_timeframe` |

**Accepted Payment Methods** (pill checkboxes): Cash / E-Transfer / Cheque / Financing
Checked: border `#2563EB`, bg `rgba(37,99,235,0.07)`, text `#2563EB`

**Card 3 — Terms & Conditions:**

"Customize the clauses shown on every contract before the client signs."

Clause list (draggable/reorderable):
- Fixed clauses: "Required by law" badge (color `#2563EB`, bg `#EFF6FF`); read-only expanded content
- Non-fixed: drag handle, enable/disable toggle, delete (X, bg `rgba(220,38,38,0.08)`, `#DC2626`), editable title + content
- Drag-over: border `1.5px solid #2563EB`, bg `#EFF6FF`
- Disabled clause: opacity 0.55
- "+ Add clause" — dashed border `#E2E5EA`, color `#94A3B8`; creates with id `custom_${Date.now()}`, title "New clause"

**Delete clause confirm:** "Remove clause" / "Are you sure you want to remove this clause? This cannot be undone." / "Remove"

**Card 4 — Contractor Signature:** SVG canvas 800×160px, stroke `#0A1628`, lineWidth 2.5
- "Redraw" button when saved signature exists
- "Clear" + "Save Signature" (disabled: `#93aef5`, enabled: `#2563EB`) when drawing

**`mergeNewDefaults()` migration:** Only in this standalone page — walks saved clauses, finds any DEFAULT_CLAUSES absent by id, injects them in-order. Sets `isDirty = true` if new clauses added. **Not present in the inline ContractSection in `settings/page.tsx`.**

**Note:** "Discard" `onDiscard` = `() => {}` (noop) — pressing Discard does nothing.

**Toasts:** "Save failed: {message}" / "Saved" / "Save failed" / "Signature saved"

---

### Price List Page (`/app/dashboard/price-list/page.tsx`)

**Access guard:** `role === 'estimator'` → "Access restricted" — "Price List is managed by your account owner or manager."

**`isOwner`:** `role === 'owner'` OR (`role ∈ ['admin','manager']` AND `permissions.price_list === true`)

**Tabs:** Items / Surcharges / Colours

#### Items Tab

**TopBar:** back "Settings", eyebrow "BUSINESS", title "Price List"; "+ Add Item" (bg `#2563EB`, owner + items exist only)

**Search:** `"Search items..."` (when `hasItems`)

**Empty state (no items):**
- Icon ClipboardList (`#2563EB`, bg `rgba(37,99,235,.08)`)
- "No items yet" (`#0A1628`)
- "Add the windows, doors, and other products you install. They'll appear in your estimate form."
- "+ Add First Item" (owner only)

**Search no results:** `"No items match "{search}""`

**Category groups:** color accent bar `#2563EB` (Hardware: `#CBD5E1`); category label `#94A3B8`; "+ Add Item" inline per category (owner only)

**Item rows:**
- Label: `#0A1628` (Hardware: `#64748B`)
- Description: `#94A3B8`
- Total: `fmtCAD(base + lab)`, 700wt, `#0A1628`
- Delete X: bg `rgba(220,38,38,0.08)`, `#DC2626` (owner only)

**Add/Edit modal fields:**

| Field | Type | Placeholder | Notes |
|-------|------|-------------|-------|
| Item Name | text (autoFocus) | "e.g. Casement Window" | required |
| Description | textarea (2 rows) | "e.g. Includes installation and hardware" | optional |
| Materials ($) | number (min 0, step 10) | 0 | |
| Labour ($) | number (min 0, step 10) | 0 | |
| Category | chip buttons | — | Windows, Doors, Other, Hardware, + New |
| Custom category | text | "e.g. Skylights" | shown when "+ New" selected |

**Validation errors (inline `#FEF2F2` box):**
- "Please enter a category name."
- "Price cannot be negative."
- "An item with this name already exists in this category."

**Delete confirm:** "Delete {item.label}?" / "This cannot be undone."

#### Surcharges Tab

**Search:** `"Search surcharges…"`

Full group/key/label/unit table (57 fields — see §12 of this document for the complete list. Display labels here match those used in the UI):

- % unit: arch_pct "Arch shape" / custom_shape_pct "Custom shape" / bay_surcharge "Bay window assembly" / bow_surcharge "Bow window assembly" / combination_surcharge "Combination assembly"
- All others: $ unit

Input: number, min 0; bg `#F8FAFC`, border `#E5E7EB`; `$` prefix or `%` suffix (`#94A3B8`)

**"Save surcharges" button** (owner only): bg `#2563EB` (saving: `#93C5FD`)

**Flash:** "Surcharge values cannot be negative." / "Surcharges saved!"

#### Colours Tab

**Category pills:** all PRESET_CATEGORIES + custom categories
Active: border+color `#2563EB`, bg `#EFF4FF`

**"+ Add colour"** (owner only): bg `#EFF4FF`, dashed border `#93C5FD`, color `#2563EB`

**Colour row:** 36×36 swatch (border-radius 8, border `rgba(0,0,0,.1)`), name, manufacturer_code (`#94A3B8`), price_addon ("+${amount}" or "No fee"), ↑/↓ reorder, X delete

**Delete pre-check:** `estimate_openings.select('id', count).eq('colour_palette_id', c.id)` — if count > 0: "Cannot delete: colour is used in {count} existing opening(s). Remove it from estimates first."

**Add/Edit colour modal fields:**

| Sub-label | Type | Placeholder | Notes |
|-----------|------|-------------|-------|
| Colour swatch | color input + hex text | #FFFFFF | maxLength 7, monospace, uppercase |
| Name | text (autoFocus) | "e.g. White, Bronze, RAL 7016" | required |
| Manufacturer code (optional) | text | "e.g. RAL 7016, SW 6258" | |
| Price add-on ($) | number (min 0, step 5) | 0 | |

---

## 24. Additional API Routes

### `/api/log-activity/route.ts`

**Auth:** Server-side session required (401 if no user). `user_id` in body must match `user.id` (403 if mismatch). Always uses `user.id` as the actual `user_id` written — body value ignored.

**Required fields:** `event_type`, `actor_type` — 400 if missing

**Success:** `{ success: true }`

---

### `/api/team-invite/route.ts`

**Rate limit:** `inviteRateLimit` (5/hr per IP)

**Env:** `RESEND_API_KEY` required (500 if missing)

**Request:** `inviteeEmail` (required, validated) / `inviteeName` / `role` (default `'estimator'`) / `resendId` / `permissions`

**Resend path vs new path:** checks `resendId`; new path guards duplicate pending invite (409)

**Token check:** if `!invitation.token` → 500 "Invitation token missing"

**Join link:** `{origin}/team/join/{invitation.token}`

**Role display labels:** `owner` "Owner" / `estimator` "Sales / Estimator" / `manager` "Manager" / `admin` "Office Admin"

**Email:** from `"{companyName} <noreply@useapexscale.com>"`, subject `"You're invited to join {companyName}"`, CTA "Accept invite →" (bg `#3B5BF5`)

**On Resend error:** returns HTTP 200 with `{ emailWarning, emailError }` — not an error status

---

### `/api/team-join/route.ts`

**Auth:** Session required — 401 "Must be signed in to accept an invite"

**Token lookup errors:**
- Not found/used: 404 "Invite not found or already used"
- Expired: 410 "This invite has expired"
- Self-invite: 400 "You cannot accept your own invite"

**Role mapping for `role` column:** `owner` → `'owner'`, anything else → `'estimator'` (`member_role` gets the original string)

**Profile upsert:** `id, team_owner_id, member_role, role, onboarding_done: true, permissions` — name backfill only if profile currently has no value

**Success response:** `{ success: true, role: invite.role }` — returns original role string, not the mapped `appRole`

**Post-join (fire-and-forget):**
1. Welcome email to new member (uses `welcomeEmailHtml`)
2. In-app notification to owner: "Team member joined" / "{memberName} joined as {roleLabel}"
3. Owner email with Name/Email/Role table, CTA "View team members →"

---

### `/api/register-profile/route.ts`

**No authentication guard** — any caller can upsert any profile row by userId.

**Request:** `userId` (required) / `firstName` / `lastName`

**DB write:** `profiles.upsert(onConflict: 'id')`: `id, first_name, last_name, updated_at`

---

### `/api/places/route.ts`

**`type=autocomplete`:**
- POST to `https://places.googleapis.com/v1/places:autocomplete`
- Body: `{ input, includedRegionCodes: ['ca'], languageCode: 'en', [includedPrimaryTypes] }`
- On Google fail (non-2xx or JSON error): returns HTTP 200 `{ predictions: [] }` — silent failure
- Transforms `data.suggestions[]` → `{ place_id, structured_formatting: { main_text, secondary_text } }`

**`type=details`:**
- GET `https://places.googleapis.com/v1/places/{placeId}`, FieldMask: `'addressComponents,formattedAddress'`
- On fail: returns HTTP 502 `{ result: null }`
- Transforms `addressComponents` to legacy format: `{ types, long_name: longText, short_name: shortText }`

---

## 25. Known Bugs & Inconsistencies

### Critical

1. **`/api/register-profile` has no auth guard** — any unauthenticated network request can upsert any profile row by userId.

2. **New appointment `clients.insert` uses wrong `owner_id`** — uses creator's `sanitizedId` instead of the resolved `ownerId` (team owner). Clients created by team members land under their own ID, not the team owner's, breaking shared client lists.

3. **Contract page (`estimates/[id]/contract/page.tsx`) fetches estimate without `user_id` filter** — no ownership verification. Any authenticated user can load any contract by ID.

### Data Integrity

4. **Invoice numbering race condition** — both `[id]/invoice/page.tsx` and estimate duplicate both count rows to generate `INV-XXXX`/`EST-XXXX` without a DB transaction or sequence. Concurrent creates can generate duplicate numbers.

5. **`insurance` value written to two columns simultaneously**: `insurance` AND `insurance_policy_number`. On read, `insurance_policy_number` takes precedence.

6. **`client_province` fetched in reports but never used** — selected in the query but no per-province breakdown is rendered.

### Silent Failures

7. **Edit appointment: save errors not surfaced to user** — error destructured but no `setError()` call on DB update failure.

8. **Edit appointment `deleteAppt()` has no error handling** — always redirects to `/dashboard/appointments` even if delete fails.

9. **Clients list estimate join has `.limit(20)`** — if a team has > 20 estimates linked to clients, counts are silently wrong.

10. **`places` autocomplete returns HTTP 200 when Google fails** — callers get `{ predictions: [] }` silently.

### UI / Behavioral

11. **`signed` status stored in DB displays as `ACCEPTED` everywhere** — list page, detail topbar, signed banner.

12. **Discard button in Contract Settings is a noop** (`onDiscard = () => {}`) — pressing it does nothing in both inline and standalone versions.

13. **Inline `ContractSection` (`settings/page.tsx`) does NOT call `mergeNewDefaults()`** — new default clauses are not surfaced to users accessing Contract via the desktop settings panel.

14. **`warranty_pdf_url` upload exists ONLY in inline `CompanySection`** — not in the standalone `/settings/company/page.tsx`. The DB column `warranty_pdf_url` is only writable from `settings/page.tsx`.

15. **BillingSection is entirely hardcoded** — all values (price, renewal date, card number, storage, seat count) are static strings with no DB connection.

16. **Notes `onBlur` in client detail always fires a DB write** — even when nothing changed.

17. **`team-join` maps all non-owner roles to `'estimator'` for the `role` column** — `member_role` stores the original (e.g. `'manager'`), but `role` is always `'estimator'` for non-owners.

18. **`team-invite` on Resend email error returns HTTP 200** — caller must check for `emailWarning` field to detect delivery failure.

19. **Reminder settings `save()` does redundant extra `profiles` read before update** — merges `quote_settings` sub-keys with an unnecessary round-trip on every save.

20. **Onboarding welcome email swallows all errors silently** (`.catch(() => {})`) — no user feedback if email fails.

---

---

## 26. Auth — Password Reset Flow

### Forgot Password (`/app/auth/forgot-password/page.tsx`)

**Logo:** 32×32 box bg `#2563EB`, "ApexScale" 16px 700wt `#0A1628`

**Eyebrow:** "Reset your password" — 12px, `#6B7280`

**Heading:** "We'll send you a " + **"reset link."** (blue `#2563EB`) — 30px, 800wt

**Form field:**
| Label | Type | Placeholder | Validation |
|-------|------|-------------|-----------|
| "Email address" (uppercase via style) | email | `james@northview.ca` | `isValidEmail()` on blur + on submit |

**Validation flow:**
- Empty: `error = "Email is required"` (general error above button)
- Invalid format: `emailError = "Please enter a valid email address"` (below field, `#EF4444`, 12px)
- On blur: if filled + invalid → sets emailError

**`handleSend()` steps:** clears errors → validates → `localStorage.setItem('reset_email', email)` → `supabase.auth.resetPasswordForEmail(email, { redirectTo: '{origin}/auth/reset-password' })` → on error: `error = e.message` → on success: `sent = true`

**Success message:** "✓ Check your email for a reset link" — `#16A34A`, 13px

**Button states:** "Send reset link →" / "Sending…" / "Link sent!" — bg `#2563EB` (disabled: `#93C5FD`), disabled when `loading || sent`

**Secondary:** "← Back to sign in" — span, color `#2563EB`, → `/auth/login`

**Bug:** Two separate error vars (`error` vs `emailError`) shown in different positions — "Email is required" goes to `error` (above button), format error goes to `emailError` (below field).

---

### Check Email (`/app/auth/check-email/page.tsx`)

**Reads:** `localStorage.getItem('reset_email')` on mount

**Heading (p tag, not h1):** "Check your email" — 26px, 700wt, `#fff`

**Subtext:** "We've sent a reset link to your inbox." — 13px, `rgba(255,255,255,0.4)`

**Body heading:** "Reset link sent!" — 17px, 700wt, `#0A0E1A`

**Body paragraph:** "We sent a link to" / `{email || 'your email'}` / "Check your inbox and follow the instructions."

**Interactive (span):** "Resend email" — color `#2045B8`, 600wt, cursor pointer. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '{origin}/auth/reset-password' })`. **Return value never checked** — no error handling.

**Bug:** `resent` state is set to `true` for 3000ms but **nothing in the JSX reads it** — user gets zero visual feedback when resend succeeds.

**Buttons:**
- "Open email app →" → `window.location.href = 'mailto:'` (**no recipient address**)
- "Back to sign in" → `/auth/login`

---

### Reset Password (`/app/auth/reset-password/page.tsx`)

**Heading (p tag):** "Create new password" — 26px, 700wt, `#fff`

**Subtext:** "Your new password must be at least 8 characters." — 13px, `rgba(255,255,255,0.4)`

**Fields:**
| Label | Placeholder |
|-------|-------------|
| "NEW PASSWORD" (uppercase) | `Min 8 characters` |
| "CONFIRM PASSWORD" (uppercase) | `Repeat your password` |

Both `type="password"`. No inline validation — only on submit.

**Error messages (via `error` state):** "Password must be at least 8 characters" / "Passwords do not match" / `e.message`

**`handleUpdate()` steps:** validate length ≥ 8 → validate match → `supabase.auth.updateUser({ password })` → on success: `localStorage.removeItem('reset_email')` + `router.push('/dashboard')`

**Button:** "Update password →" / "Updating…" — bg `#2045B8`. **No visual change when disabled** (no color change applied).

**Dead code in this file:** `pwScore()` function, `PW_COLORS`, `PW_LABELS`, `inp`, `lbl`, `confirmPassword`/`setConfirmPassword` aliases, `F` and `HDR` constants — all declared but never used in JSX.

---

### Confirm / Confirmed Pages

**`/app/auth/confirm/page.tsx`** — reads `localStorage.getItem('confirm_email')` on mount

**Heading:** "Check your " + **"email."** (blue) — 30px, 800wt

**Body:** "We sent a confirmation link to" / `{email || 'your email address'}` / "Click the link to activate your account. Check your spam folder if you don't see it."

**Resend button:** "Resend confirmation email" / "Sending…" — calls `POST /api/send-confirmation { email }`. **Response never checked.**

**Success:** "✓ Confirmation email resent" — `#16A34A`, shown for 4000ms when `resent === true`

**"← Back to sign in"** → `/auth/login`

---

**`/app/auth/confirmed/page.tsx`** — displays only "Confirming your account…" (`#6B7280`, 15px)

**Logic (on mount):**
1. Creates raw Supabase browser client from env vars
2. Parses `window.location.hash` for `access_token` + `refresh_token`
3. `supabase.auth.setSession({ access_token, refresh_token })`
4. On success: reads `profiles.onboarding_done` → if true → `/dashboard`, else → `/onboarding`
5. Missing tokens or failed session → `/auth?error=confirmation_expired`
6. DB write: `profiles.upsert({ id, email, first_name, last_name, updated_at })` before reading `onboarding_done`

All redirects use `router.replace()` (no back-stack).

---

## 27. Public Estimate Signing Page

**File:** `/app/sign/[id]/page.tsx`

**Canvas:** 354×140px, stroke `#1A1A1A`, lineWidth 2.5, lineCap `round`. Placeholder: "Sign here with your finger" (`#CBD5E1`, 12px)

### Render States (in order)

**Loading** (`!estimate`): "Loading…" — 13px, `#94A3B8`

**Already Signed** (`status === 'signed'` or `'accepted'`):
- Green check circle: bg `#DCFCE7`, border `#BBF7D0`, stroke `#16A34A`
- "Already Signed" — 18px, 700wt, `#0A1628`
- "This estimate has already been signed. Contact {company_name || 'your contractor'} if you have questions." — 13px, `#64748B`

**Done — Anonymous user** (`done === true && isAnon !== false`):
- Hero: outer ring `rgba(22,163,74,0.10)` / inner circle `#16A34A` / white checkmark
- "Your estimate is approved" — 22px, 800wt, `#0A1628`
- "Thank you, {client_name}! A copy of your signed estimate and next steps are on their way to your email." — 14px, `#475467`
- Summary card: estimate_number, "SIGNED" pill (bg `#F0FDF4`, border `#BBF7D0`, dot `#16A34A`), "Project total" / `fmtCAD(total)`
- If `deposit_percent != null`:
  - "Deposit due ({pct}%)" / `fmtCAD(depositAmt)` — 22px, 800wt, `#2563EB`
  - "Balance on completion" / `fmtCAD(balanceAmt)` — 13px, 600wt
- "WHAT HAPPENS NEXT" steps: check email / pay deposit (if set) / "We'll be in touch to schedule next steps"
- "Download signed estimate (PDF)" → `/api/estimate-pdf?id={id}` (new tab)
- "Questions about your order? {company_name} · {phone}" — phone as `tel:` link

**Done — Authenticated user** (`done === true && isAnon === false`):
- Dark gradient header, "ALL DONE" eyebrow, "Signed!" heading (`#fff`)
- Card: estimate_number in `#2045B8`, total 22px 700wt, copy-sent + next-steps text

**Declined** (`declined === true`):
- "You have declined {estimate_number}. {company_name || 'Your contractor'} has been notified."

**Main signing view (default):**

Header bar: "ApexScale" (Apex `#0A1628`, Scale `#2563EB`), estimate number badge `#2563EB` bg `rgba(37,99,235,.08)`

Section: eyebrow "SIGNATURE", heading "Sign Below", sub "Hi {client_name || 'there'} — your signature confirms {estimate_number}"

Summary card: estimate_number in `#2563EB`, date, "Total: " + `fmtCAD(total)` (16px, 700wt, amount `#2563EB`)

Contract terms: shown if `profile.contract_terms` exists **AND is not exactly `'тут компанія щось напише'`** (Ukrainian sentinel string)

Consent: "By signing below, you agree to this estimate for {fmtCAD(total)} including all applicable taxes." — 12px, `#94A3B8`

**Bottom bar:**
- "I Agree — Sign {estimate_number}" / "Saving…" — bg `#2563EB` (disabled: `#CBD5E1`), disabled when `!hasSignature || saving`
- "Decline this estimate" — bg none, `#94A3B8`, 12px

**Decline confirm state:**
- "Are you sure you want to decline this estimate?" — 13px, 600wt, `#0A1628`
- "Cancel" + "Yes, decline" (bg `#DC2626`)

### API calls

1. `GET /api/public/estimate/{id}` on mount
2. `POST /api/sign-estimate { estimateId, action: 'sign', signatureBase64, clientName }` on sign
3. `POST /api/create-deposit { estimateId }` after sign — **failure silently console.error'd**, success screen shown regardless
4. `POST /api/sign-estimate { estimateId, action: 'decline' }` on decline — **`res.ok` never checked**, sets `declined = true` unconditionally

**Bug:** `isAnon` starts as `null` — condition `isAnon !== false` is true while auth check in flight, so anonymous success screen can flash briefly for authenticated users.

---

## 28. Team Join Page

**File:** `/app/team/join/[token]/page.tsx`

**ROLE_LABELS:**

| Role | Label | Description |
|------|-------|-------------|
| owner | "Owner" | "Full access — estimates, billing, team management" |
| estimator | "Sales" | "Create estimates, visit clients, collect signatures" |
| manager | "Manager" | "View all estimates and reports, read-only access" |
| admin | "Office Admin" | "Invoices and client list only" |

**On mount (parallel):** `supabase.auth.getUser()` + `GET /api/public/invite/{token}`
- 409 response → `alreadyMember = true`
- Non-OK → `expired = true`
- OK → sets invite data, auto-fills `firstName` from first word of `invitee_name`

### Render States

**Loading:** "Loading invite…" — `var(--ash)`, 13px

**Already a member:**
- CheckCircle2 icon, `#16a34a`
- "You're already a member of {alreadyMemberCompany}" / "Sign in to access your workspace."
- Button: "Sign In →" → `/auth/login`

**Expired:**
- Clock icon, `#94a3b8`
- "This invite has expired or been used" / "Ask the team owner to send you a new invite."
- Button: "Go to Sign In →" → `/auth`

**Done:**
- CheckCircle2 icon, `#16a34a`
- "You've joined {ownerName}" / "Taking you to your dashboard…"
- Auto-redirect: `router.push('/dashboard')` after 1800ms

**Check email:**
- Mail icon, `#2563eb`
- "Verify your email" / "We sent a confirmation link to {invitee_email}." / "After verifying, come back to this invite link to complete joining {ownerName}."

**Main invite view:**
- Role card: bg `rgba(59,108,255,.06)`, border `rgba(59,108,255,.2)`, label "Your Role" (uppercase, `#2045B8`), role label 15px 800wt, role desc 12px `#6b7280`

**If logged in:** info box "Signed in as {user.email}. Click accept to join {ownerName}." + "Accept & Join {ownerName}" button

**If not logged in — registration form:**

| Field | Type | Label | Notes |
|-------|------|-------|-------|
| Name | text | "Your name (optional)" | pre-filled from invite, autoComplete `given-name` |
| Email | text (readOnly) | "Email" | value = `invitee_email`, bg `var(--surface)`, cursor `not-allowed` |
| Password | password | "Create a password" | placeholder "At least 6 characters", autoComplete `new-password` |

**Validation:** `password.length < 6` → `error = 'Password must be at least 6 characters'`

**Button:** "Create Account & Join {ownerName} →" / "Creating account…"

**Back link:** "Already have an account? Sign in" → `/auth/login?next=/team/join/{token}`

**On register flow:** `supabase.auth.signUp({ email, password, data: { first_name } })` → if session: `POST /api/team-join { token }` → if `done`: set done state → else `json.error || 'Failed to join'` → if no session (email verify needed): `checkEmail = true`

---

## 29. Payment Setup Page

**File:** `/app/dashboard/estimates/[id]/payment-setup/page.tsx`

**URL params:** `id` (estimate UUID), `trigger` (default `'send'`)

**TopBar:** "Back" label, title "Payment Setup"

**Payment options:**

| Option | Icon |
|--------|------|
| E-Transfer | Landmark |
| Cheque | FileText |
| Cash | Banknote |
| Financing | CreditCard |

Filtered by `profile.payment_methods` if non-empty; otherwise all four shown.

**H1:** "How will {client_name || 'the client'} pay?" — 22px, 800wt, `#0A1628`

**Subtitle:** `"{fmtCAD(estimate.total)}{address ? ' · ' + address : ''}"` — 13px, `#94A3B8`

### Card 1 — PAYMENT METHOD

Grid 2-column. Selected: bg `#EFF6FF`, border `1.5px solid #2563EB`, icon+text `#2563EB`. Unselected: bg `#F8FAFC`, border transparent, icon `#64748B`.

### Card 2 — DEPOSIT

Preset buttons: 25% / 30% / 50% / 100%
- Selected: bg `#2563EB`, `#fff`, border `#2563EB`
- Unselected: bg `#F8FAFC`, `#64748B`, border `#E5E7EB`

Custom % input: number, 0–100, placeholder "e.g. 40", suffix `%`. Border `#2563EB` when active.

**Discount sub-card:**
- Warning banner if `estimate.status === 'sent'`: "This estimate was sent with a total of {fmtCAD(total)}. Changing the discount will update the contract amount." — `#92400E`, bg `#FFFBEB`, border `#FDE68A`
- Toggle: `$` | `%` tabs
- Number input, min 0, placeholder "0.00"

**Summary rows:**
- "Estimate total" → `fmtCAD(total)` — `#0A1628`
- "Discount" / "Discount ({value}%)" → `"− {fmtCAD(amount)}"` — `#16A34A` (when `discountAmount > 0`)
- "After discount" → `fmtCAD(afterDiscount)` (when discount > 0)
- "Deposit ({effectivePct}%)" → `fmtCAD(depositAmount)` — `#F59E0B`
- "Balance on completion" → `fmtCAD(balance)` — `#64748B`

### handleContinue

1. Clamps pct to 0–100 (1 decimal)
2. Recalculates discount, tax, total
3. **DB UPDATE** `estimates`: `discount_type`, `discount_value`, `discount_amount`, `tax_amount`, `total`
4. Redirect → `/dashboard/estimates/{id}/contract?trigger={trigger}&payment_method={method}&deposit_percent={pct}`

**Bug:** No error message shown if DB update fails — silently navigates.

---

## 30. Dashboard Sign Page (Contractor Preview)

**File:** `/app/dashboard/estimates/[id]/sign/page.tsx`

**TopBar:** back → `/dashboard/estimates`, backLabel "Estimates"; right slot: "CONTRACTOR VIEW" badge (9px, 700wt, `#2563EB`, bg `rgba(37,99,235,.08)`, border `rgba(37,99,235,.2)`)

**Loading:** "Loading…" — 13px, `#94A3B8`

**Estimate summary box:** client name header, opening rows (`{type} × {qty}{room}`), "Subtotal" / `{taxLabel}` / "Total"

**Contract terms preview:** shows `profile.contract_terms` verbatim if set. Fallback text: "This estimate prepared by {company_name || 'the contractor'} on {today} is valid until {valid_until || '30 days from date of issue'}.\n\nTotal price including applicable taxes: {fmtCAD(total)}.\n\nPayment terms: 50% deposit upon signing, balance upon completion."

**Button:** "Hand to Client →" — full width, bg `#2563EB`, 15px, 700wt, borderRadius 10 → `router.push('/sign/{id}')`

**DB:** uses `select('*')` on estimates (all columns, not an explicit list).

---

## 31. Marketing & PDF Viewer Pages

### Marketing (`/app/dashboard/marketing/page.tsx`)

**TopBar:** eyebrow "Marketing", title "Grow your business"

**Icon:** Megaphone (32px, `#2563EB`, strokeWidth 1.6) in 72×72 `#EEF3FF` circle (borderRadius 22)

**Heading:** "Coming soon" — 20px, 800wt, `#0B1220`

**Body:** "Marketing tools to help you win more jobs — email campaigns, follow-ups, and referral tracking." — 14px, `#94A0B4`, maxWidth 280

No buttons, no DB calls, no forms.

---

### PDF Viewer (`/app/dashboard/pdf-viewer/page.tsx`)

**URL params:** `url` (PDF URL to embed), `label` (iframe title, default "Document")

**TopBar:** variant dark, backLabel "Back" → `router.back()`

**Right slot:** "Save" anchor (Download icon, `#fff`, 13px, 600wt) — `href={url}`, `download` attribute → downloads file

**Content:** full-height iframe (`calc(100dvh - env(safe-area-inset-top) - 52px)`) bg `#1a1a1a`, `border: none`

**Bug:** No `url` validation — empty or malformed param renders blank iframe with no error message.

---

## 32. Cron / Background API Routes

### Auto-Remind Estimates (`/api/auto-remind-estimates/route.ts`)

**Auth:** `Authorization: Bearer {CRON_SECRET}` — 401 if mismatch

**Selects:** `estimates` where `status = 'sent'` (all columns needed for email)

**Per-estimate guards (in order):**
1. Profile missing → skip
2. `prof.quote_settings.reminders.auto_enabled` falsy → skip
3. `reminder_count >= max_count` (default 3) → skip
4. `last_reminder_sent_at` within last 24h → skip
5. First reminder (`reminderCount === 0`): requires `time since sent_at/created_at >= first_after_days × 86400000ms`
6. Subsequent: requires `time since last_reminder_sent_at >= second_after_days × 86400000ms`
7. `client_email` absent → skip

**Template selection:** `reminderCount <= 1` → `template_1`, else → `template_2`

**Fallback message:** "Hi {client_name || 'there'},\n\nJust following up on your estimate {estimate_number}. Let us know if you have any questions — we'd love to help!\n\n{companyName}"

**Template variables:** `{client_name}` / `{address}` / `{amount}` (CA$ locale 2dp) / `{expiry_date}` (en-CA long date) / `{estimate_number}`

**DB updates (before email send — critical: updates run even if email fails):**
- `estimates`: `last_reminder_sent_at`, `reminder_count: count + 1`
- If this is the last reminder (`newCount >= maxCount`): additionally `status: 'expired'`, `expired_reason: 'no_response_after_reminders'`

**Activity logs:** `'reminder_sent'` always; `'estimate_auto_expired'` if at max count

**Notification (only when `isAtMax`):**
```
type: 'estimate_expired'
title: 'Estimate expired'
body: '{estimate_number} expired without a response{ from {client_name} | ''}'
link: '/dashboard/estimates/{id}'
```

**Response:** `{ sent: N, ids: [...] }`

**Bug:** DB is updated before email is sent — if email throws, `reminder_count` is already incremented and won't retry.

---

### Expire Estimates (`/api/expire-estimates/route.ts`)

**Auth:** `Authorization: Bearer {CRON_SECRET}` — 401 if mismatch

**Selects:** `estimates` where `status = 'sent'` AND (`created_at < now - 30 days` OR `valid_until < today`)

**Bulk update:** `estimates.status = 'expired'` for all matches

**Bulk insert notifications:** one per estimate, type `'estimate_expired'`, same body format as auto-remind

**No email sent. No activity log entries.**

**Overlap risk with auto-remind:** Both routes can expire `status = 'sent'` estimates. An estimate near `max_count` AND past `valid_until` can trigger both, creating **duplicate notifications**.

**Response:** `{ expired: N, ids: [...] }`

---

### Resend Webhook (`/api/resend-webhook/route.ts`)

**Verification:** Svix signature via headers `svix-id` / `svix-timestamp` / `svix-signature`. Missing secret → 500. Bad sig → 401.

**Only processes:** `event.type === 'email.opened'` — all others → 200 `{ received: true }` (no-op)

**Tag extraction (two formats handled):**
1. Array: `[{ name, value }]` — searched for `name === 'estimate_id'` / `'contract_id'`
2. Object: `{ estimate_id, contract_id }` — direct key access

No tags found → `{ received: true, skipped: 'no estimate_id or contract_id tag' }`

**DB updates:**
- `estimateId`: `estimates` update `status = 'opened'`, `opened_at = now` WHERE `status = 'sent'` (guards against overwriting signed/declined)
- `contractId`: `contracts` update `opened_at = now` WHERE `status != 'signed'`

**No activity log. No notification. No error handling for DB failures.**

**Response:** `{ received: true, estimateId, contractId }`

---

### Sign Estimate (`/api/sign-estimate/route.ts`)

**No auth** — public endpoint

**Request:** `estimateId` (required), `action` (`'sign'` or `'decline'`), `signatureBase64` (required for sign), `clientName` (optional)

**Estimate guard:** status must be `'draft'` or `'sent'` — allows signing **draft** estimates.

**Decline flow:**
1. `estimates.update({ status: 'declined' })`
2. `notifications.insert({ type: 'estimate_declined', title: 'Estimate declined', body: '{actor} declined {estimate_number}' })`

**Sign flow:**
1. Strip data URI prefix from `signatureBase64`
2. Upload to `signatures` bucket: `{estimateId}/sig-{Date.now()}.png`, `upsert: false`
3. `estimates.update({ status: 'signed', signed_at, client_signature_url })`
4. `notifications.insert({ type: 'estimate_signed', title: 'Estimate signed', body: '{actor} signed {estimate_number}' })`
5. `logActivity` (non-fatal): `event_type: 'estimate_signed'`, `actor_type: 'client'`

**Response (sign):** `{ success: true, signatureUrl }`

---

## 33. Public API Routes

### Public Estimate (`/api/public/estimate/[id]/route.ts`)

**UUID validation:** regex `/^[0-9a-f]{8}-[0-9a-f]{4}-...-[0-9a-f]{12}$/i` — 400 if fails

**Returns:** `{ estimate, profile, openings }` — no auth required

**Estimate columns exposed:** all fields including `client_email`, `client_phone`, `client_address`, `total`, `discount_amount`, `scope_notes`, `client_signature_url`, `additional_charges`

**Opening columns:** 53 columns including all spec details, photo URLs, pricing

**Profile columns:** `company_name`, `address`, `phone`, `logo_url`, `deposit_percent`, `warranty_summary`, `warranty_period`

**Post-process:** `getCompanyName()` overwrites `profile.company_name` with resolved value

**No filtering by status** — any estimate ID returns data (drafts included).

---

### Public Contract (`/api/public/contract/[id]/route.ts`)

**GET:** Returns `{ contract, estimate, openings, profile }` — no auth required

**Contract columns:** all including `contract_terms_snapshot`, `client_signature_url`, `payment_method`, `deposit_percent`

**Profile columns:** extensive — includes `contract_clauses`, `contract_terms`, `cancellation_policy`, `gst_hst_number`, `licence`

**PATCH:** `action = 'decline'` only
- Guard: `status === 'signed'` → 409 "Already signed"
- Update: `contracts.status = 'declined'`
- Invalid action → 400

---

### Public Invite (`/api/public/invite/[token]/route.ts`)

**Token validation:** `length >= 8` — 400 if shorter

**Status check order:** expiry checked first (410), then `status !== 'pending'` (409 "Already a member"). Non-pending but expired would return 410 (expiry wins).

**Returns:** `{ companyName, inviteeName, inviteeEmail, role, expiresAt }` — excludes `token`, `owner_id`, `id`, `status`

**Error map:**

| Condition | Status | Body |
|-----------|--------|------|
| token < 8 chars | 400 | `{ error: 'Invalid token' }` |
| not found | 404 | `{ error: 'Invite not found or already used' }` |
| past `expires_at` | 410 | `{ error: 'Invite expired' }` |
| status ≠ 'pending' | 409 | `{ error: 'Already a member', companyName }` |

---

## 34. Email API Routes (Post-Signing)

### Notify Contractor Signed (`/api/notify-contractor-signed/route.ts`)

**No auth** — any unauthenticated caller can trigger

**Request fields:** `contractorEmail`, `clientName`, `companyName`, `total`, `depositPercent`, `contractId`

**Deposit math:** `Math.round(total * depositPercent) / 100` — treats `depositPercent` as integer (e.g. 25 = 25%). **If caller passes 0.25, result is off by 100×.**

**No try/catch around Resend** — any Resend error produces unhandled exception → unhandled 500.

**Email:**
- From: `"{companyName} <noreply@useapexscale.com>"`
- To: `contractorEmail`
- Subject: `"{clientName} signed {contractNumber}"` (e.g. "John Doe signed CON-ABC123")
- Header: "JUST SIGNED" eyebrow (`#0F8A4D`), "{clientName} signed\n{contractNumber}." h1, timestamp
- "DEPOSIT INVOICE SENT · DUE NOW" label — 11px, `#94A0B4`
- Deposit amount: 44px, 800wt, `#2563EB`
- Sub: "of {fmtCA(total)} total" — `#94A0B4`
- CTA: "View signed contract →" (bg `#3B5BF5`)
- Footer: "Powered by **ApexScale**"

**Response:** `{ success: true }` — always

---

### Send Contract Signed (`/api/send-contract-signed/route.ts`)

**No auth** — any unauthenticated caller can trigger

**Request fields:** `clientEmail`, `clientName`, `companyName`, `companyPhone`, `companyEmail`, `contractId`, `total`, `logoUrl`

**Resend error:** caught, `console.error`'d, **swallowed** — always returns `{ success: true }`

**Email:**
- From: `"{companyName} <noreply@useapexscale.com>"`
- To: `clientEmail`
- Subject: `"Your signed contract from {companyName}"`
- Reply-to: `companyEmail` if provided
- Top bar: logo + `"{contractNumber} · Signed"` pill (bg `#E7F6EE`, `#0F8A4D`)
- Green check circle (52px, bg `#E7F6EE`, stroke `#0F8A4D`)
- "Your contract is signed." h1
- "Thanks, {clientName || 'there'}! Your signed copy is saved on file with **{companyName}**."
- Summary table:
  - "Contract total" / `{totalFmt}`
  - "Next step" / "Deposit invoice sent separately"
- CTA: "View signed contract →" (bg `#3B5BF5`)
- Contact: "Questions? Contact **{companyName}**{ · phone}"

---

### Send Invoice (`/api/send-invoice/route.ts`)

**Auth:** Session required (401 if none); invoice filtered by `user_id = user.id`

**Request:** `invoiceId` (required)

**DB queries:**
1. `invoices select('*') WHERE id=invoiceId AND user_id=user.id`
2. Parallel: `estimates select('*') WHERE id=inv.estimate_id` + `profiles select(company_name, phone, email, interac_email, company_contact_email, gst_hst_number, logo_url)`
3. If `invoice_type === 'final'`: `invoices select('amount, status') WHERE estimate_id AND invoice_type='deposit'` (deposit reference — `status` fetched but never used)

**Activity log:** always `event_type: 'final_invoice_sent'` **regardless of whether invoice is deposit or final**

**Email subject:**
- Deposit: `"Invoice {number} — {fmtInv(amount)} due · {companyName}"`
- Final: `"Final Invoice {number} — {fmtInv(amount)} due · {companyName}"`

**CTA button:** "View invoice →" — points to `/estimate/{est.id}` (the estimate page, not an invoice-specific URL)

**e-Transfer email:** `prof?.interac_email || prof?.email || null`

**Error responses:** 400 (missing invoiceId / no client email) / 401 (no session) / 404 (invoice not found) / 500 (Resend error)

---

### Team Members DELETE (`/api/team-members/[id]/route.ts`)

**Auth:** Session required; ownership verified: `member.team_owner_id === user.id`

**Request:** URL param `id` only (DELETE method, no body)

**DB queries:**
1. `profiles select('id, team_owner_id') WHERE id={id}` (admin client, bypasses RLS)
2. `profiles update({ team_owner_id: null, member_role: null, role: null, permissions: null }) WHERE id={id}` (admin client)

**Note:** Also nulls `role` — could affect non-team-related role logic if `role` has broader meaning.

**Errors:** 401 / 404 / 403 / 500

**Response:** `{ success: true }`

---

## 35. Additional Bugs & Inconsistencies (from final audit)

### Security

21. **`/api/notify-contractor-signed` and `/api/send-contract-signed` have zero auth** — any internet actor can trigger emails from `noreply@useapexscale.com` by calling these endpoints directly.

22. **`/api/sign-estimate` has no auth** — any caller can sign or decline any estimate in `'draft'` or `'sent'` status.

23. **`/api/public/estimate/[id]` returns draft estimates** — no status filter; any valid UUID (including draft) exposes full client contact, pricing, and photo URLs.

24. **`/api/public/contract/[id]` returns full profile including `contract_terms`, `gst_hst_number`, `licence`** — no auth required.

### Data Integrity

25. **`auto-remind-estimates` updates DB before sending email** — if email throws, `reminder_count` is already incremented; estimate won't be re-tried.

26. **`expire-estimates` + `auto-remind-estimates` overlap** — both can expire the same estimate and both insert `notifications` of `type = 'estimate_expired'`, creating duplicate notifications.

27. **`send-invoice` logs `event_type: 'final_invoice_sent'` for all invoice types** — deposit invoices are mislabeled in the activity log.

28. **`send-invoice` fetches `depositInv.status` but never uses it** — dead DB column selection.

### Silent Failures

29. **`notify-contractor-signed` has no try/catch around Resend** — throws unhandled exception if Resend fails.

30. **`send-contract-signed` swallows Resend errors** — always returns `{ success: true }` even if email never sent.

31. **`sign/[id]` deposit creation failure is silent** — `/api/create-deposit` error only `console.error`'d; client sees success screen.

32. **`sign/[id]` decline: `res.ok` never checked** — `declined = true` set unconditionally.

33. **`check-email` resend has no error handling** — `supabase.auth.resetPasswordForEmail` return value never checked.

34. **`confirm/page.tsx` resend `fetch('/api/send-confirmation')` response never checked.**

### UI / UX

35. **`check-email` `resent` state never rendered** — user gets no visual feedback when resend succeeds.

36. **`reset-password` button has no disabled visual change** — no color applied when loading.

37. **`check-email` "Open email app →"** opens `mailto:` with no recipient address.

38. **`reset-password` dead code:** `pwScore()`, `PW_COLORS`, `PW_LABELS`, `inp`, `lbl`, `F`, `HDR`, `confirmPassword` alias — all declared but never used.

39. **`notify-contractor-signed` deposit percent math bug** — `Math.round(total * depositPercent) / 100` treats percent as integer. Passing `0.25` instead of `25` produces amount 100× too small.

40. **`isAnon === null` race** in `sign/[id]` — anonymous success screen can render briefly for authenticated users before auth check resolves.

41. **Ukrainian sentinel value** in `sign/[id]` — contract terms hidden if exactly `'тут компанія щось напише'` (meaning "the company will write something here"). A contractor who never sets terms but whose default value somehow equals this string would silently show no terms.

42. **`pdf-viewer` no URL validation** — empty `url` param renders blank iframe with no error.

43. **`payment-setup` silent DB fail** — no error shown if `estimates.update` throws in `handleContinue`.

---

## §36 — Auth: Splash, Login, Register, OAuth Callback

### `app/auth/page.tsx` — Splash / Landing

**UI strings:** Badge `"🇨🇦 For Canadian Contractors"` · Hero `"Close jobs before you leave the driveway."` · Features: `"Estimate on-site in minutes"`, `"Client signs on your phone"`, `"Invoice sent automatically"` · CTA `"Get Started — Free Trial →"` · Secondary `"Sign In →"` · Fine print `"14-day free trial · No credit card needed"`.

**Colors:** Hero gradient `#0A0E1A→#1A2744→#0D1B3E` · Glow `rgba(59,108,255,0.35)` · Page bg `#F4F4F2` · Checkmark circle `#2045B8` · Primary button `#2045B8`.

**Navigation:** Primary CTA → `router.push('/auth/register')` · Sign In → `router.push('/auth/login')`.

No DB calls, no state.

**Bugs:**
- **Brand color inconsistency:** Splash uses `#2045B8` for buttons/checkmarks; all other auth pages use `#2563EB` — two different shades of blue with no shared token.
- **No session redirect:** Logged-in user landing on `/auth` sees the full splash; no `router.replace('/dashboard')`.
- **Three duplicate Logo implementations** across splash/login/register — no shared component; each has different markup and different blue hex.

---

### `app/auth/login/page.tsx` — Login

**UI strings:** Eyebrow `"Welcome back"` · Headline `"Sign in to your account."` · Fields: `"Email"` placeholder `"james@northview.ca"`, `"Password"` placeholder `"Your password"` · Link `"Forgot password?"` · Submit idle `"Sign in →"` / loading `"Signing in…"` · Divider `"or"` · Google `"Continue with Google"` · Footer `"Don't have an account? Sign up free"`.

**Colors:** Page bg `#FFFFFF` / form `#F8F9FB` · Accent/button `#2563EB` · Disabled `#93C5FD` · Error `#EF4444` · Border-width changes on error: `0.5px → 1px` → 0.5px layout shift.

**State:** `email`, `password`, `loading` (never reset to false on success), `error`, `emailError`.

**API calls:** `supabase.auth.signInWithPassword` · `supabase.auth.signInWithOAuth({ provider: 'google' })`.

**Navigation:** success → `router.push('/dashboard')` · forgot → `/auth/forgot-password` · footer → `/auth/register`.

**Bugs:**
- `loading` never reset to `false` on successful login — button stays frozen if navigation is slow.
- `<label>` has no `htmlFor`, `<input>` has no `id` on both fields — clicking label doesn't focus input.
- Password input missing `autocomplete="current-password"`.
- Google button has no disabled state while `loading=true` — double-tap can fire two OAuth redirects.
- Existing `error` state not cleared before `handleGoogle` — previous email-login error stays visible.
- `createClient()` called in component body on every render (no memoization).

---

### `app/auth/register/page.tsx` — Registration

**UI strings:** Eyebrow `"Create your account"` · Headline `"Free 14-day trial. No card."` · Fields: `"First name"` placeholder `"James"`, `"Last name"` placeholder `"Morrison"`, `"Email"` placeholder `"james@northview.ca"`, `"Password"` placeholder `"Min 8 characters"` · Terms `"By signing up you agree to our Terms and Privacy Policy"` · Submit `"Create account →"` / `"Creating account…"`.

**`canSubmit` check:** `!loading && firstName.trim().length > 0 && isValidEmail(email) && isValidPassword(password) && agreed`. Last name not required.

**API calls:**
1. `supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { first_name, last_name } } })`
2. `fetch('/api/register-profile', { method: 'POST', body: { userId, firstName, lastName } })` — response never checked.
3. `supabase.auth.signInWithOAuth({ provider: 'google' })` — no Terms agreement check.

**Navigation:** session present → `/onboarding` · no session → `/auth/check-email` · Terms → `router.push('/terms')` (replaces page, erases form).

**Bugs:**
- `/api/register-profile` response never checked — silent profile creation failure sends user to onboarding with no row.
- **Double profile write race:** `signUp` metadata + `register-profile` fetch + OAuth `callback` all upsert `profiles` concurrently; can overwrite `first_name`/`last_name` with null.
- Google OAuth bypasses Terms agreement check — legal compliance risk.
- `loading` never reset to `false` on success path.
- Terms/Privacy links use `router.push` — navigating away erases all form data. Should be `window.open(..., '_blank')`.
- Custom checkbox (`<div onClick>`) has no `role="checkbox"`, `aria-checked`, or keyboard handler — inaccessible.

---

### `app/auth/callback/route.ts` — OAuth / Email Confirmation Callback

**URL params consumed:** `code` (PKCE exchange) · `token_hash` (OTP) · `type` · `next` (redirect target, defaults `/dashboard`).

**Open-redirect guard:** `rawNext.startsWith('/') && !rawNext.startsWith('//')` — correct.

**DB queries:**
- `profiles.select('first_name, last_name').eq('id', user.id).maybeSingle()` — pre-existing name check (PKCE path only)
- `profiles.upsert({ id, email, updated_at, [first_name], [last_name] })` — both paths; `ignoreDuplicates: false`
- `profiles.select('onboarding_done').eq('id', userId).single()` — destination resolution

**Logic paths:**
- PKCE: exchange code → check existing name → upsert profile → `resolveDestination` → redirect
- token_hash: verifyOtp → upsert profile unconditionally → `resolveDestination`
- Fallback: redirect `/auth?error=oauth`

**Bugs:**
- Both upsert calls: `await supabase.from('profiles').upsert(...)` — return value never destructured. DB failure silently ignored; user redirected normally with no profile row.
- `resolveDestination` uses `.single()` — throws PGRST116 on 0 rows; should be `.maybeSingle()`.
- token_hash path does NOT check for pre-existing profile name fields before overwriting — updating email re-signs can overwrite user's edited name.
- `?next=<deep-link>` bypasses onboarding check entirely when `next !== '/dashboard'`.
- Callback uses anon key (not service key) — upserts go through RLS; silent failure if RLS is restrictive.

---

## §37 — API: `send-contract/route.ts`

**Auth:** No session check, no bearer token. Any unauthenticated caller knowing a `contractId` and `clientEmail` can send contract emails on behalf of any company. Critical security gap — same pattern as `notify-contractor-signed`.

**Rate limit:** Upstash sliding window 10/hr per IP (`x-forwarded-for`, spoofable).

**Request params:** `contractId`, `estimateId` (optional), `clientEmail` (checked), `companyName` (unchecked), `clientName` (accepted, never used in email body).

**DB queries (service role):**
- `estimates.select('client_name, client_address, client_city, total, user_id, deposit_percent, estimate_number').eq('id', estimateId).single()`
- `profiles.select('logo_url, phone, deposit_percent, company_contact_email, interac_email').eq('id', est.user_id).single()`
- `activity_log.insert(...)` on success

**Email:** From `${companyName} <noreply@useapexscale.com>` · Subject `"Contract from ${companyName} — Ready to Sign"` · CTA `"Review & sign contract →"` linking to `/sign/contract/${contractId}` · `open_tracking: true` unconditionally.

**HTML variables:** logo vs letter-avatar · project address or generic intro · totals block (conditional on `totalFmt`) · deposit row · phone in footer.

**Bugs:**
- No auth check — critical (same severity as §34 `notify-contractor-signed`).
- `contractId` not null-checked before `.slice(0, 6)` — crashes with TypeError if absent.
- `companyName` not null-checked before `.charAt(0)` — crashes if null.
- `companyName` raw-interpolated into HTML `alt` and `<span>` — XSS if value contains `"` or `<script>`.
- `prof.logo_url` used directly as `<img src>` without domain validation.
- `clientName` destructured but never used in email — email not personalized.
- `activity_log.entity_id` set to `estimateId` not `contractId` for a `contract_sent` event.
- `.single()` on both queries — should be `.maybeSingle()` for explicitness.
- `open_tracking: true` without consent mechanism — CASL/GDPR compliance gap.
- `depositPct` fallback chain: if DB column stores a non-numeric value, `depositFmt` renders `"CA$NaN"`.

---

## §38 — Public Estimate View (`app/estimate/[id]/page.tsx`)

**State:** `estimate`, `openings`, `profile`, `docStatus: 'loading'|'signed'|'declined'|'active'`.

**API calls:**
1. `GET /api/public/estimate/${id}` — fetches estimate + profile + openings (no auth). Error: silently stays in loading state forever (no error UI).
2. `POST /api/track-estimate-view` — fire-and-forget `.catch(() => {})`.
3. `GET /api/estimate-pdf?id=${id}` via `window.location.href` redirect — replaces page on PDF error.

**Conditional renders (summary):**
- `docStatus === 'loading'` → spinner
- `docStatus === 'signed'` → full-screen: `"✅"`, `"Already signed"`, `"{est_number} has already been signed. Contact {company_name} if you have questions."`
- `docStatus === 'declined'` → full-screen: `"👋"`, `"Estimate declined"`, `"Feel free to reach out if you change your mind."`
- Active: full estimate card with openings, pricing, validity, warranty

**Key labels:** `"ESTIMATE"` badge · `"Prepared for"` · `"Project site"` · `"Same as above"` · `"Total incl. tax:"` · `"Deposit ({pct}%):"` · `"Scope of work"` · `"Notes"` · `"Pricing"` · `"Validity"` · `"Warranty"` · Footer `"{company_name} · {estimate_number} · Powered by ApexScale"` · Download `"Download PDF"`.

**Opening field labels rendered:** Location, Room, Floor, Product, Size, Material, Ext. colour, Int. colour, Grid, Installation, Door glass, Core, Astragal, Door style, Glass insert, Glass finish, Lockset, Deadbolt, Brickmould, Jamb, Threshold, Screen, Ventilation, Closer, Pet door, Seat board, Head board, Glass, Notes.

**Bugs:**
- Permanent loading screen when API fails — `docStatus` stays `'loading'`, no error message shown.
- **Double Google Font load** — `Plus Jakarta Sans` imported via both `app/layout.tsx` and an inline `@import` in this file — redundant network request per estimate view.
- `fmtDate` uses `new Date(iso + 'T00:00:00')` in local timezone — date can appear 1 day off for viewers in UTC-5/UTC-7.
- `view_count` in `Estimate` interface but never rendered — dead interface field.
- `taxLabel` falls back to `|| 'AB'` province — silent `0%` tax if province not in `TAX_RATES`.
- `SECTION_TYPE_MAP` (combo sections) has mixed old/new builder type key formats — wrong drawings for one data format.
- PDF download uses `window.location.href` — page replaced by error if PDF fails. Should be `window.open(...)`.

---

## §39 — Root Pages and Layouts

### `app/page.tsx` — Root Splash/Redirect

Animated splash screen. On mount: `supabase.auth.getSession()` → after **2200ms hardcoded delay**: authenticated → `router.replace('/dashboard')`, unauthenticated → `router.replace('/auth')`.

**Visible strings:** `"Apex"` + `"Scale"` wordmark · `"From quote to signed"` tagline · `aria-label="Loading ApexScale"`.

**Colors:** Bg gradient `radial-gradient(120% 90% at 50% 18%, #3B82F6 0%, #2563EB 34%, #1D4ED8 66%, #1A368F 100%)` · Wordmark `#fff` · Tagline `rgba(255,255,255,.72)`.

**Bugs:**
- 2200ms delay is always applied regardless of how fast session resolves — ~2s penalty on every app load.
- `getSession()` error: destructure `{ data: { session } }` on null `data` throws — stuck on splash.
- `useEffect` dep array `[]` uses `router` internally without listing it — ESLint warning, strict-mode risk.

---

### `app/layout.tsx` — Root Layout

**Meta:** title `'ApexScale'` · description `'Estimate software for W&D contractors in Canada'` · manifest `/manifest.json` · apple-web-app title `'ApexScale'` · statusBarStyle `'black-translucent'` · theme-color `#0A0E1A` (differs from `NAVY = #0A1628` used everywhere else — inconsistency) · `<html lang="en">`.

**Font:** Google Fonts `Plus Jakarta Sans` weights 400/500/600/700/800.

**Service Worker:** `dangerouslySetInnerHTML` script — `SKIP_WAITING` auto-update pattern, `controllerchange` → `window.location.reload()`.

**Bugs:**
- `dynamic = 'force-dynamic'` at root layout — **disables static generation for every route in the entire app**, including the public estimate page. Should be per-route.
- `maximumScale: 1, userScalable: false` — disables pinch-to-zoom globally. WCAG 1.4.4 violation.
- Duplicate font load with `app/estimate/[id]/page.tsx` (inline `@import`).
- `theme-color: #0A0E1A` ≠ `NAVY #0A1628` — browser chrome tint differs from design system navy by a few points.
- No dynamic OG/meta for public estimate URLs — all shared links show generic app description.

---

### `app/dashboard/layout.tsx` — Dashboard Layout

**Auth flow:** `supabase.auth.getUser()` → `!user` → `redirect('/auth')` → `profiles.select('trade, team_owner_id').eq('id', user.id).single()` → `!profile?.trade && !profile?.team_owner_id` → `redirect('/onboarding')` → renders `<Sidebar>`, `<main>`, `<DrawerNav>`.

**Renders:** `.app-shell` div with Sidebar (desktop), main content slot, DrawerNav (mobile).

**Bugs:**
- `profiles` DB error silently ignored — `profile` becomes `null`, user redirected to `/onboarding` even on network failure.
- `profiles.single()` — throws PGRST116 on 0 rows. Should be `.maybeSingle()`.
- Profile data fetched here (`trade`, `team_owner_id`) is not reused by Sidebar/DrawerNav — both child components issue their own profile queries. Duplicate round-trip per page load.
- No `loading.tsx` — SSR DB calls block entire dashboard render; blank screen on slow connections.
- Team member with deleted owner account: `team_owner_id` is set, bypasses onboarding redirect — can access dashboard in broken state.

---

## §40 — Dead Code: `app/dashboard/estimates/new-old/page.tsx`

**Confirmed dead code** — 2057 lines, zero references from any navigation or link in the codebase. The active builder is at `/dashboard/estimates/new/`. Should be deleted.

Notable bugs in the dead file (for record only):
- `type_field_visibility` and `window_subtypes` fetched without `user_id` filter — data leak if RLS is permissive.
- Client `find-or-create` wrapped in `catch {}` — silent insert failure saves estimate with `client_id: null`.
- Review-step UI hardcodes `"Valid for 30 days"` regardless of `profile.default_valid_days` setting.
- Estimate number collision via count-based numbering (same race condition as main builder).
- Visibility-change refetch (on tab focus) has no error handling; no event listener cleanup on unmount.

---

## §41 — Estimate Builder v2 Components

### `opening-editor.tsx`

**Props:** `op`, `onVal`, `onSub`, `openType`, `openPicker`, `setPicker`, `palettes?`, `userId?`, `onPhotoUpdate?`, `onSections?`.

**State:** `openSecs: Record<string, boolean>` — which collapsible sections are open; init with only first section open.

**Key behavior:** `groupSections(op)` assembles field keys per section from `fields + extraFieldsBySubtype + extraFieldsByValue`. `filterKeys` hides `condition` for non-retrofit transom (duplicates data-model logic). Photos section silently suppressed when `userId` or `onPhotoUpdate` absent — no user-visible indicator.

**Bugs:**
- `resolveFrameColor` function defined (lines 85–96) but never called anywhere — dead code.
- Inline IIFE in JSX for `op.sections` JSON parsing on every render — swallows parse errors, duplicates logic from `review-step.tsx`.
- `openSecs` state initialized once on mount — stale when parent reuses same `OpeningEditor` instance for different `op`.
- `onSections` defaults to `() => {}` silently when `undefined` — section changes dropped with no warning.

---

### `opening-row.tsx`

**Props:** `index`, `op`, `price` (pre-formatted), `onEdit`, `onDup`, `onDel`.

**UI:** Numeric badge · type name · `× {qty}` · subtitle `{sub} · {size} · {room}` · price · Duplicate / Remove buttons.

**Chips:** built from base fields + `extraFieldsBySubtype`; `Ext:` / `Int:` prefixes for colour fields.

**Bugs:**
- `summaryChips` does not process `extraFieldsByValue` fields — bay/bow extras (roofType, supportType) never appear as chips.
- Chip `key={i}` (array index) — incorrect key for list diffing.
- `qty` coercion: `op.vals.qty as number || 1` — if `qty` is string `"1"`, truthy coercion hides the quantity display accidentally correctly but is fragile.
- Chip colors hardcoded `#EEF3FF` / `#1D4ED8` — `#1D4ED8 ≠ C.blueDeep (#2045B8)` — design token divergence.

---

### `review-step.tsx`

**Props:** `clientInfo`, `openings`, `prices`, `trimCost?`, `trimState?`, `scopeNotes?`, `initialDiscountType?`, `initialDiscountValue?`, `onEditOpenings`, `onSave`, `saving?`.

**Price math:** `subtotal = sum(prices) + trimCost` · `discountAmt = percent: subtotal*min(val/100,1) | fixed: min(val, subtotal)` · `total = (subtotal - discount) * (1 + taxRate)`.

**State:** `discountType`, `discountValue`, `expanded: Set<number>` (all open ≤3 openings, none otherwise).

**Key labels:** Section headers: Client, What's included (N), Estimate Notes, Trim & Finishing, Discount (optional) · Subtotal, Discount (n%), tax label, Total · Button `"Save estimate →"` / `"Saving…"`.

**Bugs:**
- `initialDiscountType/Value` only used for `useState` init — re-renders with different values don't update state (no `useEffect` sync).
- Discount `type="number"` has `min="0"` but no `max` — user can type `200%` which silently caps at 100% but input shows uncapped value.
- `discountValue` not cleared when switching `discountType` — `"500"` fixed becomes `"500%"` confusingly.
- `prices[i]` / `openings[i]` assumed aligned — if lengths differ, `prices[i] = undefined` → `CA$NaN` rendered.
- Chip colors same hardcoded `#1D4ED8` inconsistency as `opening-row.tsx`.

---

### `client-step.tsx`

**Modes:** `browse` (search existing clients) · `create` (new client form) · `selected` (client chosen, province editable).

**State:** `subMode`, `clients`, `search`, `loading`, `nameErr`, `estimateCount`.

**UI strings:** `"Find existing client"` · search placeholder `"Search by name, phone or email…"` · `"Loading clients…"` · `"No clients match "{search}""` · `"New client"` · Client fields: Name*, Phone, Email, Address, Province · `"Continue to openings →"`.

**DB:** `clients.select('id, name, phone, email, address, city, province')` — no error handling on failure; silently shows empty list.

**Bugs:**
- CSS class names `"f"`, `"sl"`, `"r1"`, `"r2"` from `globals.css` mixed with inline-style system — form fields render at 16px/12px 14px padding vs 13px/specific padding everywhere else. Visual inconsistency.
- Province `<label>` has no `htmlFor` — label click doesn't focus select.
- `selectClient` concatenates `c.address + ', ' + c.city` — if DB stores full address including city already, renders `"123 St, Calgary, Calgary"`.
- `backToBrowse` uses `setTimeout(..., 50)` to focus search — timing hack.
- No error state for failed client fetch.

---

### `section-builder.tsx`

**Exports:** `CombinationDrawing` (SVG diagram) · `SectionBuilder` (interactive editor).

**Section types:** Picture, Fixed, Casement, Awning, Slider, Single Hung.

**Presets:** hard-coded array in `PRESETS` constant.

**Width modes:** Equal (distribute total across sections equally) · Custom (per-section).

**Bugs:**
- `idsRef.current` mutated directly during render — double-mutation risk in React StrictMode.
- `handleUnitCount('Custom')` is no-op — user at 6 sections sees "Custom" in dropdown; selecting it does nothing, no feedback.
- `eqW` uses `Math.round` — 73" ÷ 3 → 24+24+24 = 72 (1" lost). No correction.
- `glassType` prop accepted by `CombinationDrawing` but never used in SVG rendering — dead prop.

---

### `type-picker.tsx`

**Props:** `open`, `current?` (currently selected typeId), `onPick`, `onClose`.

**State:** `q: string` — search query; resets on each open (unmounts on close).

**UI:** Sheet title `"Choose product type"` · placeholder `"Search types…"` · results grouped by `CATALOG` group labels.

**Bugs:**
- Early `return null` when `!open` — no close animation possible.
- No keyboard navigation (no arrow keys, no Enter to select).

---

### `builder-header.tsx`

**Exports:** `BuilderHeader` · `BottomBar` · `SectionTitle` · `PillStepper`.

**`FLOW_STEPS`:** `['Client', 'Openings', 'Details']` — 3 steps.

**PillStepper:** active step = `flex: 2`, blue bg · done = transparent, checkmark · future = transparent, muted number.

**Bugs:**
- `BuilderHeader` title `"New estimate"` hardcoded — wrong when used for edit flow.
- `PillStepper` `cur = step - 1` — if `step = 0`, all pills render as future state (no bounds check).
- `SectionTitle` renders `"0"` count when `count = 0` — no zero-suppression.
- Back button uses raw Unicode `←` character; CTA uses `→`. Neither uses the `EBIcon` components available in the same file.

---

### `photos-upload.tsx`

**Slots:** `interior → "Interior"` · `exterior → "Exterior"` · `photo3 → "Measurement"` · `photo4 → "Additional"`.

**Upload:** validates MIME (`jpg/png/webp/heic/heif`) and size (5 MB) → Supabase Storage → returns public URL.

**Delete:** parses storage path from URL → `storage.remove()` → calls `onChange(slot, null)`.

**Bugs:**
- `handleDelete`: storage `remove()` result not awaited for success check — if storage delete fails, `onChange(slot, null)` still fires, clearing URL in state while file remains in bucket.
- Error message `"Only JPG, PNG or WebP allowed"` but HEIC/HEIF are also in `ALLOWED_TYPES` — misleading error for iOS users.
- Photo URLs stored directly on `Opening` object (not via `op.vals`) — special-case persistence required.
- `capture="environment"` on replace-photo input forces camera — no library-pick option.
- `download` attribute on cross-origin URLs is ignored by browsers — opens in tab instead.

---

### `trim-section.tsx`

**Fields:** Casing (None/Oak/Vinyl/MDF/Custom) · Casing size (2-3/8"/3-3/8") · Jamb extension (None/Oak/Wood/Vinyl/Plywood/Custom) · Depth (4-9/16"/6-9/16"/Custom) · Brickmold · Rosettes (None/Round/45°/Flat) · Extras: Caping, Nail fin (conditional), Drip cap, Self-Adhesive Flashing Membrane.

**Warning strings:** `"Custom price not set in price list"` (amber) · `"Please enter a custom depth"` (red) · `"Nail fin not applicable for retrofit installations"`.

**Bugs:**
- Error color `#DC2626` in this file vs `C.red = '#C0341A'` in design system — two different reds.
- `showNailFin` shows nail fin when `openings` prop absent or empty (`length === 0`) — shows nail fin toggle before any install type is configured.
- `"Self-Adhesive Flashing Membrane"` at 14px in 50%-width grid cell — wraps to 3 lines on 390px screen.
- `casingCustomName` persists in `TrimState` when `casing !== 'custom'` — must be guarded in `trimUtils` display logic.

---

### `diagram.tsx` (MiniDiagram)

**Props:** `typeId: string` · `size?: number` (default 40) · `color?: string` (default `C.blue`).

**Supported types (22 glyphs):** casement, awning, picture, slider, endVent, singleHung, doubleHung, hopper, tiltTurn, bay, bow, combination, special, entry, doubleEntry, french, garden, patio, storm · `default` = generic window frame.

**Bugs:**
- `'interior'` typeId not handled — interior door falls through to default (generic window frame). Visual bug for interior door cards.
- `'transom'` falls to default — shows generic window frame.
- No `aria-hidden="true"` on decorative SVGs.

---

### `primitives.tsx`

**Exports:** `FieldLabel`, `SelectBox`, `DimInput`, `Stepper`, `Toggle`, `Swatches`, `PhotosField` (stub), `NotesField`, `PickerState`, `FieldControl`, `FieldGrid`, `PickerSheet`.

**`FieldGrid` pairing logic:** adjacent `half`-width fields paired into 2-col rows. If `visibleWhen` filtering removes the second of an intended pair, the field after it can incorrectly pair with the first.

**`PickerSheet`:** bottom sheet (z-index 70), renders options from `picker.def.opts`, empty string → `"— Not set —"`, selected option has `C.blueSoft` bg + checkmark.

**Bugs:**
- `Swatches` `palette` parameter received but ignored — `const list = entries` used directly.
- `DimInput` uses `value={value || ''}` — `value=0` renders empty input (silent data loss for zero dimension).
- `FieldControl` for `'color'` kind always uses `palettes?.frame` — ignores `def.palette` field; hardware palettes render with frame swatches.
- `PhotosField` export is a stub never imported anywhere — dead code.
- `FieldGrid` `half`-pairing can mismatch non-adjacent fields when `visibleWhen` removes middle fields.

---

### `icons.tsx`

**`EBIcon` props:** `name: string` · `size?: number` (default 16) · `color?: string` (default `'currentColor'`) · `stroke?: number` (default 1.7).

**Supported names (22):** back, plus, minus, check, chev-r, chev-d, chev-u, copy, trash, edit, camera, note, ruler, paint, glass, tool, gear, door, win, search, x, dup.

**Bugs:**
- Unknown icon names return `null` silently — typo in icon name renders blank with no error.
- `stroke` prop has no effect on icons that hardcode `strokeWidth` internally (back, check, dup) — misleading API.
- `'copy'` icon defined but not used in audited components — likely dead code.
- No `aria-hidden="true"` on any icon SVG.

---

## §42 — PDF Components

### `components/pdf/ContractPDF.tsx`

**Props:** all typed `any` except `customLabels`, `subtypesByType`, PNG arrays.

**Hardcoded strings:** `"INSTALLATION CONTRACT"` · `"Company"` · `"Client"` · `"Scope of Work"` · `"Subtotal"`, `"Discount"`, `"Tax"`, `"Total"` · `"Deposit due upon signing ({pct}%)"` · `"Balance on completion ({100-pct}%)"` · `"Terms & Conditions"` · `"Contractor"` / `"Client"` (signature labels) · Footer `"{companyName} · Installation Contract"`.

**Colors:** `INK #0B1220` · `INK_M #475467` · `INK_S #94A0B4` · `BLUE #2563EB` · `BLUE_D #1D4ED8` · `HAIR #E8EDF3` · discount green `#16a34a`.

**Conditional renders:** logo vs monogram (on `company.logo_url`) · discount row (on `estimate.discount_amount > 0`) · payment band (on `depositPct > 0`) · page 2 (on clauses or signature).

**Bugs:**
- `formatCurrency(estimate.subtotal)` and `formatCurrency(estimate.tax_amount)` — no `|| 0` guard; renders `"CA$NaN"` when fields are null.
- `contract.id.slice(-6)` throws if `contract.id` is null/undefined.
- `formatDate(contract.signed_at || contract.created_at)` — both null → `"Invalid Date"` on document.
- Discount uses `estimate.discount_amount` (pre-computed) while `EstimatePDF` uses `estimate.discount_value` — field mismatch: discount row may never render if wrong field is absent.
- `op.colour !== 'white'` hides white exterior colour — `EstimatePDF` calls `getColourLabel` unconditionally; inconsistency.
- `combo section renders sec.type` raw without label map.

---

### `components/pdf/EstimatePDF.tsx`

**Props:** `estimate`, `openings`, `company` all typed `any`.

**Hardcoded strings:** `"ESTIMATE"` badge · `"Date:"` · `"Valid until:"` · `"Prepared for"` · `"Project site"` · `"Same as above"` · `"Summary"` · `"Total incl. tax:"` · `"Scope of work"` · `"Sections"` · `"Location"` · `"Product"` · `"Glass"` · `"Notes"` · `"Door"` · `"Trim & Finishing"` · `"Pricing"` · `"Subtotal"` · `"Discount"` · `"Tax ({rate}%)"` · `"Total"` · `"Deposit on signing ({pct}%)"` · `"Balance on completion:"` · `"Warranty"` · `"Validity"` · `"Pricing is subject to change after this date."` · Footer: company name, estimate number, city, GST/HST#.

**Bugs:**
- Size row: `\`${op.width_in}" × ${op.height_in}"\`` — no null guard; renders `null" × 36"` when field absent.
- Tax rate `toFixed(0)` — `13.5%` displays as `"14%"`. Should be `toFixed(1)` or trim trailing zero.
- `estimate.estimate_number` has no fallback — renders blank if null.
- `marginLeft: 'auto'` in `@react-pdf/renderer` is unsupported — totals column silently misaligns when no scope notes.
- `"Discount"` row keyed on `!!estimate.discount_value` (vs ContractPDF uses `discount_amount`) — inconsistency.

---

### `components/contract/ContractDocument.tsx`

**Props:** well-typed. `clientSignatureSlot: React.ReactNode` (slot injection) · `downloadHref?` · `bottomPadding?` (default 140).

**Hardcoded strings:** `"Installation Contract"` · `"Company"` · `"Client"` · `"Scope of Work"` · `"Subtotal"`, `"Discount"`, tax, `"Total"` · `"Deposit due upon signing"` · `"Balance on completion"` · `"Page 1 of 2"` / `"Page 2 of 2"` · `"Terms & Conditions"` · `"Contractor"` / `"Client"` · `"Download Contract"`.

**Bugs:**
- `SECTION_TYPE_MAP` (lines 21–24) missing `'Double Hung'` — double-hung combo sections render as fixed/picture diagram.
- Hardcoded `"Page 1 of 2"` / `"Page 2 of 2"` — will mislead if page count changes.
- Contractor signature date shows `createdDate` not `signed_at` — wrong date on web view.
- No `customLabels` prop — ContractDocument and ContractPDF show different opening type labels for companies with custom names.
- `V2_TO_OLD_TYPE_KEY['window_combo']` is undefined — `window_combo` custom label lookup silently falls back to raw type string.

---

## §43 — Shared Components

### `components/Sidebar.tsx`

**Nav items:** Dashboard · Estimates · Appointments · Clients · Reports · Invoices (owner-only) · Settings.

**Labels:** Role badge `"{roleLabel} · Pro Plan"` — **"Pro Plan" hardcoded** for all users.

**Bugs:**
- `'admin'` role not handled — maps to `"Owner"` label; admin users see `"Owner · Pro Plan"`.
- During `loading=true`, all nav items shown (invoices briefly visible to non-owners).
- `ChevronDown` icon used as logout button icon (expanded mode) — communicates dropdown, not sign-out.
- `supabase.auth.getUser()` called without error handling — failed auth leaves name blank, initials `'?'`.
- **Reports visible on desktop but not on mobile** (DrawerNav has Marketing instead).

---

### `components/AppTopBar.tsx`

**Props:** `variant?: 'white'|'dark'` · `backLabel` (default `'Back'`) · `onBack?` · `right?` · `eyebrow?` · `title?` · `children?`.

**Bugs:**
- Burger fires `emitOpenDrawer` even on non-dashboard pages where `DrawerNav` is not mounted — silent no-op.
- No `aria-expanded` on burger button.
- Empty string `title` renders empty heading `<div class="app-topbar__heading"></div>`.

---

### `components/BellButton.tsx`

**Tabs:** All · Estimates · Payments · Team.

**Day groups:** Today · Yesterday · Earlier.

**Colors:** Badge red `#DC2626` inline (vs `C.red = '#C0341A'` — different shade).

**Bugs:**
- `TEAM_TYPES` only contains `'team_activity'` — most team notification types invisible in Team tab.
- `new Date(iso)` for day grouping interprets UTC as UTC — notification created at 1 AM UTC on Wednesday appears in "Tuesday" for UTC-5 users.
- Mobile panel `top: 70` hardcoded — layout gap/overlap if top bar height changes.
- Outside-click handler uses only `mousedown`, not `touchstart` — panel doesn't close on mobile tap-outside when `isMobile=false`.
- No focus trap inside notification panel.

---

### `components/DrawerNav.tsx`

**Nav items:** Home · Schedule · Estimates · Invoices · Clients · Marketing.

**FAB:** New estimate (`/dashboard/estimates/new`) · New appointment · New client. Hidden on contract pages, `/clients/new`, client detail.

**Bugs:**
- **Nav mismatch with Sidebar:** DrawerNav has Marketing, no Reports. Sidebar has Reports, no Marketing. Mobile users cannot access Reports.
- Invoices shown to all roles on mobile — Sidebar restricts Invoices to owner-only on desktop.
- Settings item has no permission check — Sidebar gates Settings via `permKey: 'settings'`.
- `isClientDetail` regex also matches `/dashboard/clients/new` — redundant overlap with `isClientNew`.
- `last_name` can be `null` — `${prof.last_name || ''}` handles it but is fragile.

---

### `components/MobileTopBar.tsx`

**Critical bug:** Fires `window.dispatchEvent(new CustomEvent('open-mobile-sidebar'))` — **this event is never consumed anywhere in the codebase**. `DrawerNav` uses `registerOpenDrawer` (in-memory bus callback), not a window CustomEvent. The hamburger button in `MobileTopBar` does nothing — the drawer never opens. Component may be dead or misdeployed.

---

### `components/AddressAutocomplete.tsx`

**Props:** `value`, `onChange`, `onSelect`, `placeTypes` (default `'address'`), `placeholder`, `error`.

**Bugs:**
- `console.log('[Places] AddressAutocomplete mounted')` — debug log in production.
- No `Escape`/`Tab` key handler to close dropdown — keyboard blur leaves dropdown open.
- Debounce timer not cleared on unmount — `setPredictions`/`setOpen` called on unmounted component.
- `locality` only checked for city — `sublocality_level_1` not checked; Canadian city blank for parts of Toronto/Montreal.
- No loading state during `selectPlace` async fetch — input appears blank while fetching.

---

### `components/ConfirmModal.tsx`

**Props:** `open`, `title`, `body`, `icon?` (default `'trash'`), `confirmLabel?` (default `'Delete'`), `onConfirm`, `onCancel`.

**Colors:** Icon circle `#FEE2E2` · icon stroke `#C0341A` · confirm button `#C0341A`.

**Bugs:**
- No `role="dialog"`, `aria-modal`, `aria-labelledby` — inaccessible to screen readers.
- No focus trap — keyboard users Tab outside modal.
- `icon='alert'` with no `confirmLabel` defaults to `"Delete"` label — semantically wrong.
- No enter/exit animation — abrupt appearance.
- `UserMinusIcon` SVG line extends to `x2=24` outside `viewBox="0 0 24 24"` — clipped.
- Title/body text uses non-`inherit` font family (`-apple-system, "SF Pro Text"`) inconsistent with app's Inter font.

---

### `components/WindowDiagram.tsx`

**Exported color constants:** `GLASS #EEF4FF` · `FRAME #334155` · `SEC #94A3B8` · `DIM #475569` · `MOV #2563EB`.

**Bugs:**
- `sub` prop declared in interface but never read — dead prop.
- V2 type keys (`'casement'`, `'doubleHung'`, `'slider'`, `'combination'`, etc.) not in `diagrams` map — all V2 openings silently show double-hung diagram. The map uses old-style keys (`window_cas`, `window_sl`, etc.).

---

### `components/TimePickerDropdown.tsx`

**Props:** `value`, `date`, `onChange`, `allowNone?`, `noTodayFilter?`, `minAfter?`.

**Slots:** 15-min intervals, `NONE_SLOT` value `''` / label `'—'`.

**Bugs:**
- Dropdown `position: absolute` — can be clipped by `overflow: hidden` parents; no dynamic repositioning.
- No keyboard navigation (no arrow keys, Enter, Escape).
- Unknown `value` not in `ALL_SLOTS` silently shows placeholder without clearing value.
- `noTodayFilter` prop name uses double-negative — semantically confusing API.

---

## §44 — Lib Utilities

### `lib/contractClauses.ts`

**Exports:** `ContractClause`, `DEFAULT_CLAUSES`, `getEffectiveClauses(raw)`.

**Bugs:**
- `warranty_labour` and `storage_fee` both have `order: 10` — sort is non-deterministic for this pair. `condensation` and `window_accessories` both have `order: 14` — same issue.
- `{{PROVINCE}}` placeholder in `dispute_resolution` and `entire_agreement` clause content — substituted by `substituteProvince()` only if caller remembers to call it. No guard here.
- `catch {}` on JSON.parse — malformed DB value silently falls back to defaults; no logging.
- No item-level validation — `raw as ContractClause[]` is an unchecked cast.

---

### `lib/generateEstimateHtml.ts`

**Exports:** `generateEstimateHtml(opts: EstimateHtmlOptions): string`.

**Bugs:**
- All main params (`estimate`, `openings`, `company`) typed `any` — no compile-time safety.
- `estimate.total || 0` — `null || 0 = 0` is safe, but `NaN || 0 = 0` masks pricing errors.
- **Company name rendered twice when logo present (line 247–250)** — `<div class="co-name">` block rendered twice when `company.logo_url` is truthy. Visual duplication bug.
- `openingSvgString(op)` called without null-checking `op.type` — throws if type is null.
- Raw SVG injected via template literal without escaping — `esc()` not called on SVG string.
- Hardcoded `"Powered by ApexScale · useapexscale.com"` in every customer-facing estimate — not configurable.
- `@media print` sets `@page { margin: 0 }` — content may clip on some printers.

---

### `lib/openingLabels.ts`

**Exports:** `getColourLabel`, `getShapeLabel`, `getInteriorColourLabel`, `getSubtypeLabel`, `getGlassLabel`.

**Bugs:**
- `COLOUR_MAP` only has 4 entries (white, black, grey, custom) — standard colours like `commercial_brown`, `forest_green`, `brick_red` fall through to raw key string (e.g. `"commercial_brown"` displayed verbatim).
- `GLASS_MAP` has `lowe` key but `getGlassLabel` checks `op.low_e` boolean, not the map — `lowe` entry is dead code.
- `getGlassLabel` not used in `generateEstimateHtml.ts` — glass chips built manually instead; two diverging implementations.

---

### `lib/openingSvgString.ts`

**Exports:** `OpeningForSvg` type · `openingSvgString(op): string`.

**Bugs:**
- `op.type.toLowerCase()` called without null-check — throws if `op.type` is null; propagates to PDF generation.
- `parseInt(op.window_subtype ?? '3') || 3` — `window_subtype` values like `'3 lite'` happen to work (parseInt stops at space), but values starting with a letter would silently fall back to 3.
- Parameter mutated directly: `if (typeof op === 'string') op = { type: op }` — anti-pattern.
- `'single hung'` check (with space) is fragile — `'singlehung'` (no space) would fail match.
- `sub.includes('transom')` subtype checks — fragile string-includes rather than exact set membership.

---

### `lib/renderDrawingPng.ts`

**Exports:** `renderDrawingPng(op, widthPx, heightPx): Promise<DrawingResult>`.

**Bugs:**
- `op: any` — no null-check before calling `openingSvgString(op)`; null type throws and propagates.
- No `'use server'` directive — `sharp` (native binary) would throw if accidentally imported in client/Edge bundle.
- No try/catch — if `openingSvgString` throws, unhandled rejection propagates to caller.

---

### `lib/usePermissions.ts`

**Exports:** `Permissions`, `OWNER_PERMISSIONS`, `DEFAULT_ESTIMATOR_PERMISSIONS`, `DEFAULT_ADMIN_PERMISSIONS`, `usePermissions()`.

**Initial state:** `role: 'owner'`, `permissions: OWNER_PERMISSIONS` — **full owner access during loading**.

**Bugs:**
- DB query error (`error` field discarded): silently grants full owner permissions to anyone if query fails — network failure = accidental privilege escalation.
- No `.catch()` on `getUser()` — network error leaves `loading: true` forever.
- DB error path: `loading` is set to `false` but role/permissions stay at `'owner'` / `OWNER_PERMISSIONS` — silent escalation.
- `estimator` permissions merge: `{ ...DEFAULT_ESTIMATOR_PERMISSIONS, ...(stored || {}) }` allows any DB key to override including `settings: true` — no whitelist validation.
- TOCTOU: initial `loading=true` state with `OWNER_PERMISSIONS` means any UI not checking `loading` briefly shows owner-level UI to all users.

---

### `lib/useRole.ts`

**Exports:** `AppRole` type · `useRole(): { role: AppRole; loading: boolean }`.

**Bugs:**
- **Missing `'use client'` directive** — uses `useState`/`useEffect` but no directive. Will throw in Server Component context.
- Initial state `'owner'` during loading — same TOCTOU UI privilege escalation as `usePermissions`.
- No `.catch()` on `getUser()` — `loading` stuck `true` on network error.
- `'manager'` role falls through to `'owner'` in `else` branch — undocumented, `AppRole` type includes `'manager'` but hook never sets it.
- Duplicates role derivation logic from `usePermissions` — two sources of truth.

---

### `lib/v2/openingTypes.ts`

**Key exports:** `CATALOG`, `ALL_TYPES`, `getType`, `makeOpening`, `missingRequired`, `V2_TYPE_LABELS`, `V2_TO_OLD_TYPE_KEY`.

**Bugs:**
- `getType(id)` falls back to `ALL_TYPES[0]` for unknown ID — silent wrong result instead of throw/null.
- `makeOpening` calls `crypto.randomUUID()` — throws in Node environments without crypto (pre-Node 19 without polyfill).
- `bay.extraFieldsByValue` key `roofType` not in `bay.fields` — dead conditional logic.
- `bow.extraFieldsByValue` key `roofType` not in `bow.fields` — same issue.
- `hopper` maps to `'window_dh'` in `V2_TO_OLD_TYPE_KEY` — hoppers render as double-hung drawings in old-key contexts.
- `missingRequired` only validates dimension fields — other required fields (e.g. `doorMaterial`) bypass validation.
- `DEFAULTS` has `lowE: null` but `Opening.vals` type is `Record<string, string|number|boolean|undefined>` — null in defaults causes type mismatch.

---

### `lib/v2/svgHelpers.tsx`

**Exports:** `glassColor`, `GlassPatternDefs`, `GlassEffects`, `GridOverlay`, `DoorPanelLines`.

**Bugs:**
- `GridOverlay` `clipPath` id `gd-${uid}` — collides if same `uid` used twice in one SVG document; caller must guarantee uniqueness.
- `GridOverlay` with `w=0` or `h=0`: `step = 0` → `Math.ceil((w+h)/step) = Infinity` → infinite loop.
- `DoorPanelLines` 2-panel and 6-panel: panel height `ph` goes negative for very small dimensions — invalid SVG `height` attribute.

---

### `lib/v2/trimUtils.ts`

**Exports:** `TrimRow`, `trimSummaryLines(row): {label, value}[]`, `hasTrim(row): boolean`.

**Bugs:**
- `trim_caping` — typo of "capping"; label rendered as `'Caping'`; persisted to DB column name — requires migration to fix.
- Jamb depth fallback `'4-9/16"'` hardcoded — if `trim_jamb_extension_depth` is null, renders `'${mat} · 4-9/16"'` — silently invents a measurement.
- `depth === 'Custom'` check is case-sensitive — `'custom'` (lowercase) falls through to hardcoded `'4-9/16"'`.
- `hasTrim` implemented by calling `trimSummaryLines` and checking `length > 0` — builds full array just to check existence; wasteful in rendering loops.

---

### `lib/supabase/admin.ts` + `lib/supabase/service.ts`

**Both are identical service-role client factories** — exact duplicates. No `'use server'` directive on either. `SUPABASE_SERVICE_ROLE_KEY` not prefixed `NEXT_PUBLIC_` — returns `undefined` in browser context (silently creates broken client instead of throwing). No descriptive error on missing env vars. Fix in one may not be applied to the other.

---

### `lib/supabase/client.ts`

**No singleton pattern** — `createClient()` creates a new `BrowserClient` on every call. Multiple concurrent auth sessions per component. Should be memoized. No `'use client'` directive despite being browser-only.

---

### `lib/supabase/server.ts`

Empty `catch {}` in `setAll` cookie handler — token refresh failures invisible, users may have stale sessions indefinitely. No `'use server'` directive despite using `next/headers`.

---

### `lib/provinces.ts`

**Exports:** `PROVINCE_NAMES`, `resolveProvinceName(code)`, `substituteProvince(content, code)`.

**Bugs:**
- `resolveProvinceName` defaults to `'Alberta'` for any unknown/null code — legal clause names wrong province for contractors outside Alberta or with null province.
- `PROVINCE_NAMES` typed as `Record<string, string>` (always-string) but is actually partial — type annotation lies; `??` fallback on L19 works around it.
- Canada-only map — no US states; function name `resolveProvinceName` bakes in Canada-only assumption.

---

### `lib/drawer-bus.ts`

Single-subscriber event bus (`_fn: (() => void) | null`). Second `registerOpenDrawer` call silently overwrites first. Module-level singleton not shared across Next.js server instances or test environments.

---

## §45 — Additional Bugs #44–117

### Auth / Security

44. **`app/api/send-contract` no auth check (critical)** — any caller can send contract emails for any company.

45. **`app/auth/register` — Google OAuth bypasses Terms agreement (medium)** — legal compliance risk.

46. **`app/auth/callback` — both profile upserts silently swallow DB errors (high)** — profile row may never be created.

47. **`app/auth/register` — double profile write race condition (high)** — `register-profile` + `callback` upsert concurrently; can overwrite names with null.

48. **`app/auth/register` — `/api/register-profile` response never checked (high)** — silent failure sends user to onboarding with no profile.

49. **`lib/usePermissions` — DB error grants full owner permissions (critical)** — network failure = accidental privilege escalation for all users.

50. **`lib/useRole` — missing `'use client'` directive (high)** — throws if imported in Server Component.

### Data Integrity

51. **`lib/trimUtils` — `trim_caping` typo persisted to DB column** — requires migration to correct.

52. **`lib/trimUtils` — hardcoded `'4-9/16"'` depth fallback** — silently invents a measurement when null.

53. **`lib/v2/openingTypes` — `bay`/`bow` `extraFieldsByValue` keys not in `fields` array** — dead conditional field logic.

54. **`lib/contractClauses` — duplicate `order` values (10, 10) and (14, 14)** — non-deterministic clause sort.

55. **`lib/openingLabels` — `COLOUR_MAP` incomplete** — unlisted colours render as raw DB key strings.

56. **`components/pdf/ContractPDF` — `discount_amount` vs `discount_value` mismatch with EstimatePDF** — discount row may never render in one of the two PDF types.

57. **`components/pdf/EstimatePDF` — `marginLeft: 'auto'` unsupported in react-pdf** — totals column silently misaligns.

58. **`components/contract/ContractDocument` — `SECTION_TYPE_MAP` missing `'Double Hung'`** — wrong diagram for double-hung combo sections.

59. **`photos-upload` — storage delete result not checked** — URL cleared in state while file remains in bucket.

60. **`app/dashboard/layout` — duplicate profile DB query** — Sidebar and DrawerNav each issue their own profile queries; three round-trips per dashboard page load.

### Silent Failures

61. **`app/estimate/[id]` — permanent loading screen on API failure** — `docStatus` stays `'loading'`, no error message.

62. **`app/page.tsx` — `getSession()` rejection crashes splash** — stuck on splash screen.

63. **`lib/renderDrawingPng` — no try/catch** — `openingSvgString` throw propagates to PDF generation.

64. **`lib/openingSvgString` — `op.type` null-check absent** — throws on null type, crashes PDF.

65. **`lib/generateEstimateHtml` — `openingSvgString` called without null-check** — same crash path.

66. **`lib/supabase/server` — empty `catch {}` in `setAll`** — token refresh failures invisible; stale sessions.

67. **`client-step` — no error state for failed client fetch** — empty list shown silently.

68. **`section-builder` — `handleUnitCount('Custom')` is no-op** — no feedback when selecting Custom from Custom state.

### UI / UX

69. **`app/layout` — `dynamic = 'force-dynamic'` at root** — disables SSG/ISR for entire app including public estimate page.

70. **`app/layout` — `userScalable: false` globally** — WCAG 1.4.4 violation; no pinch-to-zoom anywhere.

71. **`app/page.tsx` — 2200ms hardcoded delay** — ~2s penalty on every app load.

72. **`app/estimate/[id]` — PDF download replaces page** — `window.location.href` replaced by error page if PDF fails.

73. **`app/estimate/[id]` — double Google Font load** — redundant network request per public estimate view.

74. **`components/MobileTopBar` — hamburger fires unlistened CustomEvent** — drawer never opens from this component.

75. **`components/Sidebar` — `"Pro Plan"` hardcoded** — wrong for free-tier or other plan users.

76. **`components/Sidebar` vs `DrawerNav` nav mismatch** — Reports visible only on desktop; Marketing only on mobile.

77. **`components/DrawerNav` — Invoices shown to all roles on mobile** — desktop restricts to owner-only.

78. **`components/DrawerNav` — Settings has no permission check** — Sidebar gates it; mobile does not.

79. **`components/AddressAutocomplete` — `console.log` debug in production**.

80. **`components/AddressAutocomplete` — Canadian city blank for Toronto/Montreal sublocality**.

81. **`components/AddressAutocomplete` — no unmount timer cleanup** → state update on unmounted component.

82. **`components/ConfirmModal` — no `role="dialog"` / `aria-modal` / focus trap** — inaccessible.

83. **`components/WindowDiagram` — V2 type keys not in `diagrams` map** — all V2 openings show double-hung diagram.

84. **`components/BellButton` — `TEAM_TYPES` only `'team_activity'`** — most team notifications invisible in Team tab.

85. **`opening-editor` — `resolveFrameColor` dead code** — defined but never called.

86. **`opening-editor` — `openSecs` state stale on opening swap** — expanded sections don't reset when parent reuses component.

87. **`opening-row` — `extraFieldsByValue` fields never shown as chips** — bay/bow extras invisible.

88. **`review-step` — `initialDiscountType/Value` not synced on re-render** — saved draft values ignored.

89. **`review-step` — misaligned `prices`/`openings` arrays** → `CA$NaN` rendered.

90. **`builder-header` — `"New estimate"` title hardcoded** — wrong in edit flow.

91. **`diagram.tsx` — `'interior'` type falls through to generic window frame** — interior door shows wrong icon.

92. **`primitives` — `DimInput` `value={value || ''}` drops `value=0`** — silent data loss.

93. **`primitives` — `FieldControl` always uses `palettes?.frame`** — hardware colour swatches render with frame palette.

94. **`primitives` — `PhotosField` export is dead code** — stub never imported.

95. **`photos-upload` — error message excludes HEIC/HEIF** — misleading for iOS users.

96. **`photos-upload` — `capture="environment"` prevents library pick** — always opens camera.

97. **`trim-section` — error color `#DC2626` vs design system `C.red = '#C0341A'`** — inconsistent red.

98. **`icons` — unknown icon name returns `null` silently** — typo renders blank with no error.

99. **`section-builder` — `eqW` cumulative rounding drift** — 73"÷3 = 72" total (1" lost).

100. **`lib/v2/svgHelpers` — `GridOverlay` zero-dimension infinite loop** — crash if `w=0` or `h=0`.

101. **`lib/v2/openingTypes` — `hopper` maps to `'window_dh'`** — hoppers show double-hung drawing in old-key contexts.

102. **`lib/provinces` — unknown province defaults to `'Alberta'`** — wrong jurisdiction in legal clauses.

103. **`lib/supabase/admin` and `service` are identical duplicates** — maintenance hazard; fix to one not applied to the other.

104. **`lib/supabase/client` — no singleton** — new Supabase client on every call/render.

105. **`lib/contractClauses` — `{{PROVINCE}}` placeholder not substituted if caller forgets `substituteProvince()`** — raw token appears in contract.

106. **`app/auth/callback` — token_hash path overwrites existing profile names** — re-confirmation email can reset user's edited name.

107. **`app/auth/login` — `loading` not reset on successful navigation** — button frozen if navigation stalls.

108. **`app/auth/register` — `loading` not reset on successful navigation** — same pattern.

109. **`app/dashboard/layout` — `profiles.single()` instead of `.maybeSingle()`** — throws PGRST116 on 0 rows.

110. **`app/dashboard/layout` — `profiles` DB error redirects to `/onboarding` instead of showing error** — infrastructure failures masked.

111. **`components/pdf/ContractPDF` — `formatCurrency(null)` → `"CA$NaN"`** — no `|| 0` guard on subtotal/tax.

112. **`components/pdf/ContractPDF` — `contract.id.slice(-6)` crashes if `id` is null**.

113. **`components/pdf/ContractPDF` — `formatDate(undefined)` → `"Invalid Date"` on signed document**.

114. **`app/auth/page.tsx` — `#2045B8` vs `#2563EB` brand color inconsistency** — splash uses different blue than all other pages.

115. **`components/contract/ContractDocument` — `"Page 1 of 2"` hardcoded** — misleads if layout changes.

116. **`components/Sidebar` — `ChevronDown` icon used for logout** — wrong icon semantics.

117. **`generateEstimateHtml` — company name rendered twice when logo present** — `<div class="co-name">` duplicated.

---

*End of audit — 2026-07-16 (complete, 117 bugs, 45 sections)*
