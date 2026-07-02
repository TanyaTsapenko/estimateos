# Platform Snapshot — Audit Round 2

> Generated 2026-07-02. READ-ONLY audit of all platform pages except estimate builder, contract/PDF pipeline, and pricing (covered in AUDIT_SNAPSHOT.md).
>
> Schema per section: **A** Purpose · **B** Data · **C** UI structure · **D** User actions · **E** States · **F** Mobile · **G** Code problems

---

## 1. Dashboard (`app/dashboard/page.tsx`, 1572 lines)

**A. Purpose**
Central operations hub: today's appointment schedule, four KPI cards, "Needs Attention" action list, and a "Live Feed" deal-thread activity stream.

**B. Data sources**
| Source | Query |
|--------|-------|
| `appointments` | by `userIds[]` (team-scoped via `getTeamUserIds()`), date = today |
| `activity_log` | last 50 rows for userIds[], ordered by created_at desc |
| `estimates` | for KPIs: signed/paid/sent this month |
| `invoices` | pending deposits and final invoices for "Needs Attention" |
| `profiles` | company name, reminder settings (`quote_settings.reminders`), checklist fields (logo_url, contract_terms, hasPriceList) |
| `notifications` | via `useNotifications()` hook → real-time Supabase channel |
| `team_members` | via `getTeamUserIds()` for rep name lookup |

**C. UI structure**
- Desktop header: company name + today's date + BellButton + "New estimate" button
- Hero gradient card (dark blue, `#1a4fd6 → #1535a0`):
  - Label "TEAM DAY · {date}" or "YOUR DAY · {date}"
  - Rep filter pills (visible when `isTeamView`)
  - Next appointment card OR onboarding checklist OR empty state OR "all done" OR "needs follow-up" banner
  - Secondary appointment list
  - Action buttons ("X ready to invoice", "Open schedule")
- KPI row (horizontal scroll): Revenue / In Pipeline / Signed Today / Conversion — each is a `KpiCard` with sparkline, delta, accent colour
- Body (two-column on desktop, stacked on mobile):
  - **Needs Attention** panel: sorted list of action items (priority 0–4), max 7 visible, expandable
  - **Live Feed**: "Recent activity" feed, filter chips (All/Payments/Estimates), deal cards grouped by entity via `groupActivity()`, each card expandable to event timeline

**D. User actions**
- Mark invoice as paid (`handleMarkPaid`) → updates invoice + estimate status → inserts notification (5-min dedup) → logs activity → sends receipt email
- Send reminder (`handleSendReminder`) → DB update first → email → auto-expire on 3rd reminder → notify team owner
- Navigate to estimates/appointments/invoice create
- Filter activity feed (All/Payments/Estimates)
- Filter appointments by rep (team view)
- Dismiss onboarding checklist (localStorage `checklist_dismissed`)
- Open/close deal card in Live Feed

**E. States & edge cases**
- No appointments today → shows onboarding checklist (if owner, checklist not dismissed, <4 items done) OR "No visits today" empty state
- `nextAppt`: first appointment that hasn't ended yet
- `allDone`: all appointments past end time → "All visits complete!" banner
- Needs follow-up: appointments past end time but not marked done → amber banner with count
- Attention items gated by `permissions.payments`
- `isTeamView` = `isOwnerOrManager && Object.keys(repNames).length > 1`
- `repFilter` state = 'all' or userId — filters both appointment list and activity feed

**F. Mobile specifics**
- Mobile hero occupies full width with gradient, `AppTopBar` in dark variant
- "TEAM DAY" / "YOUR DAY" label in hero (line 836)
- Next appointment: 38px time + address + call/SMS buttons
- Checklist shown in hero area instead of appointment card when no visits
- Attention section shown in mobile body (below KPI row)
- Body padding-bottom: `calc(88px + env(safe-area-inset-bottom))`

**G. Code problems**
- `setOpenDealIdx(0)` on filter change always opens first deal — should reset to -1
- `attention.slice(0, showAllAttention ? attention.length : 7)` — visible count still passed as `visible` inside map but uses wrong reference when expanded (re-declares `visible` inside same scope)
- Attention items hidden from users without `permissions.payments` but the KPI cards that navigate to paid/signed estimates are always visible — inconsistency
- `repNames` map built at load time, not reactive — rep name not shown for new team members added mid-session

