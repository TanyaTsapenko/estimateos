'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtCAD } from '@/lib/pricing'
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, ChevronRight, Check } from 'lucide-react'

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
  id: string; estimate_number: string; status: string
  total: number; created_at: string
}

const APPT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: '#2563EB', bg: '#EFF6FF' },
  completed:  { label: 'Done',      color: '#059669', bg: 'rgba(5,150,105,.1)' },
  cancelled:  { label: 'Cancelled', color: '#94A3B8', bg: '#F1F5F9' },
}
const EST_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#64748B', bg: '#F1F5F9' },
  sent:     { label: 'Sent',     color: '#D97706', bg: '#FFFBEB' },
  signed:   { label: 'Accepted', color: '#059669', bg: 'rgba(5,150,105,.1)' },
  invoiced: { label: 'Invoiced', color: '#7C3AED', bg: 'rgba(124,58,237,.1)' },
  declined: { label: 'Declined', color: '#DC2626', bg: '#FEF2F2' },
}

function fmt12h(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color, background: bg, borderRadius: 6, padding: '3px 8px' }}>
      {label}
    </span>
  )
}

export default function ClientDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const supabase  = createClient()
  const clientId  = Array.isArray(params?.id) ? params.id[0] : params?.id as string

  const [client,       setClient]       = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [estimates,    setEstimates]    = useState<Estimate[]>([])
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
      setAppointments(appts || [])
      setEstimates(ests || [])
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
    setTimeout(() => setNotesSaved(false), 2000)
  }, [notes, clientId, client])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontFamily: '"Inter", system-ui, sans-serif' }}>
      Loading…
    </div>
  )
  if (!client) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontFamily: '"Inter", system-ui, sans-serif' }}>
      Client not found.
    </div>
  )

  const initials = client.name.trim().split(/\s+/).filter(Boolean)
    .reduce((acc, p, i, arr) => i === 0 || i === arr.length - 1 ? acc + p[0].toUpperCase() : acc, '')

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="page-hd" style={{
        background: '#0A1628', padding: '16px 20px', display: 'flex',
        alignItems: 'center', gap: 14, position: 'sticky', top: 0,
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 8px))', zIndex: 10,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 9, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Client</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 100px' }}>

        {/* ── IDENTITY CARD ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(37,99,235,.12)', color: '#2563EB', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initials || '?'}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>{client.name}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Client since {fmtDate(client.created_at)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {client.phone && (
              <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={15} color="#059669" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#0A1628' }}>{client.phone}</span>
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={15} color="#2563EB" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</span>
              </a>
            )}
            {(client.address || client.city) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <MapPin size={15} color="#EA580C" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#0A1628', lineHeight: 1.4 }}>
                  {[client.address, client.city, client.province, client.postal_code].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── APPOINTMENTS ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} color="#2563EB" strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Appointments</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{appointments.length}</span>
          </div>
          {appointments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No appointments yet</div>
          ) : (
            appointments.map((a, i) => {
              const st = APPT_STATUS[a.status] ?? APPT_STATUS.scheduled
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/dashboard/appointments/${a.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < appointments.length - 1 ? '1px solid #F4F5F7' : 'none', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{fmtDate(a.appointment_date)}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      {[a.appointment_time ? fmt12h(a.appointment_time) : null, a.lead_source].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Pill label={st.label} color={st.color} bg={st.bg} />
                  <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                </div>
              )
            })
          )}
        </div>

        {/* ── ESTIMATES ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} color="#2563EB" strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Estimates</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{estimates.length}</span>
          </div>
          {estimates.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No estimates yet</div>
          ) : (
            estimates.map((e, i) => {
              const st = EST_STATUS[e.status] ?? EST_STATUS.draft
              return (
                <div
                  key={e.id}
                  onClick={() => router.push(`/dashboard/estimates/${e.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < estimates.length - 1 ? '1px solid #F4F5F7' : 'none', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{e.estimate_number}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{fmtDate(e.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>{fmtCAD(e.total || 0)}</div>
                    <div style={{ marginTop: 3 }}><Pill label={st.label} color={st.color} bg={st.bg} /></div>
                  </div>
                  <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                </div>
              )
            })
          )}
        </div>

        {/* ── NOTES ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Notes</span>
            {notesSaved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#059669' }}>
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
              width: '100%', minHeight: 120, border: 'none', outline: 'none', resize: 'vertical',
              padding: '14px 16px', fontSize: 14, color: '#0A1628', lineHeight: 1.6,
              fontFamily: 'inherit', background: 'transparent', boxSizing: 'border-box',
            }}
          />
          <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveNotes}
              disabled={notesSaving}
              style={{ background: '#2563EB', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: notesSaving ? 0.6 : 1 }}
            >
              {notesSaving ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
