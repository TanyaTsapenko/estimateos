# ApexScale — Audit Snapshot
Generated: 2026-07-02. Read-only factual snapshot for external product audit.

---

## 1. Repo Overview

### Directory Tree (3 levels, excluding node_modules / .next / .git)

```
.
├── app/
│   ├── api/
│   │   ├── contract-pdf/          route.ts
│   │   ├── contract-pdf-gen/      route.ts
│   │   ├── create-deposit/        route.ts
│   │   ├── deposit-invoice/       route.ts
│   │   ├── estimate-pdf/          route.ts
│   │   ├── estimate-pdf-html/     route.ts
│   │   ├── expire-estimates/      route.ts
│   │   ├── invoice-pdf/           route.ts
│   │   ├── log-activity/          route.ts
│   │   ├── notify-contractor-signed/ route.ts
│   │   ├── pdf/                   route.ts
│   │   ├── places/                route.ts
│   │   ├── public/
│   │   │   ├── contract/[id]/     route.ts
│   │   │   └── estimate/[id]/     route.ts
│   │   ├── register/              (directory exists, no route.ts found)
│   │   ├── register-profile/      route.ts
│   │   ├── resend-webhook/        route.ts
│   │   ├── send-confirmation/     (directory exists)
│   │   ├── send-contract/         route.ts
│   │   ├── send-contract-signed/  route.ts
│   │   ├── send-email/            route.ts  (647 lines)
│   │   ├── send-invoice/          route.ts
│   │   ├── sign-contract/         route.ts
│   │   ├── team-invite/           route.ts
│   │   ├── team-join/             route.ts
│   │   ├── team-members/[id]/     route.ts
│   │   └── track-estimate-view/   route.ts
│   ├── auth/
│   │   ├── callback/              route.ts
│   │   ├── check-email/           page.tsx
│   │   ├── confirm/               page.tsx
│   │   ├── confirmed/             page.tsx
│   │   ├── forgot-password/       page.tsx
│   │   ├── login/                 page.tsx
│   │   ├── register/              page.tsx
│   │   └── reset-password/        page.tsx
│   ├── dashboard/
│   │   ├── appointments/[id]/edit/ page.tsx
│   │   ├── appointments/new/       page.tsx
│   │   ├── appointments/           page.tsx (1279 lines)
│   │   ├── clients/[id]/           page.tsx (758 lines)
│   │   ├── clients/new/            page.tsx
│   │   ├── clients/                page.tsx
│   │   ├── estimates/[id]/
│   │   │   ├── contract/           page.tsx (708 lines)
│   │   │   ├── invoice/            page.tsx (422 lines)
│   │   │   ├── payment-setup/      page.tsx
│   │   │   └── sign/               page.tsx
│   │   ├── estimates/[id]/         page.tsx (797 lines)
│   │   ├── estimates/new/          page.tsx (854 lines)
│   │   ├── estimates/new-old/      page.tsx (2057 lines — legacy builder)
│   │   ├── estimates/              page.tsx
│   │   ├── invoices/               page.tsx (377 lines)
│   │   ├── marketing/              page.tsx
│   │   ├── pdf-viewer/             page.tsx
│   │   ├── price-list/             page.tsx (963 lines)
│   │   ├── reports/                page.tsx
│   │   ├── settings/
│   │   │   ├── company/            page.tsx (417 lines)
│   │   │   ├── contract/           page.tsx (653 lines)
│   │   │   ├── quote/              page.tsx
│   │   │   └── reminders/          page.tsx
│   │   ├── settings/               page.tsx (1917 lines)
│   │   ├── layout.tsx
│   │   └── page.tsx               (1572 lines — dashboard home)
│   ├── estimate/[id]/              page.tsx (459 lines — public client-facing)
│   ├── onboarding/welcome/         page.tsx
│   ├── onboarding/                 page.tsx
│   ├── sign/[id]/                  page.tsx
│   ├── sign/contract/[id]/         page.tsx (948 lines)
│   ├── team/join/[token]/          page.tsx
│   ├── layout.tsx
│   └── page.tsx                   (root — splash/redirect)
├── components/
│   ├── estimate-builder-v2/
│   │   ├── awning-hung-tiltturn-drawing.tsx (359 lines)
│   │   ├── builder-header.tsx
│   │   ├── client-step.tsx
│   │   ├── icons.tsx
│   │   ├── opening-editor.tsx (456 lines)
│   │   ├── opening-row.tsx
│   │   ├── photos-upload.tsx
│   │   ├── primitives.tsx
│   │   ├── review-step.tsx (442 lines)
│   │   ├── section-builder.tsx (555 lines)
│   │   ├── shape-outline-drawing.tsx
│   │   ├── trim-section.tsx
│   │   └── type-picker.tsx
│   ├── pdf/
│   │   ├── ContractPDF.tsx
│   │   └── EstimatePDF.tsx (408 lines)
│   ├── AddressAutocomplete.tsx
│   ├── AppTopBar.tsx
│   ├── ApexScaleLogo.tsx
│   ├── BellButton.tsx
│   ├── ConfirmModal.tsx
│   ├── DrawerNav.tsx (391 lines)
│   ├── MobileTopBar.tsx
│   ├── Sidebar.tsx
│   ├── SIcon.tsx
│   ├── TimePickerDropdown.tsx
│   └── WindowDiagram.tsx (402 lines)
├── emails/
│   └── WelcomeEmail.ts
├── hooks/
│   └── useNotifications.ts
├── lib/
│   ├── supabase/
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   └── service.ts
│   ├── v2/
│   │   └── openingTypes.ts (535 lines)
│   ├── activity.ts
│   ├── clientValidation.ts
│   ├── contractClauses.ts
│   ├── generateEstimateHtml.ts
│   ├── getCompanyName.ts
│   ├── openingLabels.ts
│   ├── openingSvgString.ts (1010 lines)
│   ├── pricing.ts (385 lines)
│   ├── provinces.ts
│   ├── rateLimit.ts
│   ├── renderDrawingPng.ts
│   ├── teamScope.ts
│   ├── usePermissions.ts
│   └── validation.ts
├── migrations/             (empty or local — see supabase/migrations)
├── prototype/              (5 JSX files — legacy prototypes, not imported anywhere)
├── supabase/
│   ├── migrations/         (21 SQL files)
│   └── schema.sql
├── public/
│   ├── sw.js               (service worker)
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   └── logo/
├── middleware.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

### package.json — dependencies

| Package | Version |
|---|---|
| @dnd-kit/core | ^6.3.1 |
| @dnd-kit/sortable | ^10.0.0 |
| @dnd-kit/utilities | ^3.2.2 |
| @react-pdf/renderer | ^4.5.1 |
| @sparticuz/chromium | ^149.0.0 |
| @supabase/ssr | ^0.10.2 |
| @supabase/supabase-js | ^2.105.1 |
| @upstash/ratelimit | ^2.0.8 |
| @upstash/redis | ^1.38.0 |
| html2canvas | ^1.4.1 |
| jspdf | ^4.2.1 |
| lucide-react | ^1.14.0 |
| next | 16.2.4 |
| pdf-lib | ^1.17.1 |
| pdfkit | ^0.18.0 |
| puppeteer-core | ^25.2.1 |
| react | 19.2.4 |
| react-dom | 19.2.4 |
| resend | ^6.12.2 |
| sharp | ^0.35.2 |
| svix | ^1.95.2 |

**devDependencies:** @tailwindcss/postcss ^4, @types/node ^20, @types/pdfkit, @types/react ^19, @types/react-dom, @types/react-pdf, eslint ^9, eslint-config-next 16.2.4, tailwindcss ^4, typescript ^5, vercel ^54.7.1

### Next.js & TypeScript
- Next.js: **16.2.4** (App Router)
- TypeScript: strict mode enabled (`"strict": true`)
- Module resolution: bundler
- Target: ES2017
- Path alias: `@/*` → `./*`
- `serverExternalPackages`: `['@sparticuz/chromium', 'puppeteer-core']` (Puppeteer not currently used in active routes — present for PDF generation fallback)

### Environment Variables (names only)

| Name | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client/server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser/server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Service & admin clients (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Referenced in code |
| `RESEND_API_KEY` | Email sending (Resend) |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signature verification |
| `CRON_SECRET` | Bearer token for `/api/expire-estimates` cron |
| `INTERNAL_API_SECRET` | Shared secret for `/api/deposit-invoice` called from sign pages |
| `GOOGLE_PLACES_API_KEY` | Google Places API v1 (address autocomplete) |
| `UPSTASH_REDIS_REST_URL` | Rate limiting via Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting via Upstash Redis |

---

## 2. Routes Map

### Pages

| Path | Purpose | Component type | Auth-protected |
|---|---|---|---|
| `/` | Splash + auto-redirect (2.2 s delay) to /auth or /dashboard | `'use client'` | No |
| `/auth` | Login page | `'use client'` | No (redirected away if logged in) |
| `/auth/register` | Registration form | `'use client'` | No |
| `/auth/check-email` | "Check your email" confirmation screen | `'use client'` | No |
| `/auth/confirm` | Email confirmation flow | `'use client'` | No |
| `/auth/confirmed` | Post-confirmation screen | `'use client'` | No |
| `/auth/forgot-password` | Password reset request | `'use client'` | No |
| `/auth/reset-password` | New password entry | `'use client'` | No |
| `/onboarding` | Trade + company onboarding | `'use client'` | Yes (middleware + layout) |
| `/onboarding/welcome` | Welcome screen | `'use client'` | Yes |
| `/dashboard` | Main dashboard (1572 lines) | `'use client'` | Yes (layout + middleware) |
| `/dashboard/estimates` | Estimates list | `'use client'` | Yes |
| `/dashboard/estimates/new` | Estimate builder v2 (854 lines) | `'use client'` | Yes |
| `/dashboard/estimates/new-old` | Legacy estimate builder (2057 lines) | `'use client'` | Yes |
| `/dashboard/estimates/[id]` | Estimate detail (797 lines) | `'use client'` | Yes |
| `/dashboard/estimates/[id]/contract` | Create/send contract (708 lines) | `'use client'` | Yes |
| `/dashboard/estimates/[id]/invoice` | Create/send invoice (422 lines) | `'use client'` | Yes |
| `/dashboard/estimates/[id]/payment-setup` | Set payment terms | `'use client'` | Yes |
| `/dashboard/estimates/[id]/sign` | Contractor pre-sign view | `'use client'` | Yes |
| `/dashboard/clients` | Clients list | `'use client'` | Yes |
| `/dashboard/clients/new` | New client form | `'use client'` | Yes |
| `/dashboard/clients/[id]` | Client detail (758 lines) | `'use client'` | Yes |
| `/dashboard/appointments` | Appointments calendar (1279 lines) | `'use client'` | Yes |
| `/dashboard/appointments/new` | New appointment | `'use client'` | Yes |
| `/dashboard/appointments/[id]/edit` | Edit appointment | `'use client'` | Yes |
| `/dashboard/invoices` | Invoices list (377 lines) | `'use client'` | Yes |
| `/dashboard/price-list` | Price list management (963 lines) | `'use client'` | Yes |
| `/dashboard/reports` | Reports page | `'use client'` | Yes |
| `/dashboard/marketing` | Marketing page | `'use client'` | Yes |
| `/dashboard/pdf-viewer` | PDF viewer | `'use client'` | Yes |
| `/dashboard/settings` | Main settings (1917 lines) | `'use client'` | Yes |
| `/dashboard/settings/company` | Company settings (417 lines) | `'use client'` | Yes |
| `/dashboard/settings/contract` | Contract settings (653 lines) | `'use client'` | Yes |
| `/dashboard/settings/quote` | Quote settings | `'use client'` | Yes |
| `/dashboard/settings/reminders` | Reminder settings | `'use client'` | Yes |
| `/estimate/[id]` | Public estimate (client-facing, 459 lines) | `'use client'` | No |
| `/sign/[id]` | Public estimate signing page | `'use client'` | No |
| `/sign/contract/[id]` | Public contract signing page (948 lines) | `'use client'` | No |
| `/team/join/[token]` | Team invite acceptance | `'use client'` | Must be logged in |

### API Routes

| Path | Method(s) | Purpose | Service role | Rate-limited | Input validation |
|---|---|---|---|---|---|
| `/api/public/estimate/[id]` | GET | Public estimate data for client view | Yes | No | UUID check (regex) |
| `/api/public/contract/[id]` | GET, PATCH | Public contract data + client decline | Yes | No | UUID check (regex) |
| `/api/sign-contract` | POST | Client signature submission + DB update | Yes | No | Manual (contractId, signatureBase64 required) |
| `/api/send-email` | POST | All transactional emails (send, reminder, invoice, signed, welcome) | Yes | Yes (10/hr per IP, Upstash) | isValidEmail(), type check |
| `/api/deposit-invoice` | POST | Create deposit invoice + send email | Yes (admin) | No | estimateId required; dual auth (INTERNAL_API_SECRET OR session) |
| `/api/send-invoice` | POST | Send invoice email | Yes | No | Auth session required |
| `/api/invoice-pdf` | GET | Generate invoice PDF on-the-fly | Yes | No | Auth session |
| `/api/estimate-pdf` | GET | Generate estimate PDF (@react-pdf + sharp) | Yes | No | No auth check in route — accessible by URL |
| `/api/estimate-pdf-html` | GET | Estimate as HTML (alternative) | Yes | No | NOT FOUND details |
| `/api/contract-pdf` | GET | Generate/view signed contract as HTML | Yes (admin) | No | contractId param; accessible with just contractId (no auth) |
| `/api/contract-pdf-gen` | GET | Generate contract PDF (@react-pdf) | Yes | No | NOT FOUND auth details |
| `/api/pdf` | POST | Generic PDF (puppeteer-based?) | Yes | No | NOT FOUND details |
| `/api/expire-estimates` | GET | Mark sent estimates >30 days as expired | Yes | No | Bearer `CRON_SECRET` header |
| `/api/log-activity` | POST | Log activity events | Admin client | No | Auth session required; user_id cross-check |
| `/api/places` | GET | Google Places autocomplete + details proxy | No | No | type param check; GOOGLE_PLACES_API_KEY required |
| `/api/track-estimate-view` | POST | Increment estimate view count + notify | Yes | No | No auth (open to anyone with estimateId) |
| `/api/register-profile` | POST | Upsert profile on registration | Yes (admin) | No | userId required |
| `/api/resend-webhook` | POST | Resend email.opened event → update estimate | Yes | No | Svix signature verification |
| `/api/send-contract` | POST | Send contract email to client | Yes | No | NOT FOUND details |
| `/api/send-contract-signed` | POST | Notify contractor of signature | Yes | No | NOT FOUND details |
| `/api/notify-contractor-signed` | POST | Push notification to contractor | Yes | No | NOT FOUND details |
| `/api/team-invite` | POST | Send team invitation email | Admin client | Yes (5/hr per IP) | isValidEmail(); auth session |
| `/api/team-join` | POST | Accept team invitation | Admin client | No | Auth session; token validation; expiry check |
| `/api/team-members` | GET/POST | List/manage team members | NOT FOUND details | No | Auth session |
| `/api/team-members/[id]` | PATCH/DELETE | Update/remove team member | NOT FOUND details | No | Auth session |

### Middleware (`middleware.ts`)

- Reads Supabase session via `createServerClient`
- **Public paths** (no auth required): `/auth`, `/estimate`, `/team/join`, `/sign`, `/api/deposit-invoice`, `/api/sign-contract`, `/api/notify-contractor-signed`, `/api/send-contract-signed`, `/api/register`, `/api/send-confirmation`, `/auth/confirmed`
- **Matcher excludes**: `_next/static`, `_next/image`, `favicon.ico`, `manifest.json`, `sw.js`, `icon-*.png`, `logo/`, `api/pdf`, `api/send-email`, `api/contract-pdf`, `api/contract-pdf-gen`, `api/places`, `api/estimate-pdf` — these API routes are **unprotected by middleware**
- Logged-in users on `/auth` → redirected to `/onboarding` or `/dashboard` (checks `onboarding_done`)
- Dashboard access guard: checks `onboarding_done` via admin client; redirects to `/onboarding` if false
- UUID sanitization: `userId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')` used in middleware and several API routes

---

## 3. Database Schema

### Tables (from `supabase/schema.sql` + migrations)

#### `public.profiles`
```
id                    uuid PK → auth.users(id) ON DELETE CASCADE
first_name            text
last_name             text
email                 text
company_name          text
phone                 text
website               text
city                  text
province              text DEFAULT 'AB'
trade                 text DEFAULT 'wd'
licence               text
insurance             text
logo_url              text
contract_terms        text
signature_url         text
plan                  text DEFAULT 'pro'
onboarding_done       boolean DEFAULT false
created_at            timestamptz DEFAULT now()
updated_at            timestamptz DEFAULT now()
-- Added via schema.sql ALTER:
team_owner_id         uuid → profiles(id) ON DELETE SET NULL
member_role           text
deposit_pct           numeric DEFAULT 30
interac_email         text
-- Added via migrations (inferred from code usage):
quote_settings        jsonb DEFAULT '{}'   (add_quote_settings.sql)
postal                text
address               text
warranty_period       text
completion_timeframe  text
payment_methods       text[]
project_manager       text
contract_clauses      text
deposit_percent       numeric
deposit_required      boolean
cancellation_policy   text
customer_responsibilities text
buyer_right_to_cancel text
damage_disclaimer     text
permits_responsibility text
deposit_timing        text
company_contact_email text
gst_hst_number        text
signing_rep_name      text
signing_rep_title     text
warranty_summary      text
wsib_number           text
licence               text
role                  text
notification_settings jsonb
google_review_link    text
```

#### `public.estimates`
```
id                    uuid PK DEFAULT gen_random_uuid()
user_id               uuid NOT NULL → profiles(id) ON DELETE CASCADE
estimate_number       text NOT NULL
client_name           text
client_email          text
client_phone          text
client_address        text
client_city           text
client_province       text
scope_notes           text
status                text DEFAULT 'draft'  (draft|sent|signed|declined|expired|invoiced|paid)
tier                  text DEFAULT 'better'
subtotal              numeric(12,2) DEFAULT 0
tax_rate              numeric(6,4) DEFAULT 0
tax_amount            numeric(12,2) DEFAULT 0
total                 numeric(12,2) DEFAULT 0
signed_at             timestamptz
client_signature_url  text
pdf_url               text
notes                 text
valid_until           date
sent_method           text
created_at            timestamptz DEFAULT now()
updated_at            timestamptz DEFAULT now()
-- Added via migrations:
client_postal_code    text                   (add_postal_code.sql)
job_site_address      text                   (add_job_site_address.sql)
job_site_city         text
job_site_province     text
job_site_postal_code  text
job_site_same_as_client boolean DEFAULT true
last_reminder_sent_at timestamptz            (add_reminder_tracking.sql)
reminder_count        integer DEFAULT 0
discount_type         text                   (inferred from code)
discount_value        numeric
discount_amount       numeric(12,2)
deposit_percent       numeric                (add_payment_to_contracts.sql)
invoice_id            uuid                   (inferred from deposit-invoice route)
sent_at               timestamptz            (inferred from code)
view_count            integer
viewed_at             timestamptz
expired_reason        text                   (add_expired_reason.sql)
-- Trim columns (add_trim_columns.sql):
trim_casing           text DEFAULT 'none'
trim_casing_size      text
trim_casing_custom_name text                 (add_trim_custom_names.sql)
trim_jamb             text DEFAULT 'none'
trim_jamb_custom_name text
trim_jamb_extension_depth text              (add_trim_jamb_extension_depth.sql)
trim_jamb_extension_depth_custom text
trim_brickmold        boolean DEFAULT false
trim_brickmold_colour_palette_id uuid → color_palette(id)
trim_brickmold_colour_name text
trim_rosettes         text DEFAULT 'none'
trim_caping           boolean DEFAULT false
trim_nail_fin         boolean DEFAULT false
trim_drip_cap         boolean DEFAULT false
trim_blue_skin        boolean DEFAULT false
```

#### `public.estimate_openings`
```
id                    uuid PK DEFAULT gen_random_uuid()
estimate_id           uuid NOT NULL → estimates(id) ON DELETE CASCADE
type                  text NOT NULL DEFAULT 'window_dh'
qty                   integer DEFAULT 1
width                 text DEFAULT 'md'  (sm|md|lg|xl bucket)
shape                 text DEFAULT 'rect'
colour                text DEFAULT 'white'
glass                 text DEFAULT 'clear'
frame                 text DEFAULT 'none'
install               text DEFAULT 'insert'
floor                 text DEFAULT 'first'
room                  text
sidelight             numeric DEFAULT 0
transom               numeric DEFAULT 0
screen                numeric DEFAULT 0
unit_cost             numeric(12,2) DEFAULT 0
total_cost            numeric(12,2) DEFAULT 0
sort_order            integer DEFAULT 0
side_unit             text
center_window_type    text
panel_type            text
open_mode             text
created_at            timestamptz DEFAULT now()
-- Added via migrations:
width_in              numeric
height_in             numeric
material              text
brand                 text
notes                 text
has_screen            boolean
tilt_clean            boolean
opening_direction     text
panels_count          text
bay_angle             text
transom_panes         text
sidelight_left        numeric
sidelight_right       numeric
transom_above         boolean
glass_type            text
core_type             text
custom_shape_label    text
custom_colour_label   text
colour_palette_id     uuid → color_palette(id)
colour_name           text
interior_photo_url    text              (add_opening_photos.sql)
exterior_photo_url    text
photo_3_url           text              (add_opening_photos_3_4.sql)
photo_4_url           text
glass_kind            text DEFAULT 'clear'  (split_glass_fields.sql: frosted|tinted|obscure|clear)
low_e                 boolean DEFAULT false
tempered              boolean DEFAULT false
interior_colour_palette_id uuid → color_palette(id)  (add_interior_colour.sql)
interior_colour_name  text
interior_colour       text DEFAULT 'white'
window_subtype        text              (add_window_subtypes.sql)
pane                  text DEFAULT 'double'
egress_required       boolean DEFAULT false
shape_position        text
sections              jsonb             (add_combination_sections.sql — combination window sections)
product_type_id       uuid → product_types(id)  (phase1_product_types.sql)
subtype               text
```

#### `public.invoices`
```
id             uuid PK DEFAULT gen_random_uuid()
estimate_id    uuid → estimates(id) ON DELETE SET NULL
user_id        uuid NOT NULL → profiles(id) ON DELETE CASCADE
invoice_number text NOT NULL
invoice_type   text DEFAULT 'standard'  (deposit|final|standard)
status         text DEFAULT 'pending'   (pending|paid)
amount         numeric(12,2) DEFAULT 0
due_date       date
paid_at        timestamptz
notes          text
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()
```

#### `public.team_invitations`
```
id            uuid PK DEFAULT gen_random_uuid()
owner_id      uuid NOT NULL → profiles(id) ON DELETE CASCADE
invitee_email text NOT NULL
invitee_name  text
role          text NOT NULL DEFAULT 'estimator'  (owner|manager|estimator|admin)
token         text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text
status        text NOT NULL DEFAULT 'pending'    (pending|accepted)
created_at    timestamptz DEFAULT now()
expires_at    timestamptz DEFAULT (now() + interval '7 days')
permissions   jsonb                              (added via team-join route)
```

#### `public.product_types` (phase1_product_types.sql)
```
id          uuid PK DEFAULT gen_random_uuid()
category    text NOT NULL
type_key    text NOT NULL UNIQUE
type_label  text NOT NULL
subtype     text
sort_order  integer DEFAULT 0
enabled     boolean DEFAULT true
```

#### `public.type_field_visibility` (phase1_product_types.sql)
```
type_key    text NOT NULL → product_types(type_key) ON DELETE CASCADE
field_name  text NOT NULL
is_visible  boolean NOT NULL DEFAULT false
PRIMARY KEY (type_key, field_name)
```

#### `public.window_subtypes` (add_window_subtypes.sql)
```
id            uuid PK DEFAULT gen_random_uuid()
type_key      text NOT NULL → product_types(type_key) ON DELETE CASCADE
subtype_key   text NOT NULL
subtype_label text NOT NULL
sort_order    integer DEFAULT 0
UNIQUE (type_key, subtype_key)
```

#### Additional tables (inferred from code, schema NOT in repo)
- `public.contracts` — contains: `id, estimate_id, profile_id, status (sent|signing|signed|declined), contract_terms_snapshot, contractor_signature_url, client_signature_url, company_name, company_email, company_phone, signed_at, created_at, payment_method, deposit_percent`
- `public.clients` — contains: `id, owner_id, name, phone, email, address, city, province, postal_code, notes, created_at`
- `public.appointments` — contains: `id, user_id, client_id(?), date/time, postal_code, assigned_to`
- `public.notifications` — contains: `id, user_id, type, title, body, link, read, created_at`
- `public.activity_log` — contains: `id, user_id, event_type, actor_type, actor_name, entity_type, entity_id, entity_number, client_name, amount, created_at`
- `public.price_lists` — contains: `id, user_id, opening_type, custom_label, product_type_id` (+ surcharge fields, colour palette pricing)
- `public.color_palette` — contains: `id, name, price_addon, hex` (referenced by trim + opening colour FK)

### RLS Policies

#### `public.profiles`
- `"Users can view own profile"` — SELECT — `USING (auth.uid() = id)`
- `"Users can update own profile"` — UPDATE — `USING (auth.uid() = id)`
- `"Users can insert own profile"` — INSERT — `WITH CHECK (auth.uid() = id)`

#### `public.estimates`
- `"Users see own estimates"` — SELECT — `USING (auth.uid() = user_id)`
- `"Users insert own estimates"` — INSERT — `WITH CHECK (auth.uid() = user_id)`
- `"Users update own estimates"` — UPDATE — `USING (auth.uid() = user_id OR auth.uid() = (SELECT team_owner_id FROM profiles WHERE id = estimates.user_id) OR (SELECT team_owner_id FROM profiles WHERE id = auth.uid()) = (SELECT team_owner_id FROM profiles WHERE id = estimates.user_id))`
- `"Users delete own estimates"` — DELETE — `USING (auth.uid() = user_id)`
- `"Public read estimate by id"` — SELECT — `USING (true)` ← **open public read** (note: `close_estimates_public_rls.sql` has a DROP of this policy as SQL comments only — whether it was applied to production is NOT determinable from code alone)
- `"Public sign estimate"` — UPDATE — `USING (status IN ('draft','sent')) WITH CHECK (status IN ('signed','declined'))`

#### `public.estimate_openings`
- `"Users see own openings"` — SELECT — `USING (estimate_id IN (SELECT id FROM estimates WHERE user_id = auth.uid()))`
- `"Users insert own openings"` — INSERT — same pattern
- `"Users update own openings"` — UPDATE — same pattern
- `"Users delete own openings"` — DELETE — same pattern
- `"Public read openings by estimate"` — SELECT — `USING (true)` ← **open public read**

#### `public.invoices`
- `"Users see own invoices"` — SELECT — `USING (auth.uid() = user_id)`
- `"Users insert own invoices"` — INSERT — WITH CHECK includes team owner chain
- `"Users update own invoices"` — UPDATE — team-aware (owner chain)
- `"Users delete own invoices"` — DELETE — `USING (auth.uid() = user_id)`

#### `public.team_invitations`
- `"Owners manage own invitations"` — ALL — `USING (auth.uid() = owner_id)`
- `"Public read pending invitation"` — SELECT — `USING (status = 'pending')` ← any row with status='pending' is publicly readable

#### `public.window_subtypes`
- `"Authenticated users can read window subtypes"` — SELECT TO authenticated — `USING (true)`

#### Storage: `logos` bucket (public)
- INSERT: `auth.uid()::text = (storage.foldername(name))[1]`
- UPDATE/DELETE: same
- SELECT: `USING (bucket_id = 'logos')` — public read

#### Storage: `signatures` bucket (public)
- INSERT: `auth.uid()::text = (storage.foldername(name))[1]`
- Note: `/api/sign-contract` uploads to `signatures` bucket using **service role**, bypassing RLS — path: `contract-signatures/{contractId}-client-{timestamp}.png`

#### Storage: `opening-photos` bucket (public)
- INSERT/UPDATE/DELETE: team-aware (owner chain) — `fix_opening_photos_team_rls.sql`
- SELECT: public read

### DB Functions / Triggers

- `public.handle_new_user()` — TRIGGER — `AFTER INSERT ON auth.users` — inserts profile row with email + name from `raw_user_meta_data`; uses `ON CONFLICT (id) DO NOTHING`

### JSONB Structures

#### `profiles.quote_settings`
```json
{
  "reminders": {
    "enabled": boolean,
    "first_after_days": number,    // default 2
    "max_count": number,           // max 3
    "template_1": string,          // template vars: {client_name} {estimate_number} {address} {amount} {expiry_date}
    "template_2": string
  }
}
```

#### `estimate_openings.sections` (combination windows)
```json
[
  { "type": "Picture" | "Casement" | "Awning" | "Slider" | "Fixed" | "Single Hung", "width": number }
]
```

#### `profiles.notification_settings` (inferred from code)
```json
{
  "inapp": {
    "pushNew": boolean,
    "pushTeam": boolean
  }
}
```

### Indexes
NOT FOUND in migrations — no explicit `CREATE INDEX` statements found in supabase/ directory.

---

## 4. Estimate Builder (Core)

### File structure (`app/dashboard/estimates/new/`)
- `page.tsx` (854 lines) — main builder: list mode → client step → review step
- `app/dashboard/estimates/new-old/page.tsx` (2057 lines) — **legacy builder**, not linked from anywhere in navigation

### Component structure
```
app/dashboard/estimates/new/page.tsx
  └── components/estimate-builder-v2/
      ├── builder-header.tsx    (BuilderHeader, BottomBar)
      ├── client-step.tsx       (ClientStep, ClientInfo)
      ├── review-step.tsx       (ReviewStep, SaveParams) — 442 lines
      ├── opening-row.tsx       (OpeningRow)
      ├── opening-editor.tsx    (OpeningEditor) — 456 lines
      ├── type-picker.tsx       (TypePickerSheet)
      ├── section-builder.tsx   (combination window builder) — 555 lines
      ├── trim-section.tsx      (TrimSection, TrimState, TRIM_DEFAULTS)
      ├── photos-upload.tsx     (PhotoSlot)
      ├── primitives.tsx        (PickerSheet, PickerState)
      ├── shape-outline-drawing.tsx (ShapeOutlineDrawing)
      ├── awning-hung-tiltturn-drawing.tsx — 359 lines
      └── icons.tsx             (EBIcon)
```

### Opening Types — Full List (from `lib/v2/openingTypes.ts` CATALOG)

**Windows:**

| typeId | Name | Subtypes |
|---|---|---|
| `casement` | Casement | Left casement, Right casement, Double casement, French casement, Fixed casement |
| `awning` | Awning | Standard awning, Push-out awning |
| `picture` | Picture | (none) |
| `slider` | Slider | XO, OX, XX, End vent, Double end vent, Lift-out |
| `endVent` | End vent | Single end vent (XOX), Double end vent (OXO) |
| `singleHung` | Single hung | Standard, Tilt-In |
| `doubleHung` | Double hung | Standard, Tilt-in |
| `hopper` | Hopper | Standard hopper, Basement hopper |
| `tiltTurn` | Tilt & turn | Single, Double |
| `bay` | Bay | 3 lite, 4 lite, 5 lite |
| `bow` | Bow | 4 lite, 5 lite, 6 lite, 7 lite |
| `combination` | Combination | (none — uses section-builder) |
| `special` | Special shape | Arch, Half arch, Circle, Half circle, Triangle, Trapezoid, Pentagon, Octagon, Gothic, Eyebrow, Custom |
| `transom` | Transom | Fixed transom, Operable transom |

**Doors:**

| typeId | Name | Subtypes |
|---|---|---|
| `entry` | Entry door | Single Door, Single + Left Sidelite, Single + Right Sidelite, Single + Double Sidelite, Single + Transom, Single + Sidelites + Transom |
| `doubleEntry` | Double entry | Equal double, Unequal double, Double + Sidelites, Double + Transom, Double + Sidelites + Transom |
| `french` | French door | Single french, Double french, French + sidelites |
| `garden` | Garden door | (none) |
| `patio` | Patio sliding | XO, OX, XOX, OXXO |
| `storm` | Storm door | Full glass, Half glass, Screen |
| `interior` | Interior door | Single, Double, Pocket, Bifold |

**Total: 21 opening types** (14 window + 7 door). Note: `endVent` exists in CATALOG but is NOT in `OPENING_TYPES` in `lib/pricing.ts` and NOT in `V2_TO_OLD_TYPE_KEY` — it will fall back to base 800 CA$ pricing.

### typeId → Price List Key Mapping

Defined in `lib/v2/openingTypes.ts` (`SETTINGS.pricing.base`, line ~50):
```
casement     → 980
awning       → 920
picture      → 640
slider       → 760
singleHung   → 700
doubleHung   → 820
hopper       → 540
tiltTurn     → 1240
bay          → 2600
bow          → 3200
combination  → 1800
special      → 1100
transom      → 550
entry        → 2400
doubleEntry  → 3900
french       → 2900
garden       → 2600
patio        → 2800
storm        → 680
interior     → 450
(missing key) → 800  (fallback in sectionPrice())
```

Old-style keys (used by `lib/pricing.ts` `OPENING_TYPES` for the legacy builder):
`window_dh` → 700+300, `window_sh` → 650+280, `window_cas` → 850+320, etc.

### Price Calculation Logic (`lib/pricing.ts` `computePrice()`)

1. **Base price**: `SETTINGS.pricing.base[op.typeId] ?? 800` (fallback CA$800 for any unmapped typeId)
2. **Area rate**: `base + Math.round((w * h) / 144 * areaRatePerSqFt)` where default `areaRatePerSqFt = 26`
3. **Bay/Bow**: Split into section prices: 2× side sections + (liteCount-2) center sections, then multiply by `1 + bay_surcharge%/100`
4. **Combination**: Sum of all section prices × `1 + combination_surcharge%/100`
5. **Surcharges applied in order**: install type, floor, frame condition, egress, triple pane, low-E, argon, tempered, laminated glass, glass type (frosted/tinted/obscure), grid, screen type, colour (palette-specific or generic `custom_colour`), material, hardware (deadbolt, multipoint lock), pet door, brickmould, jamb depth
6. **Shape multiplier** (applied last, on full unit cost): Arch → `p × (1 + arch_pct%/100)`, Custom Shape → `p × (1 + custom_shape_pct%/100)`
7. **Final**: `p × qty`

**CA$800 fallback condition**: `SETTINGS.pricing.base[op.typeId]` returns `undefined` → `?? 800` → price = `800 + area_rate`. Triggered for `endVent` type and any other unmapped typeId.

Custom prices are loaded from `price_lists` table (`user_id = current_user`).

### `saveEstimate()` — What it saves (`app/dashboard/estimates/new/page.tsx` ~line 560)

Fields written to `estimates` table:
- `user_id`, `estimate_number`, `client_id`, `client_name`, `client_email`, `client_phone`, `client_address`, `client_city`, `client_province`, `client_postal_code`, `scope_notes`, `status` (draft), `subtotal`, `tax_rate`, `tax_amount`, `total`, `discount_type`, `discount_value`, `discount_amount`, `valid_until`, `trim_casing`, `trim_casing_size`, `trim_casing_custom_name`, `trim_jamb`, `trim_jamb_custom_name`, `trim_jamb_extension_depth`, `trim_jamb_extension_depth_custom`, `trim_brickmold`, `trim_brickmold_colour_palette_id`, `trim_brickmold_colour_name`, `trim_rosettes`, `trim_caping`, `trim_nail_fin`, `trim_drip_cap`, `trim_blue_skin`

Fields NOT saved in `saveEstimate()` (exist in table, set later):
- `sent_at`, `sent_method`, `signed_at`, `client_signature_url`, `pdf_url`, `last_reminder_sent_at`, `reminder_count`, `deposit_percent`, `invoice_id`, `view_count`, `viewed_at`, `expired_reason`, job_site_* fields

Each opening row saved to `estimate_openings`: `type` (V2 typeId, not old-style key), `window_subtype`, `qty`, `width_in`, `height_in`, `width` (size bucket), `shape`, `colour`, `interior_colour`, `frame`, `glass`, `glass_kind`, `low_e`, `tempered`, `pane`, `install`, `floor`, `room`, `has_screen`, `material`, `grid_pattern`, `tilt_clean`, `opening_direction`, `panels_count`, `bay_angle`, `transom_panes`, `sidelight`, `sidelight_left`, `sidelight_right`, `transom`, `transom_above`, `core_type`, `egress_required`, `notes`, `custom_shape_label`, `interior_photo_url`, `exterior_photo_url`, `photo_3_url`, `photo_4_url`, `unit_cost`, `total_cost`, `sort_order`, `colour_palette_id`, `colour_name`, `interior_colour_palette_id`, `interior_colour_name`

NOT saved per opening: `brand`, `shape_position`, `sections` (combination sections — these exist in JSONB column but not populated via saveEstimate)

### Builder State & Draft Management

- State lives entirely in React `useState` within `app/dashboard/estimates/new/page.tsx`
- **No draft persistence** — refreshing the page during creation loses all data
- Edit mode: when `?edit=<estimateId>` param present, loads existing estimate + openings on mount
- Opening photo uploads: handled immediately (photos-upload.tsx uploads to Supabase storage before save)
- `openings` array uses V2 `Opening` type with `tempId` (UUID) for keying before save

---

## 5. Contract & Signature Flow

### Full Flow
1. Contractor navigates to `/dashboard/estimates/[id]/contract`
2. Page loads profile + estimate; contractor may sign with SVG pad or send to client
3. `INSERT INTO contracts (estimate_id, profile_id, status='sent'|'signing', contract_terms_snapshot, ...)` — `lib/supabase/client` (anon key, client-side)
4. If contractor pre-signs: SVG drawn to canvas → PNG base64 → `POST /api/sign-contract` (or stored directly)
5. Email sent to client via `POST /api/send-contract`
6. Client views contract at `/sign/contract/[id]` — data loaded from `GET /api/public/contract/[id]` (service role)
7. Client signs with canvas → PNG base64 → `POST /api/sign-contract`
8. `/api/sign-contract` uploads PNG to `signatures/contract-signatures/{contractId}-client-{timestamp}.png` (public bucket), updates `contracts.status='signed'`, `contracts.client_signature_url`, `contracts.signed_at`, updates `estimates.status='signed'`
9. Notifications inserted, activity logged, team owner notified if applicable

### E-Signature Implementation
- **Canvas-based drawing**: client draws on HTML5 canvas (`/sign/contract/[id]/page.tsx`)
- **Contractor**: SVG element (`svgRef.current`) → `XMLSerializer` → canvas → PNG base64 (`app/dashboard/estimates/[id]/contract/page.tsx` line ~205)
- **What is stored**: PNG image URL in Supabase storage (public bucket). No cryptographic hash, no IP address stored in DB (IP not captured), timestamp stored as `signed_at` timestamptz
- **No PDF embedding** of signature at signing time — signature is a separate image URL

### Public Routes Access
- `GET /api/public/contract/[id]`: UUID validation → service role fetch of contract, estimate, openings, profile — no token, accessible to anyone with contract UUID
- `PATCH /api/public/contract/[id]`: only `action: 'decline'` supported; no auth — anyone with contract UUID can decline

---

## 6. PDF Pipeline

### PDF Documents Generated
1. **Estimate PDF** — `@react-pdf/renderer` via `/api/estimate-pdf` (GET) — uses `EstimatePDF` component + `renderDrawingPng` (SVG→PNG via `sharp`)
2. **Contract PDF** — `@react-pdf/renderer` via `/api/contract-pdf-gen` (GET) — uses `ContractPDF` component
3. **Signed Contract HTML** — plain HTML generation in `/api/contract-pdf` (GET) — returns HTML with print button; uses `createAdminClient` (no auth check on route)
4. **Invoice PDF** — `/api/invoice-pdf` (GET) — `@react-pdf/renderer`

### Chain: Estimate PDF

```
GET /api/estimate-pdf?id=<uuid>
  → createServiceClient() [service role]
  → SELECT estimate, openings, profile, price_lists, window_subtypes
  → Promise.all(openings.map(op → renderDrawingPng(op, 600, 720)))
      → openingSvgString(op)  [lib/openingSvgString.ts, 1010 lines]
      → sharp(svgBuffer).resize(600,720).png().toBuffer()
      → base64 data URI
  → renderToBuffer(<EstimatePDF ... drawingPngs={...} />) [@react-pdf/renderer]
  → NextResponse with Content-Type: application/pdf
```

### Chain: Contract PDF (HTML version)

```
GET /api/contract-pdf?contractId=<uuid>
  → createAdminClient() [service role — NO auth check]
  → SELECT contract, estimate, openings, profile
  → Build HTML string with inline styles
  → NextResponse text/html
```

### Storage
- PDFs are generated **on-the-fly** and streamed back as responses — **NOT stored in Supabase Storage**
- Signature images stored in `signatures` bucket (public)
- Opening photos stored in `opening-photos` bucket (public)
- Logos stored in `logos` bucket (public)

---

## 7. Email & Reminders

### Transactional Emails (all via Resend, all in `/api/send-email/route.ts`)

| Trigger | Email type | `type` param | Recipient |
|---|---|---|---|
| Estimate sent to client | Estimate with CTA | `send` | client_email |
| Follow-up | Reminder (templated) | `reminder` | client_email |
| Contract signed by client | Signed notification | `signed` | client_email (confirmation) |
| Invoice created | Invoice with payment details | `invoice` | client_email |
| Deposit receipt | Payment receipt | `deposit_receipt` | client_email |
| Final receipt | Final payment receipt | `final_receipt` | client_email |
| Registration | Welcome email | `welcome` | recipientEmail |
| Team invitation | Invite with join link | separate `/api/team-invite` route | invitee email |

Email from address: `ApexScale <noreply@useapexscale.com>` (hardcoded in send-email route)

### Reminder System

- **On-demand** (contractor manually triggers from dashboard), NOT automated cron
- **Cooldown**: 24-hour minimum between reminders (`hoursSince < 24` → 429)
- **Max count**: configurable per user in `quote_settings.reminders.max_count` (1–3 max options shown in UI)
- **Templates**: 2 templates (template_1 used for first reminder, template_2 for subsequent)
- **Variables**: `{client_name}`, `{estimate_number}`, `{address}`, `{amount}`, `{expiry_date}`
- **DB updates after send**: `estimates.last_reminder_sent_at`, `estimates.reminder_count += 1`

### Auto-expire
- **Cron endpoint**: `GET /api/expire-estimates` — protected by `Authorization: Bearer {CRON_SECRET}` header
- Logic: estimates with `status='sent'` AND `created_at < now() - 30 days` → set `status='expired'`, insert notifications
- Must be triggered externally (Vercel Cron, GitHub Actions, etc.) — no internal scheduler

### Rate Limiting
- `/api/send-email`: 10 requests per IP per hour (Upstash Redis, sliding window)
- `/api/team-invite`: 5 requests per IP per hour
- **No rate limiting** on: `/api/sign-contract`, `/api/track-estimate-view`, `/api/deposit-invoice`, all public contract/estimate endpoints

### Resend Webhook
- `POST /api/resend-webhook` — verifies Svix signature → handles `email.opened` event → updates `estimates.viewed_at` (or similar — exact column NOT FOUND, inferred)

---

## 8. Team / Multi-user

### `lib/teamScope.ts`

```
getTeamUserIds(admin, userId):
  1. Sanitize userId (trim + ASCII printable filter)
  2. SELECT profile (team_owner_id, role, member_role)
  3. isOwnerOrManager = !team_owner_id (solo) OR role='owner' OR member_role IN ('owner','manager')
  4. If NOT owner/manager → return [userId] (sees only own data)
  5. If owner/manager → SELECT all profiles WHERE id=teamOwnerId OR team_owner_id=teamOwnerId
  6. Return all member IDs + isOwnerOrManager flag
```

### Where teamScope IS used (dashboard queries use `.in('user_id', userIds)`)
- `app/dashboard/page.tsx` — all main dashboard queries
- All estimate/notification/invoice/activity_log queries on dashboard

### Potential Data Leaks (direct supabase.from() without teamScope)

The following use direct equality or no user filter (client-side, anon key — subject to RLS):

| File | Query | Scope note |
|---|---|---|
| `app/dashboard/clients/page.tsx:66` | `from('clients')` | Uses `owner_id` filter but not team-aware (estimators can't see team clients) |
| `app/dashboard/clients/[id]/page.tsx:267-295` | `from('clients')`, `from('appointments')`, `from('contracts')`, `from('invoices')` | Client-side, single-record by ID — RLS-dependent |
| `app/dashboard/settings/page.tsx:238,290` | `from('profiles').eq('id', sanitizedId)` | Own profile only — OK |
| `app/dashboard/settings/contract/page.tsx:205,298` | `from('profiles').update(...)` | Own profile only — OK |

**Note**: `contracts` table RLS state is documented only as SQL comments in `close_estimates_public_rls.sql` — actual production RLS state cannot be determined from the codebase alone.

### Permissions

Defined in team invite `role` field: `owner | manager | estimator | admin`

`lib/usePermissions.ts` — NOT read (file exists, inferred from imports in settings pages)

- Permissions checked client-side in settings pages via `usePermissions` hook
- No server-side permission enforcement found in API routes beyond auth session check

---

## 9. Auth & Security Surface

### Auth Flow
1. User registers at `/auth/register` → Supabase Auth sends confirmation email
2. Email confirmation → `/auth/callback` (route.ts) → redirect to `/auth/confirmed`
3. `handle_new_user` DB trigger fires → inserts profile row
4. `/api/register-profile` POST called after registration → upserts profile with name
5. Middleware checks `onboarding_done` → redirect to `/onboarding` if false
6. Session managed via `@supabase/ssr` cookies

### Service Role Key Usage
Used in `createServiceClient()` and `createAdminClient()` (same implementation):
- `/api/public/estimate/[id]` — public data fetch
- `/api/public/contract/[id]` — public data fetch
- `/api/sign-contract` — signature upload + DB update
- `/api/send-email` — estimate/invoice/profile fetch
- `/api/deposit-invoice` — invoice creation
- `/api/expire-estimates` — mass status update
- `/api/estimate-pdf` — data fetch for PDF
- `/api/contract-pdf` / `/api/contract-pdf-gen` — data fetch for PDF
- `/api/invoice-pdf` — data fetch
- `/api/register-profile` — profile upsert
- `/api/resend-webhook` — estimate update
- `middleware.ts` — `getOnboardingDone()` via `createAdminClient`
- `/api/track-estimate-view` — view count update

### Public Endpoints (no auth)
- `GET /api/public/estimate/[id]` — UUID-gated only
- `GET /api/public/contract/[id]` — UUID-gated only
- `PATCH /api/public/contract/[id]` — UUID-gated, `action: 'decline'` only
- `POST /api/sign-contract` — no auth, contractId validates against DB
- `POST /api/track-estimate-view` — no auth, no rate limit
- `GET /api/contract-pdf?contractId=<uuid>` — no auth, UUID-gated
- `POST /api/deposit-invoice` — dual auth (INTERNAL_API_SECRET OR session)

**Middleware exclusions** (completely bypass middleware auth): `api/pdf`, `api/send-email`, `api/contract-pdf`, `api/contract-pdf-gen`, `api/places`, `api/estimate-pdf` — these routes have their own auth logic (or none)

### UUID Sanitization
Applied in: `middleware.ts`, `lib/teamScope.ts`, `/api/register-profile`, `/api/send-email`, `/api/team-invite`

Pattern: `userId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')`

**UUID validation** (regex) applied in: `GET /api/public/estimate/[id]`, `GET|PATCH /api/public/contract/[id]`

UUID comparison **without** sanitization: client-side queries using `eq('id', id)` from URL params (e.g., `app/dashboard/estimates/[id]/page.tsx`) — relies on Supabase's own parameterization (safe from SQL injection, but no explicit UUID format validation)

### CORS
No CORS headers configured in `next.config.ts` or any API route — uses Next.js defaults (same-origin). Only headers configured: `Cache-Control` for `sw.js` and `manifest.json`.

### Security Headers
No CSP, X-Frame-Options, X-Content-Type-Options, or other security headers configured anywhere in `next.config.ts` or API routes.

### Input Validation
- Email: `isValidEmail()` in `lib/validation.ts` — regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Phone: `validatePhone()` in `lib/clientValidation.ts`
- Password: `isValidPassword()` — `length >= 8` only
- No Zod or schema validation library used anywhere
- All other inputs: manual presence checks only

---

## 10. Client-side State & UX

### Global State
- **No global state manager** (no Zustand, Redux, Context API for shared state)
- Each page is self-contained with local `useState`
- Supabase auth state accessed via `createClient()` in each page separately

### PWA
- **Service Worker**: `public/sw.js` — cache name `apexscale-v9-2026-06-26`
- **Strategy**: Network-only for everything (including `/auth` routes explicitly). All fetches pass through to network: `event.respondWith(fetch(event.request))` — **no actual caching implemented**
- SW only purpose: clear old caches on activate via `caches.keys()` → `Promise.all(keys.map(k => caches.delete(k)))`
- `manifest.json`: `display: "standalone"`, `start_url: "/dashboard"`, 3 icon sizes

### Offline / Error Handling
- No offline mode (SW does no caching)
- No error boundaries found in component tree
- API errors handled locally per-page with `alert()` or `console.error()`

---

## 11. Money & Numbers

### Storage
- All monetary values stored as `numeric(12,2)` in PostgreSQL — **decimal float, not integer cents**
- `tax_rate` stored as `numeric(6,4)` (e.g., 0.1300 for 13%)
- In-memory: JavaScript `number` (float64)

### Rounding
Applied consistently via `Math.round(value * 100) / 100` before DB insert:
- `estimates.subtotal`, `tax_amount`, `total`, `discount_amount`
- `estimate_openings.unit_cost`, `total_cost`
- `invoices.amount`

### Currency
Hardcoded `CA$` throughout:
- `lib/pricing.ts`: `fmtCAD()` → `'CA$' + Math.round(n).toLocaleString('en-CA')`
- `lib/v2/openingTypes.ts` SETTINGS: `currency: 'CA$'`
- Not configurable

### Tax Rates by Province (`lib/pricing.ts` TAX_RATES)
```
AB: 5%   (GST)       BC: 12%  (GST+PST)   MB: 12%  (GST+PST)
NB: 15%  (HST)       NL: 15%  (HST)       NS: 15%  (HST)
NT: 5%   (GST)       NU: 5%   (GST)       ON: 13%  (HST)
PE: 15%  (HST)       QC: 14.975% (QST+GST) SK: 11%  (PST+GST)
YT: 5%   (GST)
```

---

## 12. Code Health Facts

### Top 15 Largest Files

| File | Lines |
|---|---|
| `app/dashboard/estimates/new-old/page.tsx` | 2057 |
| `app/dashboard/settings/page.tsx` | 1917 |
| `app/dashboard/page.tsx` | 1572 |
| `app/dashboard/appointments/page.tsx` | 1279 |
| `lib/openingSvgString.ts` | 1010 |
| `app/dashboard/price-list/page.tsx` | 963 |
| `app/sign/contract/[id]/page.tsx` | 948 |
| `app/dashboard/estimates/new/page.tsx` | 854 |
| `app/dashboard/estimates/[id]/page.tsx` | 797 |
| `app/dashboard/clients/[id]/page.tsx` | 758 |
| `app/dashboard/estimates/[id]/contract/page.tsx` | 708 |
| `app/dashboard/settings/contract/page.tsx` | 653 |
| `app/api/send-email/route.ts` | 647 |
| `components/estimate-builder-v2/section-builder.tsx` | 555 |
| `lib/v2/openingTypes.ts` | 535 |

### TODO / FIXME / HACK Comments

| File | Line | Comment |
|---|---|---|
| `app/sign/contract/[id]/page.tsx` | 350 | `TODO: wire actual surcharge pricing once Settings UI for trim prices exists` |
| `app/sign/contract/[id]/page.tsx` | 710 | `TODO: wire actual surcharge pricing once Settings UI for trim prices exists` |

### Duplicated Logic (factual)

1. **Price calculation**: `computePrice()` in `lib/pricing.ts` (v2) + `opCost()` in `lib/pricing.ts` (deprecated, used only by `new-old` builder). Two separate price engines for the same product types.

2. **Opening name resolution**: V2 type → display name mapping exists in three places:
   - `V2_TYPE_LABELS` in `lib/v2/openingTypes.ts`
   - `OPENING_TYPES[key].name` in `lib/pricing.ts` (old-style keys)
   - `CATALOG[cat].types[id].name` in `lib/v2/openingTypes.ts`

3. **Contract display**: Contract rendered in 3 separate implementations:
   - `app/dashboard/estimates/[id]/contract/page.tsx` (contractor preview)
   - `app/sign/contract/[id]/page.tsx` (client signing, 948 lines with 2 duplicate layout blocks)
   - `app/api/contract-pdf/route.ts` (HTML for print/PDF, entirely self-contained HTML string)
   - `components/pdf/ContractPDF.tsx` (@react-pdf version)

4. **UUID sanitization**: Same pattern repeated in middleware.ts, teamScope.ts, register-profile route, send-email route, team-invite route

5. **`createServiceClient` vs `createAdminClient`**: Both in `lib/supabase/service.ts` and `lib/supabase/admin.ts` — **identical implementation** (same URL, same service role key, same options)

### TypeScript `any` — Count by File (top 20)

| File | `any` count |
|---|---|
| `app/dashboard/settings/page.tsx` | 73 |
| `app/dashboard/estimates/new-old/page.tsx` | 54 |
| `app/dashboard/settings/company/page.tsx` | 41 |
| `app/dashboard/page.tsx` | 38 |
| `components/pdf/ContractPDF.tsx` | 34 |
| `app/api/contract-pdf/route.ts` | 33 |
| `app/sign/contract/[id]/page.tsx` | 32 |
| `app/api/send-email/route.ts` | 27 |
| `app/api/pdf/route.ts` | 25 |
| `lib/generateEstimateHtml.ts` | 24 |
| `components/pdf/EstimatePDF.tsx` | 23 |
| `lib/contractClauses.ts` | 21 |
| `app/dashboard/estimates/[id]/contract/page.tsx` | 18 |
| `app/api/deposit-invoice/route.ts` | 17 |
| `app/dashboard/estimates/[id]/page.tsx` | 14 |
| `app/api/send-invoice/route.ts` | 14 |
| `app/dashboard/settings/contract/page.tsx` | 13 |
| `app/api/invoice-pdf/route.ts` | 13 |
| `app/api/team-invite/route.ts` | 12 |
| `app/api/contract-pdf-gen/route.ts` | 11 |

### Dead / Unused Files

- `app/dashboard/estimates/new-old/page.tsx` — legacy builder (2057 lines), no navigation links point to it; accessible by direct URL only
- `prototype/` directory — 5 JSX files (`eb_app.jsx`, `eb_data.jsx`, `eb_editor.jsx`, `eb_twostep.jsx`, `eb_ui.jsx`, `eb_ui2.jsx`) — not imported anywhere, appear to be development prototypes

### Notable Debug Code Left in Production

- `console.log('[send-email] est.user_id raw:', ...)` — `app/api/send-email/route.ts` (logs profile IDs in production)
- `console.log('[places] Google API key exists: ...key prefix:', KEY?.slice(0,8))` — leaks partial API key prefix to server logs
- `console.log('[team-invite] RESEND_API_KEY ...prefix:', ...)` — leaks key prefix to server logs

---

## 13. Gaps vs Claimed Features

### Stripe
**0% implemented.** No Stripe package, no Stripe import, no Stripe reference found anywhere in the codebase. The string "stripe" appears zero times in `*.ts` / `*.tsx` files. Payment collection is manual: Interac e-Transfer email displayed on invoice, no in-app payment processing.

### Landing Page
`app/page.tsx` (root route `/`) is a **splash screen only**: animated logo + auto-redirect after 2.2 seconds to `/auth` or `/dashboard`. No marketing landing page exists.

### Tests
**Zero tests.** No test files (`*.test.ts`, `*.spec.ts`), no test framework (`jest`, `vitest`, `cypress`, `playwright`) in `package.json` or `package-lock.json`. No test configuration files found.

### Other Gaps
- `app/dashboard/reports/page.tsx` — page exists, content NOT examined (may be stub)
- `app/dashboard/marketing/page.tsx` — page exists, content NOT examined
- `app/dashboard/pdf-viewer/page.tsx` — page exists, appears to be a PDF embed viewer
- Trim pricing in contract view: 2 TODO comments for "wire actual surcharge pricing" in `/sign/contract/[id]/page.tsx` (lines 350, 710)
- `endVent` opening type: defined in CATALOG but missing from `V2_TO_OLD_TYPE_KEY` and `OPENING_TYPES` (will always use CA$800 fallback price and no WindowDiagram rendering)
- No SMS/push notifications (web push or mobile)
- No audit trail for who accessed public contract/estimate URLs