---

## 2. Appointments (`app/dashboard/appointments/page.tsx`, 1279 lines)

**A. Purpose**
Schedule management: mobile shows a day-by-day timeline; desktop shows a searchable 2-panel list.

**B. Data sources**
- Initial load: all appointments `.eq('user_id', sanitizedId)` ordered by date/time, limit 50 — **NOT team-scoped**
- Day load (on tab change): appointments for selected date + estimate totals joined
- Month dots: appointment_date count for calendar month
- Day counts: count queries for yesterday/today/tomorrow (parallel)

**C. UI structure**

*Mobile:*
- AppTopBar with eyebrow/title and "+ New" button
- Day filter: Yesterday / Today / Tomorrow pill tabs + mini-calendar button (popup with month nav, date dots)
- Timeline: sorted list with NOW marker (a time-of-day line), each item shows time + name + address
- Expanded row: Call / Map / Edit buttons + phone + notes + "Create estimate" or "View estimate"
- `EditScreen`: full-screen slide-up component with client info + date/time fields + delete button

*Desktop:*
- Header: title + search input + notifications bell icon (wired to bell action stub) + "New appointment" button
- Filter bar: All / Upcoming / Done with counts
- Left panel (420px): grouped list (Today / Future / Past) via `buildGroups()`, `DesktopListRow`
- Right panel: `DesktopViewPanel` (details + call/map/estimate links) or `DesktopEditPanel` (edit form)

**D. User actions**
- Switch day (tabs / calendar)
- View appointment (expand or select in desktop list)
- Call / SMS / Open Apple Maps
- Edit appointment (`saveEdit` / `desktopSaveEdit`)
- Delete appointment (`deleteAppt` / `desktopDeleteAppt`)
- Create estimate from appointment → sets appointment status = 'completed' → navigates to `/estimates/new?appointment_id=...`
- View linked estimate

**E. States**
- `dayLoading`: spinner while fetching selected day's appointments
- `expandedId`: which mobile timeline row is expanded
- `selectedId` / `desktopEditing`: desktop panel state
- `calendarOpen`: mini-calendar popup
- `toast`: "Saved" / "Deleted" flash
- Needs follow-up: end time passed, status still 'upcoming' (shown in header and hero)

**F. Mobile specifics**
- `EditScreen` uses `position: fixed; transform: translateY` slide animation
- EditScreen header padding: `env(safe-area-inset-top)`
- Editable fields on mobile: all client fields EXCEPT no AddressAutocomplete (just plain input)

**G. Code problems**
- **Not team-scoped**: queries `.eq('user_id', sanitizedId)` — team members cannot see each other's appointments here (they can on dashboard). No `getTeamUserIds()` call.
- Initial load fetches all appointments without date filter (limit 50) — could miss appointments if busy contractor has >50 total
- `assigned_to` stored as text name string, not UUID — dashboard shows rep names correctly but edit page uses member ID for the `<select>` value then saves the name → inconsistent
- Desktop notifications bell button (line 1004-1006) is rendered but does nothing — dead SVG without onClick

---

## 3. Appointments / New (`app/dashboard/appointments/new/page.tsx`)

**A. Purpose**
Create a new appointment. Simultaneously find-or-create a `clients` record.

**B. Data**
- Reads: `profiles` (owner name + team members for "Assigned to" dropdown)
- Writes: `clients` (find-or-create by phone/email) → `appointments`
- Client ownership: resolves `team_owner_id` so all team members share the same client pool

**C. Form fields**
Client name* | Phone | Email | Lead source (Phone call/Website/Referral/Google/Kijiji/Other) | Address (AddressAutocomplete) | City | Province | Postal Code | Date | Time | End time (optional) | Notes | Assigned to | Status

**D. User actions**
- Save → validates → find-or-create client → insert appointment → navigate
- After save: if `prefill_client_id` → `/dashboard/clients/{id}`, else `/dashboard/appointments`

**E. States**
- `errors`: per-field validation (`lib/clientValidation.ts`)
- `saving` flag
- Error banner for global errors
- "Only you on the team" disabled input for Assigned to when no team members

