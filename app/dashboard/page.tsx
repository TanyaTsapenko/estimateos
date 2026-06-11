'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Send as SendIcon, Plus, Check as CheckIcon, ChevronRight, CreditCard, CheckCircle, Clock as ClockIcon, Settings2, FileCheck, FileText, DollarSign, TrendingUp } from 'lucide-react'
import { usePermissions } from '@/lib/usePermissions'

interface Appointment {
  id: string; time: string; client: string; address: string; phone: string
  pillStatus: string; estimateId: string | null; duration: string
}
interface Metrics {
  revenueThisMonth: string; revenueDelta: string; revenueUp: boolean | null
  pipelineTotal: string; pipelineCount: string
  signedTodayTotal: string; signedTodayCount: number
  signaturesNeeded: number; conversionRate: number
  sparklines: { revenue: number[]; pipeline: number[]; signed: number[] }
}
interface AttentionItem {
  icon: React.ElementType; color: string; title: string; desc: string; cta: string
  id: string; actionType: 'reminder' | 'invoice' | 'mark_paid'; address?: string
  invoiceType?: 'deposit' | 'final'; estimateId?: string; createdAt?: string; priority: number
}
interface ActivityItem {
  event_type: string; actor_type: 'contractor' | 'client'; actor_name: string
  entity_id: string; entity_number: string; client_name: string; amount: number | null; time: string
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return (
    <svg width={64} height={22} viewBox="0 0 64 22" fill="none">
      <line x1="0" y1="11" x2="64" y2="11" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.25} />
    </svg>
  )
  const w = 64, h = 22
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  )
}

