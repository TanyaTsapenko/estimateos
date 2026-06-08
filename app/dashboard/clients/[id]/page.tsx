'use client'
import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import {
  ArrowLeft, Phone, MessageCircle, Mail, MapPin, Calendar,
  ChevronDown, ChevronUp, Check, FileText, PenLine, CreditCard, Receipt,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  hero:        'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)',
  bg:          '#F4F5F8',
  card:        '#FFFFFF',
  border:      'rgba(10,22,40,0.06)',
  borderMid:   'rgba(10,22,40,0.10)',
  ink:         '#0A1628',
  inkMid:      '#475569',
  inkSoft:     '#94A3B8',
  blue:        '#2563EB',
  green:       '#059669',
  amber:       '#D97706',
  amberBg:     '#FFFBEB',
  amberBorder: 'rgba(217,119,6,0.18)',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Client {
  id: string; name: string; phone: string | null; email: string | null
  address: string | null; city: string | null; province: string | null
  postal_code: string | null; notes: string | null; created_at: string
}
interface Appointment {
  id: string; appointment_date: string; appointment_time: string | null
  status: string; notes: string | null; estimate_id: string | null
  lead_source: string | null
}
interface Estimate {
  id: string; estimate_number: string; status: string; total: number; created_at: string
}
interface Contract { id: string; estimate_id: string; status: string }
interface Invoice  { id: string; estimate_id: string; amount: number; status: string; invoice_type: string }
interface Project  {
  appointment: Appointment
  estimate: Estimate | null
  contract: Contract | null
  depositInvoice: Invoice | null
  finalInvoice: Invoice | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt12h(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00'))
}
function isUpcoming(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(d + 'T00:00:00') >= today
}

// ── Step timeline ─────────────────────────────────────────────────────────────
function StepTimeline({ project }: { project: Project }) {
  const steps = [
    { key: 'estimate', label: 'Estimate', Icon: FileText,   done: !!project.estimate,                                             active: !!project.estimate },
    { key: 'contract', label: 'Contract', Icon: PenLine,    done: project.contract?.status === 'signed',                          active: !!project.contract },
    { key: 'deposit',  label: 'Deposit',  Icon: CreditCard, done: project.depositInvoice?.status === 'paid',                      active: !!project.depositInvoice },
    { key: 'invoice',  label: 'Invoice',  Icon: Receipt,    done: project.finalInvoice?.status === 'paid',                        active: !!project.finalInvoice },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 16 }}>
      {steps.map((s, i) => {
        const color = s.done ? T.green : s.active ? T.blue : T.inkSoft
        const iconBg = s.done ? 'rgba(5,150,105,0.1)' : s.active ? 'rgba(37,99,235,0.1)' : '#F1F5F9'
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.done
                  ? <Check size={15} color={T.green} strokeWidth={2.5} />
                  : <s.Icon size={15} color={color} strokeWidth={1.7} />}
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color, marginTop: 4, textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: 1.5, flex: 0.6, background: s.done ? T.green : '#E2E8F0', marginTop: 15, flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────
const EST_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#64748B', bg: '#F1F5F9' },
  sent:     { label: 'Sent',     color: '#D97706', bg: '#FFFBEB' },
  signed:   { label: 'Accepted', color: '#059669', bg: 'rgba(5,150,105,.1)' },
  invoiced: { label: 'Invoiced', color: '#7C3AED', bg: 'rgba(124,58,237,.1)' },
  declined: { label: 'Declined', color: '#DC2626', bg: '#FEF2F2' },
}
function Pill({ s }: { s: string }) {
  const st = EST_STATUS[s] ?? EST_STATUS.draft
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: st.color, background: st.bg, borderRadius: 6, padding: '3px 7px', flexShrink: 0,
    }}>
      {st.label}
    </span>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onViewEstimate }: { project: Project; onViewEstimate: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const a = project.appointment
  const e = project.estimate
  const upcoming = isUpcoming(a.appointment_date)

  const apptStatusLabel = a.status === 'completed' ? 'Done' : a.status === 'cancelled' ? 'Cancelled' : 'Scheduled'
  const dotColor = a.status === 'completed' ? T.green : a.status === 'cancelled' ? T.inkSoft : T.blue

  return (
    <div style={{ background: T.card, borderRadius: 14, boxShadow: `0 0 0 1px ${T.border}`, marginBottom: 10, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Date bubble */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: upcoming ? 'rgba(37,99,235,0.08)' : '#F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Calendar size={19} color={upcoming ? T.blue : T.inkSoft} strokeWidth={1.7} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
            {fmtDate(a.appointment_date)}
            {a.appointment_time ? <span style={{ fontWeight: 500, color: T.inkMid }}> · {fmt12h(a.appointment_time)}</span> : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.inkSoft }}>
              {[apptStatusLabel, a.lead_source].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {e && <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{fmtCAD(e.total || 0)}</div>}
          {e && <Pill s={e.status} />}
        </div>

        <div style={{ marginLeft: 4 }}>
          {open
            ? <ChevronUp size={16} color={T.inkSoft} />
            : <ChevronDown size={16} color={T.inkSoft} />}
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '14px 16px' }}>
          {e ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft }}>#{e.estimate_number}</span>
                <button
                  onClick={ev => { ev.stopPropagation(); onViewEstimate(e.id) }}
                  style={{ background: T.blue, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  View estimate →
                </button>
              </div>
              <StepTimeline project={project} />
            </>
          ) : (
            <div style={{ fontSize: 13, color: T.inkSoft, textAlign: 'center', padding: '8px 0' }}>
              No estimate linked to this appointment
            </div>
          )}
          {a.notes && (
            <div style={{ marginTop: 12, fontSize: 12, color: T.inkMid, background: '#F8FAFC', borderRadius: 9, padding: '10px 12px', lineHeight: 1.6 }}>
              {a.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params)
  const router   = useRouter()
  const supabase = createClient()

  const [client,       setClient]       = useState<Client | null>(null)
  const [projects,     setProjects]     = useState<Project[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [notes,        setNotes]        = useState('')
  const [notesSaved,   setNotesSaved]   = useState(false)
  const [notesSaving,  setNotesSaving]  = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: cl }, { data: appts }, { data: ests }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase.from('appointments')
          .select('id, appointment_date, appointment_time, status, notes, estimate_id, lead_source')
          .eq('client_id', clientId)
          .order('appointment_date', { ascending: false }),
        supabase.from('estimates')
          .select('id, estimate_number, status, total, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
      ])

      if (cl) { setClient(cl); setNotes(cl.notes || '') }
      const apptList = appts || []
      const estList  = ests  || []
      setAppointments(apptList)

      // Load contracts + invoices for all estimates
      const estimateIds = estList.map(e => e.id)
      const [{ data: contracts }, { data: invoices }] = estimateIds.length
        ? await Promise.all([
            supabase.from('contracts').select('id, estimate_id, status').in('estimate_id', estimateIds),
            supabase.from('invoices').select('id, estimate_id, amount, status, invoice_type').in('estimate_id', estimateIds),
          ])
        : [{ data: [] as Contract[] }, { data: [] as Invoice[] }]

      const contractMap = new Map<string, Contract>()
      for (const c of contracts || []) contractMap.set(c.estimate_id, c)

      const invoiceMap = new Map<string, { deposit: Invoice | null; final: Invoice | null }>()
      for (const inv of invoices || []) {
        const cur = invoiceMap.get(inv.estimate_id) ?? { deposit: null, final: null }
        if (inv.invoice_type === 'deposit') cur.deposit = inv
        else cur.final = inv
        invoiceMap.set(inv.estimate_id, cur)
      }

      const estById = new Map(estList.map(e => [e.id, e]))

      const built: Project[] = apptList.map(a => {
        const estimate = a.estimate_id ? (estById.get(a.estimate_id) ?? null) : null
        const invs     = estimate ? (invoiceMap.get(estimate.id) ?? { deposit: null, final: null }) : { deposit: null, final: null }
        return {
          appointment: a,
          estimate,
          contract: estimate ? (contractMap.get(estimate.id) ?? null) : null,
          depositInvoice: invs.deposit,
          finalInvoice:   invs.final,
        }
      })
      setProjects(built)
      setLoading(false)
    }
    load()
  }, [clientId])

  const saveNotes = useCallback(async () => {
    if (!client) return
    setNotesSaving(true)
    await supabase.from('clients').update({ notes }).eq('id', clientId)
    setNotesSaving(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2500)
  }, [notes, clientId, client])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkSoft, fontFamily: '"Inter", system-ui, sans-serif' }}>
      Loading…
    </div>
  )
  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.inkSoft, fontFamily: '"Inter", system-ui, sans-serif' }}>
      Client not found.
    </div>
  )

  // Computed values
  const initials = client.name.trim().split(/\s+/).filter(Boolean)
    .reduce((acc, p, i, arr) => i === 0 || i === arr.length - 1 ? acc + p[0].toUpperCase() : acc, '')

  const isRepeat   = appointments.length > 1
  const fullAddr   = [client.address, client.city, client.province, client.postal_code].filter(Boolean).join(', ')
  const visits     = appointments.length
  const lifetime   = projects.reduce((s, p) => s + (['signed', 'invoiced'].includes(p.estimate?.status || '') ? (p.estimate!.total || 0) : 0), 0)
  const totalEsts  = projects.filter(p => p.estimate).length
  const signedEsts = projects.filter(p => ['signed', 'invoiced'].includes(p.estimate?.status || '')).length
  const winRate    = totalEsts > 0 ? Math.round(signedEsts / totalEsts * 100) : null

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const nextVisit = [...appointments]
    .filter(a => new Date(a.appointment_date + 'T00:00:00') >= today && a.status !== 'cancelled')
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0] ?? null

  const newApptParams = new URLSearchParams({
    prefill_name:     client.name,
    prefill_phone:    client.phone    || '',
    prefill_email:    client.email    || '',
    prefill_address:  client.address  || '',
    prefill_city:     client.city     || '',
    prefill_province: client.province || '',
    prefill_postal:   client.postal_code || '',
    prefill_client_id: clientId,
  })

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <div style={{ background: T.hero, position: 'relative', overflow: 'hidden', paddingBottom: 28 }}>
        {/* glow blobs */}
        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,150,255,0.38) 0%, transparent 70%)', top: -130, right: -80, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)', bottom: -60, left: -40, pointerEvents: 'none' }} />

        {/* back */}
        <div style={{ padding: 'max(20px, calc(env(safe-area-inset-top) + 12px)) 16px 0', position: 'relative', zIndex: 2 }}>
          <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
        </div>

        {/* avatar + name + badge */}
        <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'flex-end', gap: 16, position: 'relative', zIndex: 2 }}>
          <div style={{ width: 66, height: 66, borderRadius: 22, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.5px' }}>
            {initials || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.15 }}>{client.name}</div>
              {isRepeat && (
                <div style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '2px 9px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
                  REPEAT
                </div>
              )}
            </div>
            {fullAddr && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullAddr}</span>
              </div>
            )}
          </div>
        </div>

        {/* stats strip */}
        <div style={{ margin: '20px 16px 0', background: 'rgba(0,0,0,0.18)', borderRadius: 16, padding: '14px 0', display: 'flex', position: 'relative', zIndex: 2 }}>
          {[
            { label: 'Visits',    value: String(visits) },
            { label: 'Lifetime',  value: fmtCAD(lifetime) },
            { label: 'Win rate',  value: winRate !== null ? `${winRate}%` : '—' },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Call / Text / Email */}
        <div style={{ margin: '14px 16px 0', display: 'flex', gap: 10, position: 'relative', zIndex: 2 }}>
          {[
            { label: 'Call',  href: `tel:${client.phone}`,    Icon: Phone,         show: !!client.phone  },
            { label: 'Text',  href: `sms:${client.phone}`,    Icon: MessageCircle, show: !!client.phone  },
            { label: 'Email', href: `mailto:${client.email}`, Icon: Mail,          show: !!client.email  },
          ].filter(b => b.show).map(b => (
            <a
              key={b.label} href={b.href}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 13, padding: '10px 8px', textDecoration: 'none' }}
            >
              <b.Icon size={18} color="#fff" strokeWidth={1.7} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>{b.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 14px 120px' }}>

        {/* Next visit */}
        {nextVisit && (
          <div style={{ background: T.blue, borderRadius: 16, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={20} color="#fff" strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>NEXT VISIT</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {fmtDate(nextVisit.appointment_date)}
                {nextVisit.appointment_time && (
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}> · {fmt12h(nextVisit.appointment_time)}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push(`/dashboard/appointments/${nextVisit.id}`)}
              style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              View
            </button>
          </div>
        )}

        {/* Contact details */}
        <div style={{ background: T.card, borderRadius: 16, boxShadow: `0 0 0 1px ${T.border}`, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.inkSoft }}>Contact</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            {client.phone && (
              <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={15} color={T.green} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{client.phone}</span>
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={15} color={T.blue} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</span>
              </a>
            )}
            {fullAddr && (
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddr)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textDecoration: 'none' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <MapPin size={15} color="#EA580C" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.45 }}>{fullAddr}</span>
              </a>
            )}
          </div>
        </div>

        {/* Notes — amber */}
        <div style={{ background: T.amberBg, borderRadius: 16, border: `1px solid ${T.amberBorder}`, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.amber }}>Notes</span>
            {notesSaved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.green }}>
                <Check size={13} strokeWidth={2.5} /> Saved
              </span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes about this client…"
            style={{
              width: '100%', minHeight: 96, border: 'none', outline: 'none', resize: 'vertical',
              padding: '12px 16px', fontSize: 14, color: T.ink, lineHeight: 1.6,
              fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box',
            }}
          />
          <div style={{ padding: '0 14px 12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveNotes} disabled={notesSaving}
              style={{ background: T.amber, border: 'none', borderRadius: 9, padding: '7px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: notesSaving ? 0.6 : 1, fontFamily: 'inherit' }}
            >
              {notesSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Project history */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.inkSoft, marginBottom: 10, paddingLeft: 2 }}>
            Project History · {projects.length}
          </div>
          {projects.length === 0 ? (
            <div style={{ background: T.card, borderRadius: 14, padding: '28px 16px', textAlign: 'center', fontSize: 13, color: T.inkSoft, boxShadow: `0 0 0 1px ${T.border}` }}>
              No projects yet
            </div>
          ) : (
            projects.map(p => (
              <ProjectCard
                key={p.appointment.id}
                project={p}
                onViewEstimate={id => router.push(`/dashboard/estimates/${id}`)}
              />
            ))
          )}
        </div>

      </div>

      {/* ── STICKY BUTTON ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        padding: '10px 14px',
        background: 'linear-gradient(to top, #F4F5F8 55%, rgba(244,245,248,0))',
        zIndex: 20,
      }}>
        <button
          onClick={() => router.push(`/dashboard/appointments/new?${newApptParams}`)}
          style={{
            width: '100%', background: T.blue, border: 'none', borderRadius: 14,
            padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.32)', fontFamily: 'inherit',
          }}
        >
          <Calendar size={16} strokeWidth={2} />
          New Appointment
        </button>
      </div>

    </div>
  )
}