**F. Mobile specifics**
- Uses global `.card` + `.btn-next` CSS classes (not inline styles like most other pages)
- Sticky bottom save button not implemented — button is inline at end of form

**G. Code problems**
- **17 `console.log` calls** left in `save()` — production debug logging
- `appointment_date` min is today (prevents booking past appointments)
- Lead sources array differs from the page.tsx version: `['Phone call', 'Website', 'Referral', 'Google', 'Kijiji', 'Other']` vs appointments page `['Phone call', 'Referral', 'Web form', 'Walk-in', 'Repeat client']` — inconsistent options

---

## 4. Appointments / Edit (`app/dashboard/appointments/[id]/edit/page.tsx`)

**A. Purpose**
Edit an existing appointment (standalone page, used by client detail page "Next visit" tap).

**B. Data**
- Loads: `appointments.*` + profile name + team members
- Writes: `appointments.update(...)` — includes `appointment_end_time` and `notes` (not updated by mobile EditScreen in appointments list)

**C. Form fields**
Same as New except: no AddressAutocomplete (plain `<input>` for address), has Status dropdown, and Province is a plain `<select>` from `TAX_RATES` keys.

**D. User actions**
- Save → validate → update → back
- Delete (ConfirmModal) → delete → `/dashboard/appointments`

**E. States**
- `loading` flag while fetching
- `deleteOpen` ConfirmModal
- `saving` flag

**G. Code problems**
- Address field is plain input with no autocomplete (regression vs new page which has AddressAutocomplete)
- After successful save, routes to `/dashboard/appointments` even if accessed from client detail page — no referrer tracking

---

## 5. Clients List (`app/dashboard/clients/page.tsx`)

**A. Purpose**
List of all clients with search and estimate summary stats.

**B. Data**
- `clients` — team-scoped with custom role logic (not via `getTeamUserIds()`):
  - `owner`: `owner_id = uid`
  - `member_role = 'manager'`: OR filter with `teamOwnerId`
  - else: own clients
- `estimates` — joined by `client_id`, `limit(20)` — may miss older estimates

**C. UI structure**
- Search input (client-side, name or phone only)
- Client cards: name, phone, estimate count + total
- Empty state: "Clients are added automatically when you create appointments"

**D. User actions**
- Tap client → `/dashboard/clients/{id}`
- Search (client-side)

**G. Code problems**
- Estimate stats `limit(20)` — contractors with >20 estimates per client will see wrong numbers
- No "Add client" button on list (clients created implicitly via appointments)
- Search only searches name and phone, not email or address

---

## 6. Client Detail (`app/dashboard/clients/[id]/page.tsx`, 758 lines)

**A. Purpose**
Full client profile: identity, communication, notes, and complete project history.

**B. Data (3-phase load)**
1. Client row + all client appointments
2. Estimates via `appointment_id` FK (NOT client_id — comment at line 278: "estimates.client_id is not reliably set")
3. Contracts + invoices for each estimate

**C. UI structure**
- AppTopBar (dark) with back "Clients" + "···" overflow menu (Edit client / Delete client)
- Hero: avatar initials, name, "REPEAT CUSTOMER" star badge, address
- Stats strip: Visits / Lifetime / Win rate (%)
- Call / Email / Text quick-action buttons
- Next visit card (links to `/dashboard/appointments/{id}/edit`)
- Details card: phone / email / address rows (each is a link)
- Notes card (amber background, editable inline with onBlur save)
- Project history: `ProjectCard` components per appointment, ordered newest first
- Sticky CTA: "New Appointment" button

**D. User actions**
- Call / email / text / maps
- Edit client (bottom sheet modal with 7 fields)
- Delete client (ConfirmModal)
- Edit notes (inline textarea, saves on blur)
- View estimate / Create estimate from project card
- Schedule new appointment (sticky CTA → prefilled with client data)

**E. States**
- `loading` (3-phase)
- `editOpen` / `deleteOpen` modals
- `editingNotes` / `notesSaving` / `notesSaved` (brief green checkmark)
- `menuOpen` overflow menu
- `isRepeat`: >1 signed project → shows star badge
- `winRate`: null if no estimates → shows "—"
- `nextVisit`: next upcoming appointment