function KpiCard({ label, period, value, delta, deltaUp, accent, Icon, sparkData, empty, onClick }: {
  label: string; period: string; value: string; delta: string
  deltaUp?: boolean | null; accent: string; Icon: React.ElementType
  sparkData: number[]; empty?: boolean; onClick?: () => void
}) {
  const deltaColor = deltaUp === true ? '#0F8A6B' : deltaUp === false ? '#DC2626' : '#64748B'
  const deltaPrefix = deltaUp === true ? '↑ ' : deltaUp === false ? '↓ ' : ''
  return (
    <div className="db-kpi-card" onClick={onClick} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', flex: 1, overflow: 'hidden', minWidth: 150, cursor: onClick ? 'pointer' : undefined, transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1.5px rgba(10,22,40,0.14), 0 2px 8px rgba(10,22,40,0.07)' }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(10,22,40,0.06)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={accent} strokeWidth={1.7} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="db-kpi-label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', color: '#94A3B8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, whiteSpace: 'nowrap' }}>{period}</div>
        </div>
        <Sparkline data={sparkData} color={accent} />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginTop: 10 }}>
        {empty ? (
          <span style={{ fontSize: 15, fontWeight: 500, color: '#CBD5E1' }}>No data yet</span>
        ) : (
          <>
            <span className="db-kpi-value" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.6px', color: '#0A1628' }}>{value}</span>
            {delta && delta !== '—' && (
              <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', color: deltaColor }}>{deltaPrefix}{delta}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}


function apptPillStyle(status: string): React.CSSProperties {
  if (status === 'IN PROGRESS') return {
    background: 'rgba(37,99,235,.28)', border: '1px solid rgba(255,255,255,.4)', color: '#fff',
  }
  if (status === 'AWAITING SIGN') return {
    background: 'rgba(217,119,6,.3)', border: '1px solid rgba(217,119,6,.55)', color: '#FCD34D',
  }
  if (status === 'SIGNED') return {
    background: 'rgba(5,150,105,.3)', border: '1px solid rgba(5,150,105,.55)', color: '#6EE7B7',
  }
  return { background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)' }
}

function getTodayStr() {
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
}

const ACTIVITY_CFG: Record<string, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  estimate_sent:        { icon: SendIcon,    bg: '#EFF6FF', color: '#2563EB', label: 'sent estimate' },
  contract_signed:      { icon: FileCheck,   bg: '#ECFDF5', color: '#059669', label: 'signed contract' },
  deposit_invoice_sent: { icon: FileText,    bg: '#EFF6FF', color: '#2563EB', label: 'sent deposit invoice' },
  deposit_paid:         { icon: DollarSign,  bg: '#ECFDF5', color: '#059669', label: 'paid deposit' },
  final_paid:           { icon: CheckCircle, bg: '#ECFDF5', color: '#059669', label: 'paid in full' },
}

function fmtAmt(n: number) {
  return `CA$${n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const ESTIMATE_EVENTS = new Set(['estimate_sent', 'contract_signed', 'deposit_invoice_sent'])
const PAYMENT_EVENTS  = new Set(['deposit_paid', 'final_paid'])

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [showAllAttention, setShowAllAttention] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [activityFilter, setActivityFilter] = useState<'all' | 'estimates' | 'payments'>('all')
  const [isMobile, setIsMobile] = useState(false)
const [pricingMode, setPricingMode] = useState<string | null>(null)
  const [dashToast, setDashToast] = useState('')
  const [reminderSending, setReminderSending] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(false)
  const [checklistData, setChecklistData] = useState<{ logoUrl: string | null; contractTerms: string | null; hasPriceList: boolean } | null>(null)
  const [reminderModal, setReminderModal] = useState<{
    estimateId: string; estimateNumber: string; clientName: string
    clientEmail: string; address: string; message: string
  } | null>(null)
  const { role, permissions } = usePermissions()
  const isRestrictedRole = role === 'estimator' || role === 'admin'
  const router    = useRouter()
  const todayStr  = getTodayStr()
  const loadAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    supabase.from('profiles').select('pricing_mode, company_name, first_name, last_name, logo_url, contract_terms').eq('id', sanitizedId).single().then(async ({ data: prof }) => {
      if (prof) {
        setPricingMode((prof as any).pricing_mode || 'single')
        setCompanyName((prof as any).company_name || '')
        const full = [prof.first_name, prof.last_name].filter(Boolean).join(' ')
        if (full) setUserName(full)
        else {
          const meta = user.user_metadata
          if (meta?.full_name) setUserName(meta.full_name)
          else if (meta?.name) setUserName(meta.name)
          else if (user.email) setUserName(user.email.split('@')[0])
        }
      } else {
        const meta = user.user_metadata
        if (meta?.full_name) setUserName(meta.full_name)
        else if (meta?.name) setUserName(meta.name)
        else if (user.email) setUserName(user.email.split('@')[0])
      }
      const { data: pl } = await supabase.from('price_list').select('id').eq('user_id', sanitizedId).limit(1)
      setChecklistData({
        logoUrl: (prof as any)?.logo_url ?? null,
        contractTerms: (prof as any)?.contract_terms ?? null,
        hasPriceList: (pl?.length ?? 0) > 0,
      })
    })
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const { data: appts } = await supabase
        .from('appointments').select('id,client_name,client_address,client_phone,appointment_time,status,estimate_id,estimates(status)')
        .eq('user_id', sanitizedId).eq('appointment_date', today).order('appointment_time', { ascending: true }).limit(20)
      if (appts) {
        setAppointments(appts.map((a: any) => {
          const t = a.appointment_time || ''
          const [h, m] = t.split(':').map(Number)
          const ampm = h >= 12 ? 'PM' : 'AM'
          const h12 = h % 12 || 12
          const estStatus = (a.estimates as any)?.status || null
          let pillStatus = 'CONSULTATION'
          if (a.status === 'completed') pillStatus = 'DONE'
          else if (a.status === 'in_progress') pillStatus = 'IN PROGRESS'
          else if (a.estimate_id && ['signed', 'invoiced', 'paid'].includes(estStatus)) pillStatus = 'SIGNED'
          else if (a.estimate_id && ['draft', 'sent'].includes(estStatus)) pillStatus = 'AWAITING SIGN'
          else if (a.estimate_id && !estStatus) pillStatus = 'AWAITING SIGN'
          return {
            id: a.id,
            time: t ? `${h12}:${String(m).padStart(2,'0')} ${ampm}` : '--',
            client: a.client_name || 'Client',
            address: a.client_address || '',
            phone: a.client_phone || '',
            pillStatus,
            estimateId: a.estimate_id || null,
            duration: a.duration_minutes ? `${a.duration_minutes}m` : '60m',
          }
        }))
      }
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).toISOString()
      const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString()
      const todayUTC = new Date().toISOString().slice(0, 10)
      const [{ data: estAll }, { data: estSigned }, { data: estThisMonth }, { data: estLastMonth }, { data: pendingInvoices }, { data: finalPendingInvoices }, { data: activityLog }, { data: estPipeline }, { data: estSignedToday }] = await Promise.all([
        supabase.from('estimates').select('id,total,status,updated_at,created_at,sent_at,estimate_number,client_name').eq('user_id', sanitizedId).order('updated_at', { ascending: false }).limit(20),
        supabase.from('estimates').select('id,total,estimate_number,client_name,status').eq('user_id', sanitizedId).in('status', ['signed', 'accepted', 'invoiced']).order('created_at', { ascending: false }).limit(50),
        supabase.from('estimates').select('total,created_at,status').eq('user_id', sanitizedId).in('status', ['sent', 'signed', 'invoiced', 'paid']).gte('created_at', thisMonthStart),
        supabase.from('estimates').select('total').eq('user_id', sanitizedId).in('status', ['signed', 'invoiced', 'paid']).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
        supabase.from('invoices').select('id,invoice_number,amount,invoice_type,estimate_id,created_at').eq('user_id', sanitizedId).eq('status', 'pending').eq('invoice_type', 'deposit').order('created_at', { ascending: false }).limit(20),
        supabase.from('invoices').select('id,invoice_number,amount,invoice_type,estimate_id').eq('user_id', sanitizedId).eq('status', 'pending').eq('invoice_type', 'final').order('created_at', { ascending: false }).limit(10),
        supabase.from('activity_log').select('*').eq('user_id', sanitizedId).order('created_at', { ascending: false }).limit(20),
        supabase.from('estimates').select('id,total,status,created_at').eq('user_id', sanitizedId).in('status', ['draft', 'sent']),
        supabase.from('estimates').select('id,total,status,updated_at').eq('user_id', sanitizedId).in('status', ['signed', 'invoiced', 'paid']).gte('updated_at', todayUTC + 'T00:00:00.000Z'),
      ])
      const depositEstimateIds = (pendingInvoices || []).map((inv: any) => inv.estimate_id?.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')).filter(Boolean)
      const finalEstimateIds   = (finalPendingInvoices || []).map((inv: any) => inv.estimate_id?.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')).filter(Boolean)
      const allInvoiceEstimateIds = [...new Set([...depositEstimateIds, ...finalEstimateIds])]
      let clientNames: Record<string, string> = {}
      if (allInvoiceEstimateIds.length) {
        const { data: ests } = await supabase.from('estimates').select('id, client_name').in('id', allInvoiceEstimateIds)
        ests?.forEach((e: any) => { clientNames[e.id] = e.client_name })
      }
      const estimateIds = depositEstimateIds
      const signedThisMonth = (estThisMonth||[]).filter((e:any)=>['signed','invoiced','paid'].includes(e.status))
      const revenueThis = signedThisMonth.reduce((s:number,e:any)=>s+(e.total||0),0)
      const conversionRate = (estThisMonth||[]).length > 0 ? Math.round(signedThisMonth.length / (estThisMonth||[]).length * 100) : 0
      const revenueLast = (estLastMonth||[]).reduce((s:number,e:any)=>s+(e.total||0),0)
      const revenueDelta = revenueLast > 0 ? ((revenueThis-revenueLast)/revenueLast*100).toFixed(0) : null
      const openEstimates = estPipeline || []
      const pipelineTotal = openEstimates.reduce((s:number,e:any)=>s+(e.total||0),0)
      const signedTodayCount = (estSignedToday || []).length
      const signedTodayTotal = (estSignedToday || []).reduce((s:number,e:any)=>s+(e.total||0),0)
      const fmt = (n:number) => n===0?'CA$0':n>=1000?`CA$${(n/1000).toFixed(1)}k`:`CA$${n.toFixed(0)}`
      setMetrics({
        revenueThisMonth: fmt(revenueThis),
        revenueDelta: revenueDelta ? `${revenueDelta}%` : '—',
        revenueUp: revenueLast > 0 ? revenueThis >= revenueLast : null,
        pipelineTotal: fmt(pipelineTotal),
        pipelineCount: `${openEstimates.length} est.`,
        signedTodayTotal: fmt(signedTodayTotal),
        signedTodayCount,
        signaturesNeeded: (() => { const pendingEstimateIdsForMetrics = new Set((pendingInvoices || []).map((inv: any) => inv.estimate_id)); return (estSigned || []).filter((e: any) => ['signed','accepted'].includes(e.status) && !pendingEstimateIdsForMetrics.has(e.id)).length })(),
        conversionRate,
        sparklines: {
          revenue: [...signedThisMonth].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((e:any)=>e.total||0).slice(-8),
          pipeline: [...(estPipeline||[])].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((e:any)=>e.total||0).slice(-6),
          signed: [...(estSignedToday||[])].sort((a:any,b:any)=>new Date(a.updated_at).getTime()-new Date(b.updated_at).getTime()).map((e:any)=>e.total||0).slice(-6),
        },
      })

      const attItems: AttentionItem[] = []
      const pendingEstimateIds = new Set((pendingInvoices || []).map((inv: any) => inv.estimate_id))
      const finalEstimateIdSet = new Set((finalPendingInvoices || []).map((inv: any) => inv.estimate_id))
      // Signed/accepted estimates ready for final invoice (no pending final invoice yet)
      if (estSigned?.length) {
        estSigned.forEach((e: any) => {
          if (e.status === 'paid') return
          if (pendingEstimateIds.has(e.id)) return // deposit still pending, skip
          if (finalEstimateIdSet.has(e.id)) return // final invoice already exists
          attItems.push({
            icon: FileText, color: '#7C3AED',
            title: e.client_name,
            desc: `Ready for final invoice · ${e.estimate_number}${typeof e.total === 'number' ? ` · ${fmtAmt(e.total)}` : ''}`,
            cta: 'Send final invoice', id: e.id, actionType: 'invoice', priority: 2,
          })
        })
      }
      // Pending invoices (deposit unpaid)
      if (pendingInvoices?.length) {
        pendingInvoices.forEach((inv: any) => {
          const amt = typeof inv.amount === 'number' ? `CA$${inv.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
          const daysOld = Math.floor((Date.now() - new Date(inv.created_at).getTime()) / 86400000)
          attItems.push({
            icon: ClockIcon, color: '#D97706',
            title: clientNames[inv.estimate_id] || 'Client',
            desc: `Deposit pending · ${inv.invoice_number}${amt ? ` · ${amt}` : ''}`,
            cta: 'Mark as paid', id: inv.id, actionType: 'mark_paid',
            invoiceType: 'deposit' as const, createdAt: inv.created_at, priority: daysOld > 7 ? 0 : 3,
          })
        })
      }
      // Final invoices unpaid
      if (finalPendingInvoices?.length) {
        finalPendingInvoices.forEach((inv: any) => {
          const amt = typeof inv.amount === 'number' ? `CA$${inv.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
          attItems.push({
            icon: ClockIcon, color: '#059669',
            title: clientNames[inv.estimate_id] || 'Client',
            desc: `Final invoice pending · ${inv.invoice_number}${amt ? ` · ${amt}` : ''}`,
            cta: 'Mark final as paid', id: inv.id, actionType: 'mark_paid',
            invoiceType: 'final' as const,
            estimateId: inv.estimate_id, priority: 1,
          })
        })
      }
      // Stale sent estimate → blue, reminder
      const threeDaysAgo = new Date(Date.now() - 3*86400000).toISOString()
      const stale = (estAll||[]).filter((e:any) => e.status === 'sent' && (e.sent_at || e.created_at) < threeDaysAgo)
      stale.forEach((e: any) => {
        const sentDate = e.sent_at || e.updated_at
        const daysSince = Math.floor((Date.now() - new Date(sentDate).getTime()) / 86400000)
        attItems.push({
          icon: SendIcon, color: '#2563EB',
          title: e.client_name,
          desc: `${e.estimate_number} · ${daysSince} day${daysSince !== 1 ? 's' : ''}, no reply${typeof e.total === 'number' ? ` · ${fmtAmt(e.total)}` : ''}`,
          cta: 'Send reminder', id: e.id, actionType: 'reminder', priority: 4,
        })
      })
      attItems.sort((a, b) => a.priority - b.priority)
      setAttention(attItems)

      {
        const now = Date.now()
        const actTimeAgo = (iso: string) => { const d=Math.floor((now-new Date(iso).getTime())/86400000); const h=Math.floor((now-new Date(iso).getTime())/3600000); const m=Math.floor((now-new Date(iso).getTime())/60000); return m<60?`${m} min ago`:h<24?`${h}h ago`:d===1?'yesterday':`${d} days ago` }
        setActivity((activityLog || []).map((e: any) => ({
          event_type: e.event_type,
          actor_type: e.actor_type,
          actor_name: e.actor_name || (e.actor_type === 'contractor' ? 'You' : 'Client'),
          entity_id: e.entity_id || '',
          entity_number: e.entity_number || '',
          client_name: e.client_name || '',
          amount: e.amount ?? null,
          time: actTimeAgo(e.created_at),
        })))
      }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    setChecklistDismissed(localStorage.getItem('checklist_dismissed') === '1')
  }, [])

  useEffect(() => {
    const handleVisible = () => { if (!document.hidden) loadAll() }
    window.addEventListener('focus', loadAll)
    document.addEventListener('visibilitychange', handleVisible)
    return () => {
      window.removeEventListener('focus', loadAll)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [loadAll])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleMarkPaid(invoiceId: string, invoiceType?: string, estimateId?: string) {
    setPaying(invoiceId)
    const supabase = createClient()
    try {
      await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', invoiceId)
      if (invoiceType === 'final' && estimateId) {
        await supabase.from('estimates').update({ status: 'paid' }).eq('id', estimateId)
      }
      setAttention(prev => prev.filter(i => i.id !== invoiceId))
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        fetch('/api/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            event_type: invoiceType === 'final' ? 'final_paid' : 'deposit_paid',
            actor_type: 'client',
            entity_type: 'estimate',
            entity_id: estimateId || invoiceId,
          }),
        })
      }).catch(() => {})
      const emailType = invoiceType === 'final' ? 'final_receipt' : 'deposit_receipt'
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: emailType, invoiceId }),
        })
        const data = await res.json()
        console.log('[mark-paid] receipt email result:', res.status, data)
      } catch (err) {
        console.error('[mark-paid] receipt email error:', err)
      }
    } finally {
      setPaying(null)
    }
  }

  async function handleOpenReminder(estimateId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    const [{ data: est }, { data: prof }] = await Promise.all([
      supabase.from('estimates').select('client_name, client_email, client_address, estimate_number').eq('id', estimateId).single(),
      supabase.from('profiles').select('company_name').eq('id', sanitizedId).single(),
    ])
    if (!est) return
    const companyName = (prof as any)?.company_name || ''
    const address = est.client_address || ''
    const msg = `Hi ${est.client_name || 'there'},\n\nJust following up on your estimate ${est.estimate_number}${address ? ` for ${address}` : ''}. Let us know if you have any questions — we'd love to help!\n\n${companyName}`
    setReminderModal({
      estimateId,
      estimateNumber: est.estimate_number,
      clientName: est.client_name || 'Client',
      clientEmail: est.client_email || '',
      address,
      message: msg,
    })
  }

  async function handleSendReminder() {
    if (!reminderModal) return
    setReminderSending(true)
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: reminderModal.estimateId, type: 'reminder', message: reminderModal.message }),
      })
      setAttention(prev => prev.filter(i => i.id !== reminderModal.estimateId))
      setReminderModal(null)
      setDashToast('Reminder sent!')
      setTimeout(() => setDashToast(''), 2500)
    } finally {
      setReminderSending(false)
    }
  }

  const signaturesNeeded = metrics?.signaturesNeeded ?? 0
  const doneCount  = appointments.filter(a => a.pillStatus === 'DONE').length
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const nextAppt = appointments.find(a => {
    if (a.pillStatus === 'DONE') return false
    const timeParts = a.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!timeParts) return true
    let hours = parseInt(timeParts[1])
    const minutes = parseInt(timeParts[2])
    const ampm = timeParts[3].toUpperCase()
    if (ampm === 'PM' && hours !== 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    const apptMinutes = hours * 60 + minutes
    return apptMinutes >= currentMinutes - 30
  }) ?? null
  const otherAppts = appointments.filter(a => a.id !== nextAppt?.id)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0,
      background: '#F4F4F2', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif', minHeight: '100vh',
    }}>

      {/* ── DESKTOP HEADER ── */}
      {!isMobile && (
        <header style={{
          background: '#fff', borderBottom: '1px solid rgba(10,22,40,0.06)',
          padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ flex: 1 }}>
            {companyName && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#94A3B8', textTransform: 'uppercase' }}>{companyName}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#0A1628' }}>{userName || '—'}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 13, color: '#475569' }}>{todayStr}</span>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/estimates/new')} className="db-header-btn" style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#2045B8',
            color: '#fff', border: 'none', borderRadius: 9, padding: '8px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 6px 16px -6px rgba(32,69,184,0.5)',
          }}>
            <Plus size={14} strokeWidth={1.7} />
            New estimate
          </button>
        </header>
      )}

      {/* ── MOBILE GRADIENT HEADER + HERO ── */}
      {isMobile && (
        <div style={{
          background: 'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)',
          position: 'relative', overflow: 'visible', paddingBottom: 28,
        }}>
          {/* Glow blobs */}
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.45) 0%, transparent 70%)', top: -130, right: -100, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)', bottom: -60, left: -50, pointerEvents: 'none' }} />

          {/* Welcome row */}
          <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div>
              {companyName && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{companyName}</div>}
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginTop: 2 }}>{userName || '—'}</div>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings')}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <Settings2 size={18} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
            </button>
          </div>

          {/* Day + done count */}
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              YOUR DAY · {todayStr.toUpperCase()}
            </div>
            {appointments.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                {doneCount}/{appointments.length} done
              </div>
            )}
          </div>

          {/* Next appointment card */}
          <div style={{ margin: '14px 16px 0', position: 'relative', zIndex: 1 }}>
            {appointments.length === 0 ? (
              (() => {
                if (role === 'owner' && !checklistDismissed && checklistData) {
                  const clItems = [
                    { label: 'Company info',          done: true,                                    path: null as string | null },
                    { label: 'Add your logo',          done: !!checklistData.logoUrl,                path: '/dashboard/settings/company' },
                    { label: 'Set up contract terms',  done: !!(checklistData.contractTerms?.trim()), path: '/dashboard/settings/contract' },
                    { label: 'Build your price list',  done: checklistData.hasPriceList,             path: '/dashboard/price-list' },
                  ]
                  const clDone = clItems.filter(i => i.done).length
                  if (clDone < clItems.length) {
                    return (
                      <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Set up your business</div>
                          <button
                            onClick={() => { localStorage.setItem('checklist_dismissed', '1'); setChecklistDismissed(true) }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                          >
                            Dismiss
                          </button>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 4, marginBottom: 14 }}>
                          <div style={{ background: '#fff', borderRadius: 99, height: 4, width: `${clDone / clItems.length * 100}%`, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {clItems.map(item => (
                            <div
                              key={item.label}
                              onClick={() => item.path && !item.done && router.push(item.path)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: item.path && !item.done ? 'pointer' : 'default' }}
                            >
                              <div style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, border: item.done ? 'none' : '1.5px solid rgba(255,255,255,0.4)', background: item.done ? '#fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.done && (
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round">
                                    <polyline points="1.5 6 4.5 9 10.5 3"/>
                                  </svg>
                                )}
                              </div>
                              <span style={{ fontSize: 13, color: item.done ? 'rgba(255,255,255,0.45)' : '#fff', textDecoration: item.done ? 'line-through' : 'none', fontWeight: item.done ? 400 : 600, flex: 1 }}>
                                {item.label}
                              </span>
                              {!item.done && item.path && (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round">
                                  <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                }
                return (
                  <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>No visits today</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Tap + to add an appointment</div>
                  </div>
                )
              })()
            ) : nextAppt ? (
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.6px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: '2px 8px', display: 'inline-block', textTransform: 'uppercase', marginBottom: 8 }}>NEXT</span>
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1.5px' }}>{nextAppt.time}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: nextAppt.address ? 8 : 0 }}>{nextAppt.client}</div>
                    {nextAppt.address && (
                      <a href={`https://maps.apple.com/?q=${encodeURIComponent(nextAppt.address)}`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextAppt.address}</span>
                      </a>
                    )}
                  </div>
                  {nextAppt.phone ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <a href={`tel:${nextAppt.phone}`} onClick={e => e.stopPropagation()}
                        style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>
                        </svg>
                      </a>
                      <a href={`sms:${nextAppt.phone}`} onClick={e => e.stopPropagation()}
                        style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </a>
                    </div>
                  ) : <div style={{ width: 40, flexShrink: 0 }} />}
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>All visits complete for today!</div>
              </div>
            )}
          </div>

          {/* Other appointments */}
          {otherAppts.length > 0 && (
            <div style={{ margin: '10px 16px 0', position: 'relative', zIndex: 1 }}>
              {otherAppts.map(appt => {
                const isDone = appt.pillStatus === 'DONE'
                return (
                  <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', opacity: isDone ? 0.5 : 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', textDecoration: isDone ? 'line-through' : 'none', flexShrink: 0 }}>{appt.time}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.client}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
            {signaturesNeeded > 0 && (
              <button onClick={() => router.push('/dashboard/estimates?status=signed')}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {signaturesNeeded} ready to invoice
              </button>
            )}
            <button onClick={() => router.push('/dashboard/appointments')}
              style={{ padding: '10px 22px', borderRadius: 12, border: 'none', background: '#fff', color: '#2045B8', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={13} strokeWidth={2} />
              Open schedule
            </button>
          </div>
        </div>
      )}

      {/* ── DESKTOP HERO ── */}
      {!isMobile && (
        <div className="db-hero" style={{ margin: '20px 28px 0', borderRadius: 16, padding: 22, background: 'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.4) 0%, transparent 70%)', top: -180, right: -120, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div className="db-hero-kicker" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
                YOUR DAY · {todayStr.toUpperCase()}
              </div>
              {appointments.length === 0 ? (
                <>
                  <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6, opacity: 0.65 }}>
                    No appointments today{signaturesNeeded > 0 ? ` · ${signaturesNeeded} signature${signaturesNeeded !== 1 ? 's' : ''} pending` : ''}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    {signaturesNeeded > 0 ? `${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : 'Add your first appointment to get started.'}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 6 }}>
                    <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', color: '#fff' }}>
                      {appointments.length} visit{appointments.length !== 1 ? 's' : ''} today
                    </div>
                    {signaturesNeeded > 0 && (
                      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', color: '#FCD34D', marginTop: 2 }}>
                        {signaturesNeeded} signature{signaturesNeeded !== 1 ? 's' : ''} pending
                      </div>
                    )}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {appointments.length} stop{appointments.length !== 1 ? 's' : ''} · first at {appointments[0].time}, last at {appointments[appointments.length - 1].time}.{signaturesNeeded > 0 ? ` ${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : ''}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="db-appt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {appointments.map(appt => (
              <div key={appt.id} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{appt.time}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 500, marginTop: 4 }}>{appt.duration}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{appt.client}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{appt.address}</div>
                <div style={{ display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px', alignSelf: 'flex-start', borderRadius: 999, textTransform: 'uppercase', ...apptPillStyle(appt.pillStatus) }}>{appt.pillStatus}</div>
                <button
                  onClick={() => appt.estimateId ? router.push(`/dashboard/estimates/${appt.estimateId}`) : router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client)}&client_address=${encodeURIComponent(appt.address)}`)}
                  style={{ marginTop: 10, padding: '6px 0', width: '100%', background: appt.estimateId ? 'rgba(5,150,105,.25)' : 'rgba(255,255,255,.18)', border: `1px solid ${appt.estimateId ? 'rgba(5,150,105,.5)' : 'rgba(255,255,255,.35)'}`, borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  {appt.estimateId ? 'View EST →' : 'Start estimate'}
                </button>
              </div>
            ))}
            <div className="db-appt-add" style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.25)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 90 }}
              onClick={() => router.push('/dashboard/appointments/new')}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>+ add appointment</span>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <main className="db-main-body" style={{ padding: isMobile ? '16px 16px' : '20px 28px', paddingBottom: isMobile ? 'calc(88px + env(safe-area-inset-bottom))' : '32px', flex: 1 }}>

        {/* KPI row */}
        {!isRestrictedRole && (
        <div className="db-kpi-row" style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          <KpiCard
            label="REVENUE" period="This month"
            value={metrics?.revenueThisMonth ?? ''} delta={metrics?.revenueDelta ?? ''} deltaUp={metrics?.revenueUp ?? null}
            accent="#2045B8" Icon={CreditCard} sparkData={metrics?.sparklines.revenue ?? []} empty={!metrics}
            onClick={() => router.push('/dashboard/estimates?status=paid')}
          />
          <KpiCard
            label="IN PIPELINE" period="Open estimates"
            value={metrics?.pipelineTotal ?? ''} delta={metrics?.pipelineCount ?? ''} deltaUp={null}
            accent="#7C3AED" Icon={SendIcon} sparkData={metrics?.sparklines.pipeline ?? []} empty={!metrics}
            onClick={() => router.push('/dashboard/estimates?status=draft,sent')}
          />
          <KpiCard
            label="SIGNED TODAY" period="This month"
            value={metrics?.signedTodayTotal ?? ''} delta={`${metrics?.signedTodayCount ?? 0} today`} deltaUp={metrics ? (metrics.signedTodayCount > 0 ? true : null) : null}
            accent="#0F8A6B" Icon={CheckIcon} sparkData={metrics?.sparklines.signed ?? []} empty={!metrics}
            onClick={() => router.push('/dashboard/estimates?status=signed')}
          />
          <KpiCard
            label="CONVERSION" period="This month"
            value={metrics ? `${metrics.conversionRate}%` : ''} delta="" deltaUp={metrics ? (metrics.conversionRate > 50 ? true : metrics.conversionRate < 25 ? false : null) : null}
            accent={metrics ? (metrics.conversionRate > 50 ? '#0F8A6B' : metrics.conversionRate < 25 ? '#DC2626' : '#D97706') : '#94A3B8'}
            Icon={TrendingUp} sparkData={[]} empty={!metrics}
            onClick={() => router.push('/dashboard/estimates')}
          />
        </div>
        )}

        {/* ── MOBILE SECTIONS ── */}
        {isMobile ? (
          <>
            {/* Needs Attention */}
            {!isRestrictedRole && (<section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#2045B8', textTransform: 'uppercase', marginBottom: 2 }}>Needs Attention</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>
                {attention.length > 0 ? `${attention.length} item${attention.length !== 1 ? 's' : ''} waiting on you` : 'Nothing pending'}
              </div>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
                {attention.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                      <CheckCircle size={28} color="#10B981" strokeWidth={1.5} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 3 }}>All caught up!</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>No action items right now.</div>
                  </div>
                ) : attention.slice(0, showAllAttention ? attention.length : 7).map((item, i) => {
                  const visible = showAllAttention ? attention.length : Math.min(attention.length, 7)
                  return (
                  <div key={i} style={{ padding: '13px 16px', display: 'flex', gap: 11, alignItems: 'center', borderBottom: i < visible - 1 ? '1px solid #F1F5F9' : undefined }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={14} color={item.color} strokeWidth={1.7} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        {item.createdAt && (() => { const d = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000); return d > 7 ? <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' }}>{d} days overdue</span> : null })()}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                        else if (item.actionType === 'mark_paid') handleMarkPaid(item.id, item.invoiceType, item.estimateId)
                        else if (item.actionType === 'reminder') handleOpenReminder(item.id)
                        else router.push(`/dashboard/estimates/${item.id}`)
                      }}
                      disabled={item.actionType === 'mark_paid' && paying === item.id}
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: item.color, border: 'none', borderRadius: 8, cursor: item.actionType === 'mark_paid' && paying === item.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: item.actionType === 'mark_paid' && paying === item.id ? 0.6 : 1 }}>
                      {item.actionType === 'mark_paid' && paying === item.id ? 'Saving...' : item.cta}
                    </button>
                  </div>
                  )
                })}
              </div>
              {attention.length > 7 && (
                <button onClick={() => setShowAllAttention(v => !v)}
                  style={{ width: '100%', marginTop: 8, background: '#F8F9FC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {showAllAttention ? 'Show less' : `Show all (${attention.length})`}
                </button>
              )}
            </section>)}

            {/* Live Feed */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#2045B8', textTransform: 'uppercase', marginBottom: 2 }}>Live Feed</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Recent activity</div>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0' }}>
                  {(['all', 'estimates', 'payments'] as const).map(tab => (
                    <button key={tab} onClick={() => setActivityFilter(tab)} style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', background: activityFilter === tab ? '#2045B8' : '#F1F5F9', color: activityFilter === tab ? '#fff' : '#64748B' }}>
                      {tab === 'all' ? 'All' : tab === 'estimates' ? 'Estimates' : 'Payments'}
                    </button>
                  ))}
                </div>
                {(() => {
                  const filtered = activityFilter === 'estimates' ? activity.filter(a => ESTIMATE_EVENTS.has(a.event_type)) : activityFilter === 'payments' ? activity.filter(a => PAYMENT_EVENTS.has(a.event_type)) : activity
                  if (filtered.length === 0) return (
                    <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 8 }}>
                      No activity yet. Send your first estimate to get started.
                    </div>
                  )
                  return (<>
                    <div style={{ marginTop: 8 }}>
                      {filtered.slice(0, showAllActivity ? filtered.length : 5).map((item, i, arr) => {
                        const cfg = ACTIVITY_CFG[item.event_type] || { icon: ClockIcon, bg: '#F1F5F9', color: '#94A3B8', label: 'updated' }
                        const actorLabel = item.actor_type === 'contractor' ? 'You' : item.actor_name
                        const sub = [item.entity_number, item.amount != null ? fmtAmt(item.amount) : null, item.actor_type === 'contractor' && item.client_name ? item.client_name : null].filter(Boolean).join(' · ')
                        return (
                          <div key={i} style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : undefined, cursor: 'pointer' }}
                            onClick={() => item.entity_id && router.push(`/dashboard/estimates/${item.entity_id}`)}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <cfg.icon size={16} color={cfg.color} strokeWidth={1.8} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actorLabel} {cfg.label}</div>
                              {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</div>
                            <ChevronRight size={13} color="#CBD5E1" strokeWidth={2} />
                          </div>
                        )
                      })}
                    </div>
                    {filtered.length > 5 && (
                      <div style={{ padding: '8px 12px 12px' }}>
                        <button onClick={() => setShowAllActivity(v => !v)} style={{ width: '100%', background: '#F8F9FC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {showAllActivity ? 'Show less' : `Show all (${filtered.length})`}
                        </button>
                      </div>
                    )}
                  </>)
                })()}
              </div>
            </section>

          </>
        ) : (
          /* ── DESKTOP TWO-COLUMN LOWER ROW ── */
          <div className="db-lower-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Needs attention */}
            {!isRestrictedRole && (<div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
              <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
                <div className="db-panel-title" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#2045B8', textTransform: 'uppercase' }}>Needs Attention</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {attention.length > 0 ? `${attention.length} item${attention.length !== 1 ? 's' : ''} waiting on you` : 'Nothing pending'}
                </div>
              </div>
              {attention.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <CheckCircle size={32} color="#10B981" strokeWidth={1.5} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 4 }}>All caught up!</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>No action items right now.</div>
                </div>
              ) : attention.slice(0, showAllAttention ? attention.length : 7).map((item, i) => {
                const visible = showAllAttention ? attention.length : Math.min(attention.length, 7)
                return (
                <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 11, alignItems: 'center', borderBottom: i < visible - 1 ? '1px solid #EEF0F4' : undefined }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={14} color={item.color} strokeWidth={1.7} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      {item.createdAt && (() => { const d = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 86400000); return d > 7 ? <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', borderRadius: 5, padding: '2px 6px', whiteSpace: 'nowrap' }}>{d} days overdue</span> : null })()}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                      else if (item.actionType === 'mark_paid') handleMarkPaid(item.id, item.invoiceType, item.estimateId)
                      else if (item.actionType === 'reminder') handleOpenReminder(item.id)
                      else router.push(`/dashboard/estimates/${item.id}`)
                    }}
                    disabled={item.actionType === 'mark_paid' && paying === item.id}
                    style={{ padding: '5px 11px', fontSize: 12, fontWeight: 700, color: '#fff', background: item.color, border: 'none', borderRadius: 7, cursor: item.actionType === 'mark_paid' && paying === item.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: item.actionType === 'mark_paid' && paying === item.id ? 0.6 : 1 }}>
                    {item.actionType === 'mark_paid' && paying === item.id ? 'Saving...' : item.cta}
                  </button>
                </div>
                )
              })}
              {attention.length > 7 && (
                <div style={{ padding: '8px 12px 12px' }}>
                  <button onClick={() => setShowAllAttention(v => !v)}
                    style={{ width: '100%', background: '#F8F9FC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {showAllAttention ? 'Show less' : `Show all (${attention.length})`}
                  </button>
                </div>
              )}
            </div>)}

            {/* Live Feed / Recent activity */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
              <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
                <div className="db-panel-title" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#2045B8', textTransform: 'uppercase' }}>Live Feed</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Recent activity</div>
              </div>
              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: 4, padding: '10px 16px 0' }}>
                {(['all', 'estimates', 'payments'] as const).map(tab => (
                  <button key={tab} onClick={() => setActivityFilter(tab)} style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', background: activityFilter === tab ? '#2045B8' : '#F1F5F9', color: activityFilter === tab ? '#fff' : '#64748B' }}>
                    {tab === 'all' ? 'All' : tab === 'estimates' ? 'Estimates' : 'Payments'}
                  </button>
                ))}
              </div>
              {(() => {
                const filtered = activityFilter === 'estimates' ? activity.filter(a => ESTIMATE_EVENTS.has(a.event_type)) : activityFilter === 'payments' ? activity.filter(a => PAYMENT_EVENTS.has(a.event_type)) : activity
                if (filtered.length === 0) return (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 8 }}>
                    No activity yet. Send your first estimate to get started.
                  </div>
                )
                return (<>
                  <div style={{ marginTop: 8 }}>
                    {filtered.slice(0, showAllActivity ? filtered.length : 5).map((item, i, arr) => {
                      const cfg = ACTIVITY_CFG[item.event_type] || { icon: ClockIcon, bg: '#F1F5F9', color: '#94A3B8', label: 'updated' }
                      const actorLabel = item.actor_type === 'contractor' ? 'You' : item.actor_name
                      const sub = [item.entity_number, item.amount != null ? fmtAmt(item.amount) : null, item.actor_type === 'contractor' && item.client_name ? item.client_name : null].filter(Boolean).join(' · ')
                      return (
                        <div key={i} style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: i < arr.length - 1 ? '1px solid #EEF0F4' : undefined, cursor: 'pointer' }}
                          onClick={() => item.entity_id && router.push(`/dashboard/estimates/${item.entity_id}`)}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <cfg.icon size={16} color={cfg.color} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actorLabel} {cfg.label}</div>
                            {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</div>
                          <ChevronRight size={13} color="#CBD5E1" strokeWidth={2} />
                        </div>
                      )
                    })}
                  </div>
                  {filtered.length > 5 && (
                    <div style={{ padding: '8px 12px 12px' }}>
                      <button onClick={() => setShowAllActivity(v => !v)} style={{ width: '100%', background: '#F8F9FC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {showAllActivity ? 'Show less' : `Show all (${filtered.length})`}
                      </button>
                    </div>
                  )}
                </>)
              })()}
            </div>


          </div>
        )}

      {/* ── REMINDER MODAL ── */}
      {reminderModal && (
        <div
          onClick={() => setReminderModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560, margin: '0 auto',
              background: '#fff', borderRadius: '24px 24px 0 0',
              padding: '12px 20px calc(env(safe-area-inset-bottom) + 24px)',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            {/* Handle bar */}
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#E2E8F0', margin: '0 auto 20px' }} />

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.3px' }}>Send Reminder</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                {reminderModal.estimateNumber} · {reminderModal.clientName}
              </div>
            </div>

            {/* TO field */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>TO</div>
              <div style={{
                background: '#F8FAFC', border: '1.5px solid #E5E7EB', borderRadius: 10,
                padding: '11px 14px', fontSize: 14, color: '#475569',
              }}>
                {reminderModal.clientEmail || '(no email on file)'}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>MESSAGE</div>
              <textarea
                value={reminderModal.message}
                onChange={e => setReminderModal(m => m ? { ...m, message: e.target.value } : m)}
                rows={6}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid #E5E7EB', borderRadius: 10,
                  padding: '11px 14px', fontSize: 14, lineHeight: 1.55,
                  fontFamily: '"Inter", system-ui, sans-serif', color: '#0A1628',
                  background: '#fff', resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setReminderModal(null)}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 600,
                  background: '#fff', border: '1.5px solid #E5E7EB', color: '#64748B',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={reminderSending}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700,
                  background: reminderSending ? '#93C5FD' : '#2563EB', color: '#fff',
                  border: 'none', cursor: reminderSending ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {reminderSending ? 'Sending…' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {dashToast && (
        <div style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 90px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#0A1628', color: '#fff', borderRadius: 99,
          padding: '10px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', zIndex: 200,
          whiteSpace: 'nowrap',
        }}>
          {dashToast}
        </div>
      )}

      </main>
    </div>
  )
}