**F. Mobile specifics**
- Sticky CTA bottom: `position: fixed; bottom: calc(64px + env(safe-area-inset-bottom))`
- Edit modal is bottom sheet: `borderRadius: '20px 20px 0 0'`

**G. Code problems**
- Estimates loaded via `appointment_id` — estimates created without linking to an appointment won't appear in project history (confirmed limitation, documented in code comment)
- `lifetime` value = sum of signed estimates only (ignores paid status) — may overstate for refunded jobs
- `deleteClient` does not cascade-delete appointments — orphan appointments remain

---

## 7. Clients / New (`app/dashboard/clients/new/page.tsx`)

**A. Purpose**
Create a client directly (not via appointment flow).

**B. Data**
Resolves team `owner_id` → inserts into `clients` table → navigates to client detail.

**C. Form fields**
Full name* | Phone* | Email | Street address (AddressAutocomplete) | City | Province | Postal code | Notes

**D. User actions**
Save → validate → insert → `/dashboard/clients/{id}`

**G. Code problems**
- Phone is **required** here (`'Phone is required'`) but optional on new appointment page — inconsistent
- No duplicate detection before insert (by phone or email) unlike new appointment flow which finds existing client

---

## 8. Invoices (`app/dashboard/invoices/page.tsx`)

**A. Purpose**
Invoice list for the signed-in user (owner only).

**B. Data**
- `invoices` — `.eq('user_id', sanitizedId)` — NOT team-scoped
- Role guard: non-owner → redirect to `/dashboard`

**C. UI structure**
- Header with count
- Invoice rows: estimate number, client name, type (deposit/final), amount, status badge
- `displayStatus()`: 'pending' + past due_date → 'overdue'
- PDF button: `window.open('/api/invoice-pdf?id=...', '_blank')`
- "Mark Paid" button

**D. User actions**
- Mark invoice paid → update invoice + (if final) estimate.status='paid' + notification + activity log + receipt email
- Download invoice PDF (new tab)

**G. Code problems**
- Not team-scoped — managers cannot see team invoices here even if they can see team estimates on dashboard
- No search, filter, or pagination
- `window.open` for PDF is blocked by some mobile browsers (iOS Safari)

---

## 9. Reports (`app/dashboard/reports/page.tsx`)

**A. Purpose**
Revenue and pipeline metrics computed entirely client-side.

**B. Data**
- `estimates` only — `status, total, client_province, created_at`
- Role guard: non-owner → redirect to `/dashboard`
- Period filter: 30d / 90d / ytd / all (client-side date filtering)

**C. Metrics (all client-side)**
- Revenue = sum of `total` where `status IN ('signed','paid')` and in period
- Pipeline = sum of `total` where `status = 'sent'`
- Win rate = signed.length / filtered.length × 100
- Avg per job = revenue / signed.length
- Funnel: Created / Sent / Signed / Declined horizontal bars

**D. User actions**
- Switch period filter

**G. Code problems**
- `client_province` column is queried but NEVER used in any displayed metric (likely intended for geographic breakdown)
- Not team-scoped — owner sees only own estimates
- No comparison period (e.g., vs last month) — delta not implemented
- Win rate denominator includes expired/draft — may be misleadingly low

---

## 10. Marketing (`app/dashboard/marketing/page.tsx`)

**A. Purpose**
PURE STUB — placeholder page only.

**C. UI structure**
Megaphone icon + "Coming soon" title + description text. No data fetching, no state, no user interactions.

---

## 11. Settings (`app/dashboard/settings/page.tsx`, 1917 lines)

**A. Purpose**
All business and account configuration in a single monolithic file with 11 sections.

**B. Layout**
- Desktop: persistent sub-sidebar (264px) + content pane; uses Supabase for company name and team count in sub-sidebar
- Mobile: section list → push to detail view (`mobileDetail` state)
- URL: `?section=<id>` query param synced on desktop nav

**C. Sections**

### Profile
Fields: first name, last name, email (read-only, hint "contact support"), phone, avatar (upload to `avatars` Supabase bucket, max 5MB). SaveBar with Discard/Save.

### Password
Fields: current, new (min 8 chars), confirm. Validates current via `signInWithPassword` before updating. "Sign out all devices" → `supabase.auth.signOut({ scope: 'global' })` (ConfirmModal).

### Notifications
Email toggles (7 events) + digest selector (off/weekly/daily) + in-app toggles (5 events). Saved to `profiles.notification_settings` as JSON.
Event types: estimateViewed / estimateSigned / estimateDeclined / estimateExpired / depositPaid / invoiceOverdue / teamInvite

### Company
20+ fields: company name*, phone, website, address (AddressAutocomplete), city*, province, postal, licence # + issuing province + expiry, insurance provider + policy # + expiry, WSIB/WCB, GST/HST number, company contact email, financing info, Google review link, Interac email, signing rep name/title, warranty summary.
Logo upload to `logos` Supabase bucket (PNG/JPG/SVG/WebP, max 5MB).

### Team
Stats chips (Members / Pending invites / Seats used). Owner row always first. Member rows (clickable → bottom-sheet editor). Invite form (email + role + 7 permission toggles). Sends invite via `POST /api/team-invite`.
Roles: estimator (Sales) / manager / admin (Office Admin) / owner.
Permissions: estimates / schedule / clients / price_list / reports / payments / settings.

### Contract
Warranty period (1/2/5/10 years + custom text), deposit toggle + percent (0-100) + timing (upon signing / upon delivery), project manager (text), completion timeframe (text), payment methods (checkboxes: Cash/E-Transfer/Cheque/Financing), contract clauses (drag-to-reorder, enable/disable, add custom, Required-by-law badge for fixed clauses), contractor signature (canvas draw → upload to `signatures` bucket → `profiles.signature_url`).

### Billing
**COMPLETELY HARDCODED** — shows "Pro Plan · CA$149/mo · Renews Jun 1, 2026", "•••• •••• •••• 4242", usage stats (12 estimates, 2/5 seats, 0.4 GB). Buttons ("Change plan", "Update", "Cancel plan") have no onClick handler. Zero Stripe/payment integration.

### Invoices
Shows only "No invoices yet." — stub.

### Price List
Redirects to `/dashboard/price-list` via `useEffect`.

### Quote / Reminders
Navigate to separate routes (see sections 12 & 13).

**D. Role guards**
- `estimator` → only Profile + Password
- `admin` → no billing/invoices/notifications
- `non-owner` → no Team section
- `!permissions.settings` → no Company/Quote/Contract
- `!permissions.price_list` → no Price List
- Estimator sees blue info banner: "Contact your account owner to change company settings"

**G. Code problems**
- Billing section is 100% hardcoded — no live data, no Stripe wiring, buttons do nothing
- Invoices section stub (just "No invoices yet.")
- `SECTIONS` map maps `quote: () => <></>` and `reminders: () => <></>` (empty fragments) — rendered content is wrong if those sections are navigated to directly via URL (desktop skips redirect to separate routes)
- Settings page 1917 lines in a single file — all sections defined as local functions; tree-shaking has no effect
- `handleNavClick` has special-case for 'quote' and 'reminders' — this means on desktop, those items don't render inline but navigate away, breaking the desktop layout pattern

---

## 12. Settings / Quote (`app/dashboard/settings/quote/page.tsx`)

**A. Purpose**
Configure default estimate validity duration.

**B. Data**
`profiles.default_valid_days` (int). Options: 15 / 30 / 45 / 60 days.

**D. User actions**
Select validity + Save/Discard.

**G. Code problems**
- Only 4 options hardcoded — no custom entry
- `estimator` role gate shows "Access restricted" full-page block

---

## 13. Settings / Reminders (`app/dashboard/settings/reminders/page.tsx`)

**A. Purpose**
Configure automated follow-up reminder behaviour and email templates.

**B. Data**
`profiles.quote_settings.reminders` JSON (merged with existing `quote_settings` on save to avoid overwriting other keys).

**C. Fields**
- Auto reminders toggle
- Max reminders: 1 / 2 / 3
- First reminder after: 1 / 2 / 3 / 5 / 7 days
- Second reminder after: same options
- Template 1 + Template 2 (tabbed textarea)
- Variables: `{client_name}`, `{address}`, `{amount}`, `{expiry_date}`, `{estimate_number}`

**G. Code problems**
- `estimator` role gate shows "Access restricted"
- No template preview — user must know variable syntax; no validation that variables are recognized
- `second_after_days` is always shown even when `max_count = 1` — should be hidden when only 1 reminder

---

## 14. Notifications System

### `hooks/useNotifications.ts`
- Loads last 30 notifications from `notifications` table ordered `created_at DESC`
- Real-time INSERT subscription via Supabase channel (`notifs-hook`)
- `markOneRead(id)` → updates `read=true` + **removes from local list** (not just marks read)
- `markAllRead()` → updates all unread + filters out read items from local list
- `clearAll()` → deletes all for user from DB

### `components/BellButton.tsx`
- Bell icon with red badge (max "9+")
- Panel (fixed on mobile, absolute on desktop), max height 480px
- 4 filter tabs: All / Estimates / Payments / Team
- Grouped by day: Today / Yesterday / Earlier
- Each notification row: unread dot (blue) + title + body (truncated) + relative time + X dismiss button
- Click navigates to `n.link` (if set) and marks read
- "Mark all read" + "Clear all" actions

**Notification types by tab:**
- Estimates: estimate_viewed, estimate_signed, estimate_expired, estimate_declined
- Payments: deposit_paid, final_paid
- Team: team_activity

**G. Code problems**
- `markOneRead` removes item from list entirely (not just marking dot as read) — notifications disappear on first click
- Channel name `'notifs-hook'` is hardcoded — if two instances of `useNotifications` mount (unlikely but possible with SSR re-renders), the channel subscription may conflict
- `createClient()` called again in cleanup `return () => { createClient().channel('notifs-hook').unsubscribe() }` — creates a second client instance just to unsubscribe

---

## 15. Onboarding

### `app/onboarding/page.tsx` (2-step wizard)
**A. Purpose**
First-time setup after registration: collect company name, phone, province, and trade specialty.

**B. Data**
Writes to `profiles` via `.upsert({...onboarding_done: true})`.
Sends welcome email via `POST /api/send-email` (fire-and-forget, errors swallowed).

**C. UI**
- Step indicator (2 dots, active dot wider)
- Step 1: Company name* + Phone (optional, 10-digit validated) + Province*
- Step 2: Trade grid (2-column, 6 niches: Windows & Doors / Roofing / Siding / Flooring / HVAC / Other)
- Back/Continue buttons

**D. After finish**
Routes to `/onboarding/welcome`.

**G. Code problems**
- `profiles.upsert` with only minimal fields — all the rich company fields from Settings/Company are not collected here; contractor must go to Settings separately

---

### `app/onboarding/welcome/page.tsx`
Static post-onboarding screen listing 4 setup tasks (Company/Team/Contract/Price list) with icons. "Go to dashboard" button. No state, no actions beyond navigation.

---

## 16. Navigation

### `components/DrawerNav.tsx`
**Purpose**: Mobile-only navigation shell (portal to `document.body`).

**Structure:**
- **FAB** (floating action button, `+` icon, blue, 60×60, bottom-right): spins 45° when open
- **FAB speed dial** (3 items, slide-up): New estimate / New appointment / New client
- **FAB scrim**: semi-transparent blur overlay on FAB open
- **Drawer** (296px slide-in from left): gradient profile header + nav items + sign out
- **Drawer scrim**: dark overlay (closes on click)

**Drawer nav items (MENU array):**
Home / Schedule / Estimates / Invoices / Clients / Marketing + divider + Settings + Sign out

**Bus integration:**
- `registerOpenDrawer()` → called on mount, allows AppTopBar burger to trigger drawer open
- `Escape` key closes drawer or FAB

**Profile header:**
- Loads `profiles.first_name, last_name, company_name` on mount
- Gradient: `linear-gradient(165deg, #2F6BF3, #1E45C9, #1A3BB0)`
- Shows initial, name, company name

**G. Code problems:**
- `'Marketing'` nav item leads to the pure stub coming-soon page — users navigating there find nothing
- Drawer always loads profile on mount (even before opening) — minor unnecessary request

---

### `components/AppTopBar.tsx` (61 lines)
Minimal shared header component with two variants ('white' / 'dark'). Renders:
- Burger → `emitOpenDrawer` (via `lib/drawer-bus`)
- Optional back button with ChevronLeft
- Title area: eyebrow + heading OR `children`
- Optional right slot

Styles via CSS classes (`app-topbar`, `app-topbar--dark`, etc.). Hidden on desktop via CSS.

---

## 17. Auth Pages

### `app/auth/page.tsx` — Splash / Landing
Dark hero with value proposition: "Close jobs before you leave the driveway." · "🇨🇦 For Canadian Contractors". Feature list (3 bullet points). CTA buttons: "Get Started — Free Trial →" → `/auth/register`, "Sign In →" → `/auth/login`. Note: "14-day free trial · No credit card needed" (not enforced anywhere in code).

### `app/auth/login/page.tsx`
Email + password. Google OAuth (`signInWithOAuth`, redirectTo `/auth/callback`). "Forgot password?" → `/auth/forgot-password`. After login → `/dashboard`. Email format validated on blur and on submit. No "remember me" option.

### Other auth pages (not read — inferred from routing)
| Route | Purpose |
|-------|---------|
| `/auth/register` | Email/password + Google registration |
| `/auth/forgot-password` | Send password reset email |
| `/auth/reset-password` | Set new password via reset token |
| `/auth/check-email` | "Check your inbox" confirmation screen |
| `/auth/confirm` | Email confirmation landing (Supabase redirect) |
| `/auth/confirmed` | Post-confirmation success screen |
| `/auth/callback` | Supabase OAuth callback (Google) |

**G. Code problems:**
- "14-day free trial · No credit card needed" on splash page is not enforced — no trial period logic exists in codebase
- Google OAuth redirect hardcoded to `window.location.origin + '/auth/callback'` — safe for any deployment but requires the `auth/callback` route to exist

---

## 18. PDF Viewer (`app/dashboard/pdf-viewer/page.tsx`)

**A. Purpose**
In-app PDF viewer shell wrapping an `<iframe>` for estimates and invoices.

**B. Data**
Takes `?url=` and `?label=` query params. No data fetching.

**C. UI**
- AppTopBar (dark variant): back button + "Save" (`<a href={url} download>`) button
- `<iframe src={url} flex: 1>`
- Background: `#1a1a1a`
- Height: `calc(100dvh - env(safe-area-inset-top) - 52px)`

**D. User actions**
- Back (router.back)
- Save / Download PDF

**G. Code problems**
- Accepts arbitrary URL from query string — no origin validation (open redirect risk for the download link, though the iframe itself is sandboxed by browser)
- No `sandbox` attribute on iframe
- iOS Safari does not render PDFs in iframes (blank frame) — `window.open` fallback not implemented here
- `label` param accepted but only used for `title` attribute on iframe — not shown in UI

---

## Cross-Cutting Issues

### Team scope gaps
| Page | Scoping |
|------|---------|
| Dashboard | ✅ Team-scoped via `getTeamUserIds()` |
| Appointments | ❌ Own only (`user_id = uid`) |
| Invoices | ❌ Own only |
| Reports | ❌ Own only |
| Clients | ⚠️ Custom role logic (not via teamScope.ts) |
| Client detail | ✅ Loads client by ID regardless of owner |

### Role guard consistency
- Dashboard's "Needs Attention" gated by `permissions.payments`
- Invoices page gated by `role === 'owner'` → redirect (not permission-based)
- Reports gated by `role === 'owner'` → redirect
- Settings sections gated by role + permissions

### No pagination anywhere
All lists have hardcoded limits (appointments: 50, activity: 50, notifications: 30, clients estimate stats: 20). No infinite scroll or "load more" for primary list pages.

### No offline / error handling
All pages assume successful Supabase responses. No `.catch()` handlers for critical queries. Errors typically silently produce empty arrays.

### Console.log in production
Found in: `app/dashboard/appointments/new/page.tsx` (17 calls in `save()`), likely others.

### Mobile-only navigation (DrawerNav)
Desktop has no left sidebar — desktop pages (appointments, settings) implement their own left panels. There is no shared desktop nav component: each page independently handles its header.
