'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Send as SendIcon, Plus, Check as CheckIcon, ChevronRight, CreditCard, CheckCircle, Clock as ClockIcon, FileCheck, FileText, DollarSign, TrendingUp, PenLine, Receipt, Bell, Activity, AlertTriangle } from 'lucide-react'
import { usePermissions } from '@/lib/usePermissions'
import { getTeamUserIds } from '@/lib/teamScope'
import BellButton, { type AppNotification } from '@/components/BellButton'
import AppTopBar from '@/components/AppTopBar'

interface Appointment {
  id: string; time: string; endTime: string; client: string; address: string; phone: string
  pillStatus: string; estimateId: string | null; duration: string
  userId: string; repName: string
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
  amount?: number; entityNumber?: string
  lastReminderSentAt?: string | null; reminderCount?: number; ctaDisabled?: boolean
}
interface ActivityItem {
  event_type: string; actor_type: 'contractor' | 'client'; actor_name: string
  entity_id: string; entity_number: string; client_name: string; amount: number | null; time: string
}

const REP_GRADIENTS = [
  'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)',
  'linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)',
  'linear-gradient(135deg,#059669 0%,#047857 100%)',
  'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)',
  'linear-gradient(135deg,#D97706 0%,#B45309 100%)',
]

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `CA$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `CA$${Math.round(n / 1_000)}K`
  return `CA$${Math.round(n)}`
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
    background: 'rgba(249,115,22,.25)', border: '1px solid rgba(249,115,22,.5)', color: '#FED7AA',
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
  estimate_sent:               { icon: SendIcon,       bg: '#EFF6FF', color: '#2563EB', label: 'sent estimate' },
  contract_sent:               { icon: PenLine,        bg: '#EFF6FF', color: '#2563EB', label: 'sent contract' },
  contract_signed:             { icon: FileCheck,      bg: '#ECFDF5', color: '#059669', label: 'signed contract' },
  estimate_signed:             { icon: PenLine,        bg: '#EFEAFC', color: '#6D45D9', label: 'signed estimate' },
  deposit_invoice_sent:        { icon: FileText,       bg: '#EFF6FF', color: '#2563EB', label: 'sent deposit invoice' },
  deposit_paid:                { icon: DollarSign,     bg: '#ECFDF5', color: '#059669', label: 'paid deposit' },
  final_invoice_sent:          { icon: FileText,       bg: '#EFF6FF', color: '#2563EB', label: 'sent final invoice' },
  final_paid:                  { icon: CheckCircle,    bg: '#ECFDF5', color: '#059669', label: 'paid in full' },
  reminder_sent:               { icon: SendIcon,       bg: '#EFF6FF', color: '#2563EB', label: 'sent reminder' },
  estimate_auto_expired:       { icon: ClockIcon,      bg: '#FEF3C7', color: '#D97706', label: 'estimate expired (no response)' },
  deposit_invoice_failed:      { icon: AlertTriangle,  bg: '#FEF2F2', color: '#DC2626', label: 'failed to send deposit invoice' },
  deposit_invoice_email_failed:{ icon: AlertTriangle,  bg: '#FEF2F2', color: '#DC2626', label: 'failed to deliver deposit email' },
}

const EVENT_TONE: Record<string, { bg: string; color: string }> = {
  estimate_sent:               { bg: '#EEF3FF', color: '#2563EB' },
  contract_sent:               { bg: '#EEF3FF', color: '#2563EB' },
  contract_signed:             { bg: '#EFEAFC', color: '#6D45D9' },
  estimate_signed:             { bg: '#EFEAFC', color: '#6D45D9' },
  deposit_invoice_sent:        { bg: '#EEF3FF', color: '#2563EB' },
  deposit_paid:                { bg: '#E7F6EE', color: '#0F8A4D' },
  final_invoice_sent:          { bg: '#EEF3FF', color: '#2563EB' },
  final_paid:                  { bg: '#E7F6EE', color: '#0F8A4D' },
  reminder_sent:               { bg: '#EEF3FF', color: '#2563EB' },
  estimate_auto_expired:       { bg: '#FBF1DC', color: '#B7791F' },
  deposit_invoice_failed:      { bg: '#FEE2E2', color: '#DC2626' },
  deposit_invoice_email_failed:{ bg: '#FEE2E2', color: '#DC2626' },
}
const EVENT_ICONS: Record<string, React.ElementType> = {
  estimate_sent:               SendIcon,
  contract_sent:               PenLine,
  contract_signed:             PenLine,
  estimate_signed:             PenLine,
  deposit_invoice_sent:        Receipt,
  deposit_paid:                CheckCircle,
  final_invoice_sent:          Receipt,
  final_paid:                  CheckCircle,
  reminder_sent:               Bell,
  estimate_auto_expired:       ClockIcon,
  deposit_invoice_failed:      AlertTriangle,
  deposit_invoice_email_failed:AlertTriangle,
}
function getDealAccent(eventType: string): string {
  if (eventType === 'deposit_paid' || eventType === 'final_paid') return '#0F8A4D'
  if (eventType === 'contract_signed') return '#6D45D9'
  if (eventType === 'estimate_auto_expired') return '#B7791F'
  return '#2563EB'
}

function fmtAmt(n: number) {
  return `CA$${n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function nth(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  const r = n % 10
  if (r === 1) return `${n}st`
  if (r === 2) return `${n}nd`
  if (r === 3) return `${n}rd`
  return `${n}th`
}

const INVOICE_EVENTS  = new Set(['deposit_paid', 'final_paid', 'final_invoice_sent', 'deposit_invoice_sent'])

type ActivityGroup = {
  entity_id: string
  entity_number: string
  client_name: string
  items: ActivityItem[]   // newest-first
}

const STATUS_PRIORITY: Record<string, number> = {
  final_paid: 10, deposit_paid: 8, contract_signed: 6,
  final_invoice_sent: 4, deposit_invoice_sent: 4,
  reminder_sent: 2, estimate_sent: 1, estimate_auto_expired: 0,
}
const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  final_paid:           { label: 'Paid in full', bg: '#ECFDF5', color: '#059669' },
  contract_signed:      { label: 'Signed',        bg: '#ECFDF5', color: '#059669' },
  deposit_paid:         { label: 'Deposit paid',  bg: '#ECFDF5', color: '#059669' },
  deposit_invoice_sent: { label: 'Invoice sent',  bg: '#EFF6FF', color: '#2563EB' },
  final_invoice_sent:   { label: 'Invoice sent',  bg: '#EFF6FF', color: '#2563EB' },
  reminder_sent:        { label: 'Reminder sent', bg: '#EFF6FF', color: '#2563EB' },
  estimate_sent:        { label: 'Estimate sent', bg: '#EFF6FF', color: '#2563EB' },
  estimate_auto_expired:{ label: 'Expired',       bg: '#FEF3C7', color: '#D97706' },
}

// Events whose amount represents the full estimate total (not a partial payment)
const TOTAL_AMOUNT_EVENTS = new Set(['estimate_sent', 'contract_signed'])

function groupActivity(items: ActivityItem[]): ActivityGroup[] {
  // items arrive newest-first from DB; Map preserves insertion order
  const byKey = new Map<string, ActivityGroup>()
  for (const item of items) {
    // Non-estimate events (no entity_id) each get a unique key so they stay solo
    const key = item.entity_id || `__solo__${item.event_type}__${item.time}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        entity_id:     item.entity_id,
        entity_number: item.entity_number,
        client_name:   item.client_name,
        items:         [],
      })
    }
    byKey.get(key)!.items.push(item)
  }
  // Insertion order = order of first appearance in newest-first list = most-recent-first
  return Array.from(byKey.values())
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [showAllAttention, setShowAllAttention] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [openDealIdx, setOpenDealIdx] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
const [dashToast, setDashToast] = useState('')
  const [viewedByEstimate, setViewedByEstimate] = useState<Record<string, string>>({})
  const [reminderSending, setReminderSending] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(false)
  const [checklistData, setChecklistData] = useState<{ logoUrl: string | null; contractTerms: string | null; hasPriceList: boolean } | null>(null)
  const [reminderModal, setReminderModal] = useState<{
    estimateId: string; estimateNumber: string; clientName: string
    clientEmail: string; address: string; message: string; reminderCount: number; maxCount: number
  } | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [currentUserId, setCurrentUserId] = useState('')
  const { role, permissions } = usePermissions()
  const isRestrictedRole = role === 'estimator' || role === 'admin'
  const [isOwnerOrManager, setIsOwnerOrManager] = useState(false)
  const [repFilter, setRepFilter] = useState<string>('all')
  const [repNames, setRepNames] = useState<Record<string, string>>({})
  const [repSignedTotals, setRepSignedTotals] = useState<Record<string, number>>({})
  const router    = useRouter()
  const todayStr  = getTodayStr()
  const loadAll = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sanitizedId = user.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    setCurrentUserId(sanitizedId)
    const { userIds, isOwnerOrManager: ownerOrManager } = await getTeamUserIds(supabase, user.id)
    console.log('Team userIds:', userIds, 'isOwnerOrManager:', ownerOrManager)
    setIsOwnerOrManager(ownerOrManager)
    supabase.from('notifications').select('*').in('user_id', userIds).order('created_at', { ascending: false }).limit(50)
      .then(({ data }: any) => { if (data) setNotifications(data as AppNotification[]) })
    supabase.from('notifications').select('*', { count: 'exact', head: true }).in('user_id', userIds).eq('read', false)
      .then(({ count }: any) => setUnreadCount(count ?? 0))
    const nameMap: Record<string, string> = {}
    if (ownerOrManager && userIds.length > 1) {
      const { data: teamProfs } = await supabase
        .from('profiles').select('id, first_name, last_name, company_name').in('id', userIds)
      for (const p of teamProfs || []) {
        nameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.company_name || 'Rep'
      }
      setRepNames(nameMap)
    }
    supabase.from('profiles').select('company_name, first_name, last_name, logo_url, contract_terms').eq('id', sanitizedId).single().then(async ({ data: prof }: any) => {
      if (prof) {
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
      const { data: pl } = await supabase.from('price_lists').select('id').eq('user_id', sanitizedId).limit(1)
      setChecklistData({
        logoUrl: (prof as any)?.logo_url ?? null,
        contractTerms: (prof as any)?.contract_terms ?? null,
        hasPriceList: (pl?.length ?? 0) > 0,
      })
    })
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const { data: appts } = await supabase
        .from('appointments').select('id,user_id,assigned_to,client_name,client_address,client_phone,appointment_time,appointment_end_time,status,estimate_id,estimates!appointments_estimate_id_fkey(status)')
        .or(`user_id.in.(${userIds.join(',')}),assigned_to.in.(${userIds.join(',')})`)
        .eq('appointment_date', today).order('appointment_time', { ascending: true }).limit(20)
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
          const et = a.appointment_end_time || ''
          const [eh, em] = et ? et.split(':').map(Number) : [0, 0]
          const eAmpm = eh >= 12 ? 'PM' : 'AM'
          const eh12 = eh % 12 || 12
          return {
            id: a.id,
            time: t ? `${h12}:${String(m).padStart(2,'0')} ${ampm}` : '--',
            endTime: et ? `${eh12}:${String(em).padStart(2,'0')} ${eAmpm}` : '',
            client: a.client_name || 'Client',
            address: a.client_address || '',
            phone: a.client_phone || '',
            pillStatus,
            estimateId: a.estimate_id || null,
            duration: a.duration_minutes ? `${a.duration_minutes}m` : '60m',
            userId: a.assigned_to || a.user_id || '',
            repName: nameMap[a.assigned_to] || nameMap[a.user_id] || '',
          }
        }))
      }
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).toISOString()
      const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString()
      const todayUTC = new Date().toISOString().slice(0, 10)
      const [{ data: estAll }, { data: estSigned }, { data: estThisMonth }, { data: estLastMonth }, { data: pendingInvoices }, { data: finalPendingInvoices }, { data: activityLog }, { data: estPipeline }, { data: estSignedToday }, { data: remProfile }, { data: allDepositInvoices }] = await Promise.all([
        supabase.from('estimates').select('id,total,status,updated_at,created_at,sent_at,estimate_number,client_name,last_reminder_sent_at,reminder_count,viewed_at').in('user_id', userIds).order('updated_at', { ascending: false }).limit(20),
        supabase.from('estimates').select('id,total,estimate_number,client_name,status,user_id').in('user_id', userIds).in('status', ['signed', 'accepted', 'invoiced']).order('created_at', { ascending: false }).limit(50),
        supabase.from('estimates').select('total,created_at,status').in('user_id', userIds).in('status', ['sent', 'signed', 'invoiced', 'paid']).gte('created_at', thisMonthStart),
        supabase.from('estimates').select('total').in('user_id', userIds).in('status', ['signed', 'invoiced', 'paid']).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
        supabase.from('invoices').select('id,invoice_number,amount,invoice_type,estimate_id,created_at').in('user_id', userIds).eq('status', 'pending').eq('invoice_type', 'deposit').order('created_at', { ascending: false }).limit(20),
        supabase.from('invoices').select('id,invoice_number,amount,invoice_type,estimate_id').in('user_id', userIds).eq('status', 'pending').eq('invoice_type', 'final').order('created_at', { ascending: false }).limit(10),
        supabase.from('activity_log').select('*').in('user_id', userIds).order('created_at', { ascending: false }).limit(20),
        supabase.from('estimates').select('id,total,status,created_at').in('user_id', userIds).in('status', ['draft', 'sent']),
        supabase.from('estimates').select('id,total,status,updated_at').in('user_id', userIds).in('status', ['signed', 'invoiced', 'paid']).gte('updated_at', todayUTC + 'T00:00:00.000Z'),
        supabase.from('profiles').select('quote_settings').eq('id', sanitizedId).single(),
        supabase.from('invoices').select('estimate_id').in('user_id', userIds).eq('invoice_type', 'deposit').limit(200),
      ])
      const depositEstimateIds = (pendingInvoices || []).map((inv: any) => inv.estimate_id?.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')).filter(Boolean)
      const finalEstimateIds   = (finalPendingInvoices || []).map((inv: any) => inv.estimate_id?.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')).filter(Boolean)
      const allInvoiceEstimateIds = [...new Set([...depositEstimateIds, ...finalEstimateIds])]
      let clientNames: Record<string, string> = {}
      let entityNumbers: Record<string, string> = {}
      if (allInvoiceEstimateIds.length) {
        const { data: ests } = await supabase.from('estimates').select('id, client_name, estimate_number').in('id', allInvoiceEstimateIds)
        ests?.forEach((e: any) => { clientNames[e.id] = e.client_name; entityNumbers[e.id] = e.estimate_number })
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
        signaturesNeeded: (() => { const pendingEstimateIdsForMetrics = new Set((pendingInvoices || []).map((inv: any) => inv.estimate_id)); const finalEstimateIdsForMetrics = new Set(finalEstimateIds); return (estSigned || []).filter((e: any) => ['signed','accepted'].includes(e.status) && !pendingEstimateIdsForMetrics.has(e.id) && !finalEstimateIdsForMetrics.has(e.id)).length })(),
        conversionRate,
        sparklines: {
          revenue: [...signedThisMonth].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((e:any)=>e.total||0).slice(-8),
          pipeline: [...(estPipeline||[])].sort((a:any,b:any)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((e:any)=>e.total||0).slice(-6),
          signed: [...(estSignedToday||[])].sort((a:any,b:any)=>new Date(a.updated_at).getTime()-new Date(b.updated_at).getTime()).map((e:any)=>e.total||0).slice(-6),
        },
      })

      const signedByRep: Record<string, number> = {}
      for (const e of estSigned || []) {
        const uid = (e as any).user_id
        if (uid) signedByRep[uid] = (signedByRep[uid] || 0) + ((e as any).total || 0)
      }
      setRepSignedTotals(signedByRep)

      const attItems: AttentionItem[] = []
      const pendingEstimateIds = new Set((pendingInvoices || []).map((inv: any) => inv.estimate_id))
      const finalEstimateIdSet = new Set((finalPendingInvoices || []).map((inv: any) => inv.estimate_id))
      const allDepositEstimateIds = new Set((allDepositInvoices || []).map((inv: any) => inv.estimate_id))
      // Signed/accepted estimates ready for final invoice (no pending final invoice yet)
      if (estSigned?.length) {
        estSigned.forEach((e: any) => {
          if (e.status === 'paid') return
          if (pendingEstimateIds.has(e.id)) return // deposit invoice pending payment
          if (!allDepositEstimateIds.has(e.id)) return // no deposit invoice row at all → treat as deposit pending
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
            amount: inv.amount, entityNumber: entityNumbers[inv.estimate_id],
            estimateId: inv.estimate_id,
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
            amount: inv.amount, entityNumber: entityNumbers[inv.estimate_id],
          })
        })
      }
      // Stale sent estimate → blue, reminder
      const reminders = (remProfile as any)?.quote_settings?.reminders
      const firstAfterDays: number = reminders?.first_after_days ?? 2
      const secondAfterDays: number = reminders?.second_after_days ?? 3
      const maxCount: number = reminders?.max_count ?? 3
      const stale = (estAll||[]).filter((e:any) => {
        if (e.status !== 'sent') return false
        const count = e.reminder_count ?? 0
        if (count >= maxCount) return false
        if (count === 0) return new Date(e.sent_at || e.created_at).getTime() < Date.now() - firstAfterDays * 86400000
        return !!e.last_reminder_sent_at && new Date(e.last_reminder_sent_at).getTime() < Date.now() - secondAfterDays * 86400000
      })
      stale.forEach((e: any) => {
        const sentDate = e.sent_at || e.created_at
        const daysSince = Math.floor((Date.now() - new Date(sentDate).getTime()) / 86400000)
        const viewedDesc = e.viewed_at
          ? (() => { const vd = Math.floor((Date.now() - new Date(e.viewed_at).getTime()) / 86400000); return `viewed ${vd === 0 ? 'today' : vd === 1 ? 'yesterday' : `${vd}d ago`}, no reply` })()
          : 'never opened'
        const inCooldown = !!e.last_reminder_sent_at && (Date.now() - new Date(e.last_reminder_sent_at).getTime()) < 24 * 3600000
        const hrsSinceReminder = e.last_reminder_sent_at ? Math.floor((Date.now() - new Date(e.last_reminder_sent_at).getTime()) / 3600000) : 0
        attItems.push({
          icon: SendIcon, color: '#2563EB',
          title: e.client_name,
          desc: `${e.estimate_number} · ${daysSince} day${daysSince !== 1 ? 's' : ''}, ${viewedDesc}${typeof e.total === 'number' ? ` · ${fmtAmt(e.total)}` : ''}`,
          cta: inCooldown ? `Sent ${hrsSinceReminder}h ago` : 'Send reminder',
          ctaDisabled: inCooldown,
          id: e.id, actionType: 'reminder', priority: 4,
          lastReminderSentAt: e.last_reminder_sent_at || null,
          reminderCount: e.reminder_count ?? 0,
        })
      })
      attItems.sort((a, b) => a.priority - b.priority)
      setAttention(attItems)

      {
        const now = Date.now()
        const actTimeAgo = (iso: string) => { const d=Math.floor((now-new Date(iso).getTime())/86400000); const h=Math.floor((now-new Date(iso).getTime())/3600000); const m=Math.floor((now-new Date(iso).getTime())/60000); return m<60?`${m} min ago`:h<24?`${h}h ago`:d===1?'yesterday':`${d} days ago` }
        const invoiceEntityIds = (activityLog || [])
          .filter((e: any) => e.entity_type === 'invoice' || INVOICE_EVENTS.has(e.event_type))
          .map((e: any) => e.entity_id).filter(Boolean)
        const invoiceToEstimate: Record<string, string> = {}
        if (invoiceEntityIds.length) {
          const { data: invRows } = await supabase
            .from('invoices').select('id, estimate_id').in('id', invoiceEntityIds)
          for (const row of invRows || []) {
            if (row.estimate_id) invoiceToEstimate[row.id] = row.estimate_id
          }
        }
        setActivity((activityLog || []).map((e: any) => ({
          event_type: e.event_type,
          actor_type: e.actor_type,
          actor_name: e.actor_name || (e.actor_type === 'contractor' ? 'You' : 'Client'),
          entity_id: (invoiceToEstimate[e.entity_id] || e.entity_id) || '',
          entity_number: e.entity_number || '',
          client_name: e.client_name || '',
          amount: e.amount ?? null,
          time: actTimeAgo(e.created_at),
        })))
        const vbMap: Record<string, string> = {}
        ;(estAll || []).forEach((e: any) => { if (e.viewed_at) vbMap[e.id] = e.viewed_at })
        setViewedByEstimate(vbMap)
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

  async function handleMarkRead(id: string) {
    const supabase = createClient()
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function handleMarkAllRead() {
    const supabase = createClient()
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    if (unreadIds.length > 0) await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  async function handleDeleteOne(id: string) {
    const supabase = createClient()
    const wasUnread = notifications.find(n => n.id === id)?.read === false
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
    await supabase.from('notifications').delete().eq('id', id)
  }

  async function handleClearAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setNotifications([])
    setUnreadCount(0)
    await supabase.from('notifications').delete().eq('user_id', user.id)
  }

  async function handleMarkPaid(invoiceId: string, invoiceType?: string, estimateId?: string) {
    setPaying(invoiceId)
    const supabase = createClient()
    try {
      const { data: updatedInv, error: invErr } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .select('id')
      if (invErr || !updatedInv?.length) {
        setDashToast('Failed to mark as paid' + (invErr ? ': ' + invErr.message : ' — no rows updated'))
        setTimeout(() => setDashToast(''), 3500)
        return
      }
      if (invoiceType === 'final' && estimateId) {
        const { data: updatedEst, error: estErr } = await supabase
          .from('estimates')
          .update({ status: 'paid' })
          .eq('id', estimateId)
          .select('id')
        if (estErr || !updatedEst?.length) {
          setDashToast('Failed to update estimate status' + (estErr ? ': ' + estErr.message : ''))
          setTimeout(() => setDashToast(''), 3500)
          return
        }
      }
      const attItem = attention.find(i => i.id === invoiceId)
      if (currentUserId) {
        void (async () => {
          const notifType = invoiceType === 'deposit' ? 'deposit_paid' : 'final_paid'
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const { data: existing } = await supabase
            .from('notifications').select('id')
            .eq('user_id', currentUserId).eq('type', notifType)
            .gte('created_at', fiveMinutesAgo).limit(1)
          if (!existing?.length) {
            const { data: prof } = await supabase.from('profiles').select('notification_settings').eq('id', currentUserId).single()
            const ns = (prof?.notification_settings as any)
            if (ns?.inapp?.pushPayment !== false) {
              await supabase.from('notifications').insert({
                user_id: currentUserId,
                type: notifType,
                title: invoiceType === 'deposit' ? 'Deposit paid' : 'Final payment received',
                body: `${attItem?.title || 'Client'} paid ${invoiceType === 'deposit' ? 'the deposit' : 'in full'} for ${attItem?.entityNumber || ''} · CA$${(attItem?.amount || 0).toFixed(2)}`,
                link: estimateId ? `/dashboard/estimates/${estimateId}` : null,
                read: false,
              })
            }
          }
        })().catch(() => {})
      }
      setAttention(prev => prev.filter(i => i.id !== invoiceId))
      loadAll()
      supabase.auth.getUser().then(({ data }: any) => {
        const user = data?.user ?? null
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
            entity_number: attItem?.entityNumber,
            client_name: attItem?.title,
            amount: attItem?.amount,
          }),
        })
      }).catch(() => {})
      const emailType = invoiceType === 'final' ? 'final_receipt' : 'deposit_receipt'
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      supabase.from('estimates').select('client_name, client_email, client_address, estimate_number, last_reminder_sent_at, reminder_count, valid_until, total').eq('id', estimateId).single(),
      supabase.from('profiles').select('company_name, quote_settings').eq('id', sanitizedId).single(),
    ])
    if (!est) return
    if (!est.client_email) {
      setDashToast('No email on file for this client. Add an email first.')
      setTimeout(() => setDashToast(''), 4000)
      return
    }
    if (est.last_reminder_sent_at) {
      const hoursSince = (Date.now() - new Date(est.last_reminder_sent_at).getTime()) / 3600000
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince)
        setDashToast(`A reminder was already sent today. Try again in ${hoursLeft}h.`)
        setTimeout(() => setDashToast(''), 3500)
        return
      }
    }
    const companyName = (prof as any)?.company_name || ''
    const address = est.client_address || ''
    const maxCount: number = (prof as any)?.quote_settings?.reminders?.max_count ?? 3
    const remCount: number = est.reminder_count ?? 0
    const remSettings = (prof as any)?.quote_settings?.reminders
    const rawTemplate: string = remSettings
      ? (remCount <= 1 ? remSettings.template_1 : remSettings.template_2) || ''
      : ''
    const expiryFmt = est.valid_until
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.valid_until + 'T00:00:00'))
      : ''
    const amtFmt = typeof est.total === 'number'
      ? `CA$${(est.total as number).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : ''
    const resolvedTemplate = rawTemplate
      .replace(/\{client_name\}/g, est.client_name || '')
      .replace(/\{address\}/g, address)
      .replace(/\{amount\}/g, amtFmt)
      .replace(/\{expiry_date\}/g, expiryFmt)
      .replace(/\{estimate_number\}/g, est.estimate_number || '')
    const msg = resolvedTemplate ||
      `Hi ${est.client_name || 'there'},\n\nJust following up on your estimate ${est.estimate_number}${address ? ` for ${address}` : ''}. Let us know if you have any questions — we'd love to help!\n\n${companyName}`
    setReminderModal({
      estimateId,
      estimateNumber: est.estimate_number,
      clientName: est.client_name || 'Client',
      clientEmail: est.client_email || '',
      address,
      message: msg,
      reminderCount: est.reminder_count ?? 0,
      maxCount,
    })
  }

  async function handleSendReminder() {
    if (!reminderModal) return
    setReminderSending(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newCount = (reminderModal.reminderCount ?? 0) + 1
      const isAutoExpiring = newCount >= (reminderModal.maxCount ?? 3)

      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId: reminderModal.estimateId, type: 'reminder', message: reminderModal.message }),
      })
      if (!emailRes.ok) {
        const body = await emailRes.json().catch(() => ({}))
        console.error('[handleSendReminder] email failed:', body?.error)
        setDashToast('Reminder failed to send — please try again in a moment.')
        setTimeout(() => setDashToast(''), 4000)
        return
      }

      // Email confirmed sent — now write the cooldown and expiry
      const now = new Date().toISOString()
      const estimateUpdate: Record<string, unknown> = {
        last_reminder_sent_at: now,
        reminder_count: newCount,
      }
      if (isAutoExpiring) {
        estimateUpdate.status = 'expired'
        estimateUpdate.expired_reason = 'no_response_after_reminders'
      }
      const { error: updateErr } = await supabase.from('estimates').update(estimateUpdate).eq('id', reminderModal.estimateId)
      if (updateErr) {
        console.error('[handleSendReminder] DB update failed after email sent:', updateErr.message)
      }

      if (isAutoExpiring) {
        fetch('/api/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            event_type: 'estimate_auto_expired',
            actor_type: 'contractor',
            entity_type: 'estimate',
            entity_id: reminderModal.estimateId,
            entity_number: reminderModal.estimateNumber,
            client_name: reminderModal.clientName,
          }),
        }).catch(() => {})
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'estimate_expired',
          title: 'Estimate expired',
          body: `${reminderModal.estimateNumber} expired without a response${reminderModal.clientName ? ` from ${reminderModal.clientName}` : ''}`,
          link: `/dashboard/estimates/${reminderModal.estimateId}`,
          read: false,
        })
      }
      const { data: senderProfile } = await supabase
        .from('profiles').select('team_owner_id, first_name, last_name').eq('id', user.id).single()
      if (senderProfile?.team_owner_id) {
        const repName = [senderProfile.first_name, senderProfile.last_name].filter(Boolean).join(' ') || 'Team member'
        await supabase.from('notifications').insert({
          user_id: senderProfile.team_owner_id,
          type: 'team_activity',
          title: 'Team activity',
          body: `${repName} sent a reminder for ${reminderModal.estimateNumber}`,
          link: `/dashboard/estimates/${reminderModal.estimateId}`,
          read: false,
        })
      }

      setAttention(prev => prev.filter(i => i.id !== reminderModal.estimateId))
      setReminderModal(null)
      setDashToast(isAutoExpiring ? 'Reminder sent — estimate marked as expired' : 'Reminder sent to ' + reminderModal.clientEmail)
      setTimeout(() => setDashToast(''), 3000)
    } finally {
      setReminderSending(false)
    }
  }

  const signaturesNeeded = metrics?.signaturesNeeded ?? 0
  const isTeamView = isOwnerOrManager && Object.keys(repNames).length > 1
  const teamCards = isTeamView
    ? Object.entries(repNames).filter(([id]) => id !== currentUserId).map(([id, name]) => ({
        id, name,
        todayCount:  appointments.filter(a => a.userId === id).length,
        doneCount:   appointments.filter(a => a.userId === id && a.pillStatus === 'DONE').length,
        signedTotal: repSignedTotals[id] ?? 0,
        appts:       appointments.filter(a => a.userId === id),
      }))
    : []
  const filteredAppts = repFilter === 'all' ? appointments : appointments.filter(a => a.userId === repFilter)
  const repPills = isTeamView
    ? [{ id: 'all', name: `All (${appointments.length})` },
       ...Object.entries(repNames).map(([id, name]) => ({ id, name: `${name} (${appointments.filter(a => a.userId === id).length})` }))]
    : []
  const doneCount          = filteredAppts.filter(a => a.pillStatus === 'DONE').length
  const allDone            = filteredAppts.length > 0 && filteredAppts.every(a => a.pillStatus === 'DONE')
  const needFollowUpCount  = filteredAppts.filter(a => a.pillStatus !== 'DONE').length
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const parseApptMinutes = (time: string): number | null => {
    const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!m) return null
    let h = parseInt(m[1])
    const min = parseInt(m[2])
    const ampm = m[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return h * 60 + min
  }
  const effectivePill = (appt: Appointment): string => {
    if (appt.pillStatus === 'DONE' || appt.pillStatus === 'IN PROGRESS') return appt.pillStatus
    const apptMin = parseApptMinutes(appt.time)
    if (apptMin !== null && apptMin < currentMinutes - 30) return 'IN PROGRESS'
    return appt.pillStatus
  }
  const nextAppt = filteredAppts.find(a => {
    if (a.pillStatus === 'DONE') return false
    const apptMin = parseApptMinutes(a.time)
    if (apptMin === null) return true
    return apptMin >= currentMinutes - 30
  }) ?? null
  const otherAppts = filteredAppts.filter(a => a.id !== nextAppt?.id)

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: '#0A1628' }}>{userName || '—'}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ fontSize: 13, color: '#475569' }}>{todayStr}</span>
            </div>
          </div>
          <BellButton notifications={notifications} unreadCount={unreadCount} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} onDeleteOne={handleDeleteOne} onClearAll={handleClearAll} variant="light" isMobile={false} />
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
        <>
        <AppTopBar
          variant="dark"
          title={userName || '—'}
          right={<BellButton notifications={notifications} unreadCount={unreadCount} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} onDeleteOne={handleDeleteOne} onClearAll={handleClearAll} variant="dark" isMobile={isMobile} />}
        />
        <div style={{
          background: 'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)',
          position: 'relative', overflow: 'hidden', paddingBottom: 28,
        }}>
          {/* Glow blobs */}
          <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.45) 0%, transparent 70%)', top: -130, right: -100, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)', bottom: -60, left: -50, pointerEvents: 'none' }} />

          {/* Day + Team/Mine toggle */}
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              {isTeamView ? 'TEAM DAY' : 'YOUR DAY'} · {todayStr.toUpperCase()}
            </div>
            {isTeamView ? (
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: 2 }}>
                {([{ val: 'all', label: 'Team' }, { val: currentUserId, label: 'Mine' }]).map(({ val, label }) => {
                  const active = repFilter === val
                  return (
                    <button key={val} onClick={() => setRepFilter(val)} style={{
                      padding: '3px 10px', borderRadius: 99, border: 'none',
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#2045B8' : 'rgba(255,255,255,0.7)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{label}</button>
                  )
                })}
              </div>
            ) : (
              filteredAppts.length > 0 ? (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                  {doneCount}/{filteredAppts.length} done
                </div>
              ) : null
            )}
          </div>

          {/* Next appointment card */}
          <div style={{ margin: '14px 16px 0', position: 'relative', zIndex: 1 }}>
            {filteredAppts.length === 0 ? (
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
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                      {isRestrictedRole ? `Welcome to ${companyName || 'the team'}!` : 'No visits today'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                      {isRestrictedRole ? 'Tap + to create your first estimate' : 'Tap + to add an appointment'}
                    </div>
                  </div>
                )
              })()
            ) : nextAppt ? (
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.6px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase' }}>NEXT</span>
                      {isTeamView && nextAppt.repName && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{nextAppt.repName.split(' ')[0]}</span>}
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1.5px' }}>
                      {nextAppt.time}{nextAppt.endTime ? <span style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.5px' }}> – {nextAppt.endTime}</span> : null}
                    </div>
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
            ) : allDone ? (
              <div style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>All visits complete for today!</div>
              </div>
            ) : (
              <div style={{ background: 'rgba(217,119,6,0.22)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(217,119,6,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FCD34D' }}>{needFollowUpCount} visit{needFollowUpCount !== 1 ? 's' : ''} need follow-up</div>
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', textDecoration: isDone ? 'line-through' : 'none', flexShrink: 0 }}>{appt.time}{appt.endTime ? ` – ${appt.endTime}` : ''}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{appt.client}</span>
                    {isTeamView && appt.repName && <span style={{ flexShrink: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{appt.repName.split(' ')[0]}</span>}
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
        </>
      )}

      {/* ── DESKTOP HERO ── */}
      {!isMobile && (
        <div className="db-hero" style={{ margin: '20px 28px 0', borderRadius: 16, padding: 22, background: 'linear-gradient(160deg, #1a4fd6 0%, #2045B8 40%, #1535a0 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,108,255,0.4) 0%, transparent 70%)', top: -180, right: -120, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div className="db-hero-kicker" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
                  {isTeamView ? 'TEAM DAY' : 'YOUR DAY'} · {todayStr.toUpperCase()}
                </div>
                {isTeamView && (
                  <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: 2 }}>
                    {([{ val: 'all', label: 'Team' }, { val: currentUserId, label: 'Mine' }]).map(({ val, label }) => {
                      const active = repFilter === val
                      return (
                        <button key={val} onClick={() => setRepFilter(val)} style={{
                          padding: '3px 10px', borderRadius: 99, border: 'none',
                          background: active ? 'rgba(255,255,255,0.9)' : 'transparent',
                          color: active ? '#2045B8' : 'rgba(255,255,255,0.75)',
                          fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}>{label}</button>
                      )
                    })}
                  </div>
                )}
              </div>
              {filteredAppts.length === 0 ? (
                <>
                  <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', marginTop: 6, opacity: 0.65 }}>
                    {isRestrictedRole ? `Welcome to ${companyName || 'the team'}!` : `No appointments today${signaturesNeeded > 0 ? ` · ${signaturesNeeded} signature${signaturesNeeded !== 1 ? 's' : ''} pending` : ''}`}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    {isRestrictedRole ? 'Tap + to create your first estimate.' : (signaturesNeeded > 0 ? `${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : 'Add your first appointment to get started.')}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginTop: 6 }}>
                    <div className="db-hero-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.7px', color: '#fff' }}>
                      {filteredAppts.length} visit{filteredAppts.length !== 1 ? 's' : ''} today
                    </div>
                    {signaturesNeeded > 0 && (
                      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', color: '#FCD34D', marginTop: 2 }}>
                        {signaturesNeeded} signature{signaturesNeeded !== 1 ? 's' : ''} pending
                      </div>
                    )}
                  </div>
                  <div className="db-hero-sub" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                    {filteredAppts.length} stop{filteredAppts.length !== 1 ? 's' : ''} · first at {filteredAppts[0].time}, last at {filteredAppts[filteredAppts.length - 1].time}.{signaturesNeeded > 0 ? ` ${signaturesNeeded} signed job${signaturesNeeded !== 1 ? 's' : ''} ready to invoice.` : ''}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="db-appt-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {filteredAppts.map(appt => (
              <div key={appt.id} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{appt.time}{appt.endTime ? <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}> – {appt.endTime}</span> : null}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 500, marginTop: 4 }}>{appt.duration}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{appt.client}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{appt.address}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', ...apptPillStyle(effectivePill(appt)) }}>{effectivePill(appt)}</div>
                  {isTeamView && appt.repName && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{appt.repName.split(' ')[0]}</div>}
                </div>
                <button
                  onClick={() => appt.estimateId ? router.push(`/dashboard/estimates/${appt.estimateId}`) : router.push(`/dashboard/estimates/new?appointment_id=${appt.id}&client_name=${encodeURIComponent(appt.client)}&client_address=${encodeURIComponent(appt.address)}&rep_id=${encodeURIComponent(appt.userId)}`)}
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

        {/* ── TEAM REP ROWS ── */}
        {isTeamView && teamCards.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#2045B8', textTransform: 'uppercase', marginBottom: 2 }}>Team</div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>Today's rep overview</div>
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
              {teamCards.map((rep, ri) => (
                <button
                  key={rep.id}
                  onClick={() => router.push(`/dashboard/appointments?rep=${rep.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', background: 'transparent', border: 'none', borderBottom: ri < teamCards.length - 1 ? '1px solid rgba(15,23,42,0.06)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: REP_GRADIENTS[ri % REP_GRADIENTS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {rep.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#0B1220', textAlign: 'left' }}>{rep.name}</div>
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                    {([
                      { num: rep.todayCount,               label: 'Today'  },
                      { num: rep.doneCount,                 label: 'Done'   },
                      { num: fmtCompact(rep.signedTotal),   label: 'Signed' },
                    ] as const).map(({ num, label }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1D4ED8' }}>{num}</div>
                        <div style={{ fontSize: 9, color: '#94A0B4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A0B4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── MOBILE SECTIONS ── */}
        {isMobile ? (
          <>
            {/* Needs Attention */}
            {permissions.payments && <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', color: '#2045B8', textTransform: 'uppercase', marginBottom: 2 }}>Needs Attention</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>
                {attention.length > 0 ? `${attention.length} item${attention.length !== 1 ? 's' : ''} waiting on you` : 'Nothing pending'}
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
                {attention.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1220', marginBottom: 3 }}>All caught up!</div>
                    <div style={{ fontSize: 12.5, color: '#94A0B4' }}>No action items right now.</div>
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
                        if (item.ctaDisabled) return
                        if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                        else if (item.actionType === 'mark_paid') handleMarkPaid(item.id, item.invoiceType, item.estimateId)
                        else if (item.actionType === 'reminder') handleOpenReminder(item.id)
                        else router.push(`/dashboard/estimates/${item.id}`)
                      }}
                      disabled={(item.actionType === 'mark_paid' && paying === item.id) || !!item.ctaDisabled}
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: item.ctaDisabled ? '#94A3B8' : '#fff', background: item.ctaDisabled ? '#E2E8F0' : item.color, border: 'none', borderRadius: 8, cursor: (item.actionType === 'mark_paid' && paying === item.id) || item.ctaDisabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: item.actionType === 'mark_paid' && paying === item.id ? 0.6 : 1 }}>
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
            </section>}

            {/* Live Feed */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 }}>Live Feed</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#0B1220', marginBottom: 14 }}>Recent activity</div>
              {(() => {
                const filtered = activity
                if (filtered.length === 0) return (
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.04)', padding: '28px 20px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={22} color="#2563EB" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1220', marginBottom: 3 }}>No activity yet</div>
                    <div style={{ fontSize: 12.5, color: '#94A0B4' }}>Send your first estimate to get started.</div>
                  </div>
                )
                const groups = groupActivity(filtered)
                const visibleGroups = showAllActivity ? groups : groups.slice(0, 5)
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleGroups.map((g, gi) => {
                        const { items, entity_id: entityId, entity_number: entityNumber, client_name: clientName } = g
                        const topEvent = items.reduce((best, it) => (STATUS_PRIORITY[it.event_type] ?? -1) > (STATUS_PRIORITY[best.event_type] ?? -1) ? it : best, items[0])
                        const accent = getDealAccent(topEvent.event_type)
                        // Header amount = estimate total; prefer events that carry the full estimate value
                        const totalAmt = items.find(it => TOTAL_AMOUNT_EVENTS.has(it.event_type) && it.amount != null)?.amount
                          ?? items.find(it => it.amount != null)?.amount ?? null
                        const initials = (clientName || '?').slice(0, 1).toUpperCase()
                        const isClientViewed = topEvent.event_type === 'estimate_sent' && !!entityId && !!viewedByEstimate[entityId]
                        const effectiveAccent = isClientViewed ? '#059669' : accent
                        const statusBadge = isClientViewed ? { label: 'Viewed by client' } : STATUS_BADGE[topEvent.event_type]
                        const isOpen = openDealIdx === gi
                        return (
                          <div key={gi} style={{ borderRadius: 18, background: '#fff', border: isOpen ? '1px solid #DCE6FF' : '1px solid rgba(15,23,42,0.07)', boxShadow: isOpen ? '0 10px 26px -14px rgba(37,99,235,0.4)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
                            {/* Card header */}
                            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                              onClick={() => setOpenDealIdx(isOpen ? -1 : gi)}>
                              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${effectiveAccent}99, ${effectiveAccent})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{initials}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName || '—'}</div>
                                <div style={{ fontSize: 11.5, color: '#94A0B4', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {[entityNumber, items.length > 1 ? `${items.length} updates` : (ACTIVITY_CFG[topEvent.event_type]?.label || 'updated'), items[0].time].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                {statusBadge && <span style={{ height: 22, padding: '0 9px', borderRadius: 99, background: effectiveAccent + '18', color: effectiveAccent, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{statusBadge.label}</span>}
                                {totalAmt != null && <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0B1220' }}>{fmtAmt(totalAmt)}</span>}
                              </div>
                            </div>
                            {/* Expanded timeline */}
                            {isOpen && (
                              <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                                <div style={{ paddingTop: 12 }}>
                                  {items.map((it, idx) => {
                                    const tone = EVENT_TONE[it.event_type] || { bg: '#F1F5F9', color: '#94A3B8' }
                                    const Icon = EVENT_ICONS[it.event_type] || ClockIcon
                                    const isPayment = it.event_type === 'deposit_paid' || it.event_type === 'final_paid'
                                    const actorLabel = it.actor_type === 'contractor' ? 'You' : it.actor_name
                                    return (
                                      <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                          <div style={{ width: 22, height: 22, borderRadius: 11, background: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon size={12} color={tone.color} strokeWidth={2} />
                                          </div>
                                          {idx < items.length - 1 && <div style={{ width: 2, height: 18, background: 'rgba(15,23,42,0.07)', marginTop: 3 }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, paddingBottom: idx < items.length - 1 ? 8 : 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0B1220' }}>{actorLabel} {ACTIVITY_CFG[it.event_type]?.label || 'updated'}</span>
                                            {it.amount != null && <span style={{ fontSize: 12.5, fontWeight: 800, color: isPayment ? '#0F8A4D' : '#475467' }}>{fmtAmt(it.amount)}</span>}
                                          </div>
                                          <div style={{ fontSize: 11, color: '#AEB6C4', marginTop: 2 }}>{it.time}</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                {entityId && (
                                  <button onClick={() => router.push(`/dashboard/estimates/${entityId}`)} style={{ marginTop: 12, width: '100%', minHeight: 44, background: '#EEF3FF', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#1D4ED8', fontFamily: 'inherit', padding: '10px 16px', textAlign: 'center' }}>
                                    View estimate →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {groups.length > 5 && (
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => setShowAllActivity(v => !v)} style={{ width: '100%', height: 46, borderRadius: 13, border: '1px solid rgba(15,23,42,0.07)', background: '#fff', color: '#2563EB', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {showAllActivity ? 'Show less' : 'Show all deals'}
                        </button>
                      </div>
                    )}
                  </>
                )
              })()}
            </section>

          </>
        ) : (
          /* ── DESKTOP TWO-COLUMN LOWER ROW ── */
          <div className="db-lower-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Needs attention */}
            {permissions.payments && <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
              <div className="db-panel-header" style={{ padding: '14px 16px', borderBottom: '1px solid #EEF0F4' }}>
                <div className="db-panel-title" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: '#2045B8', textTransform: 'uppercase' }}>Needs Attention</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {attention.length > 0 ? `${attention.length} item${attention.length !== 1 ? 's' : ''} waiting on you` : 'Nothing pending'}
                </div>
              </div>
              {attention.length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1220', marginBottom: 4 }}>All caught up!</div>
                  <div style={{ fontSize: 12.5, color: '#94A0B4' }}>No action items right now.</div>
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
                      if (item.ctaDisabled) return
                      if (item.actionType === 'invoice') router.push(`/dashboard/estimates/${item.id}/invoice`)
                      else if (item.actionType === 'mark_paid') handleMarkPaid(item.id, item.invoiceType, item.estimateId)
                      else if (item.actionType === 'reminder') handleOpenReminder(item.id)
                      else router.push(`/dashboard/estimates/${item.id}`)
                    }}
                    disabled={(item.actionType === 'mark_paid' && paying === item.id) || !!item.ctaDisabled}
                    style={{ padding: '5px 11px', fontSize: 12, fontWeight: 700, color: item.ctaDisabled ? '#94A3B8' : '#fff', background: item.ctaDisabled ? '#E2E8F0' : item.color, border: 'none', borderRadius: 7, cursor: (item.actionType === 'mark_paid' && paying === item.id) || item.ctaDisabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: item.actionType === 'mark_paid' && paying === item.id ? 0.6 : 1 }}>
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
            </div>}

            {/* Live Feed / Recent activity */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 }}>Live Feed</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#0B1220', marginBottom: 14 }}>Recent activity</div>
              {(() => {
                const filtered = activity
                if (filtered.length === 0) return (
                  <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.10)', borderRadius: 16, boxShadow: '0 2px 10px rgba(15,23,42,0.04)', padding: '28px 20px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={22} color="#2563EB" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0B1220', marginBottom: 3 }}>No activity yet</div>
                    <div style={{ fontSize: 12.5, color: '#94A0B4' }}>Send your first estimate to get started.</div>
                  </div>
                )
                const groups = groupActivity(filtered)
                const visibleGroups = showAllActivity ? groups : groups.slice(0, 5)
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleGroups.map((g, gi) => {
                        const { items, entity_id: entityId, entity_number: entityNumber, client_name: clientName } = g
                        const topEvent = items.reduce((best, it) => (STATUS_PRIORITY[it.event_type] ?? -1) > (STATUS_PRIORITY[best.event_type] ?? -1) ? it : best, items[0])
                        const accent = getDealAccent(topEvent.event_type)
                        // Header amount = estimate total; prefer events that carry the full estimate value
                        const totalAmt = items.find(it => TOTAL_AMOUNT_EVENTS.has(it.event_type) && it.amount != null)?.amount
                          ?? items.find(it => it.amount != null)?.amount ?? null
                        const initials = (clientName || '?').slice(0, 1).toUpperCase()
                        const isClientViewed = topEvent.event_type === 'estimate_sent' && !!entityId && !!viewedByEstimate[entityId]
                        const effectiveAccent = isClientViewed ? '#059669' : accent
                        const statusBadge = isClientViewed ? { label: 'Viewed by client' } : STATUS_BADGE[topEvent.event_type]
                        const isOpen = openDealIdx === gi
                        return (
                          <div key={gi} style={{ borderRadius: 18, background: '#fff', border: isOpen ? '1px solid #DCE6FF' : '1px solid rgba(15,23,42,0.07)', boxShadow: isOpen ? '0 10px 26px -14px rgba(37,99,235,0.4)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
                            {/* Card header */}
                            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                              onClick={() => setOpenDealIdx(isOpen ? -1 : gi)}>
                              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${effectiveAccent}99, ${effectiveAccent})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#fff' }}>{initials}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName || '—'}</div>
                                <div style={{ fontSize: 11.5, color: '#94A0B4', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {[entityNumber, items.length > 1 ? `${items.length} updates` : (ACTIVITY_CFG[topEvent.event_type]?.label || 'updated'), items[0].time].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                {statusBadge && <span style={{ height: 22, padding: '0 9px', borderRadius: 99, background: effectiveAccent + '18', color: effectiveAccent, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{statusBadge.label}</span>}
                                {totalAmt != null && <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0B1220' }}>{fmtAmt(totalAmt)}</span>}
                              </div>
                            </div>
                            {/* Expanded timeline */}
                            {isOpen && (
                              <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                                <div style={{ paddingTop: 12 }}>
                                  {items.map((it, idx) => {
                                    const tone = EVENT_TONE[it.event_type] || { bg: '#F1F5F9', color: '#94A3B8' }
                                    const Icon = EVENT_ICONS[it.event_type] || ClockIcon
                                    const isPayment = it.event_type === 'deposit_paid' || it.event_type === 'final_paid'
                                    const actorLabel = it.actor_type === 'contractor' ? 'You' : it.actor_name
                                    return (
                                      <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                          <div style={{ width: 22, height: 22, borderRadius: 11, background: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon size={12} color={tone.color} strokeWidth={2} />
                                          </div>
                                          {idx < items.length - 1 && <div style={{ width: 2, height: 18, background: 'rgba(15,23,42,0.07)', marginTop: 3 }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, paddingBottom: idx < items.length - 1 ? 8 : 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0B1220' }}>{actorLabel} {ACTIVITY_CFG[it.event_type]?.label || 'updated'}</span>
                                            {it.amount != null && <span style={{ fontSize: 12.5, fontWeight: 800, color: isPayment ? '#0F8A4D' : '#475467' }}>{fmtAmt(it.amount)}</span>}
                                          </div>
                                          <div style={{ fontSize: 11, color: '#AEB6C4', marginTop: 2 }}>{it.time}</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                {entityId && (
                                  <button onClick={() => router.push(`/dashboard/estimates/${entityId}`)} style={{ marginTop: 12, width: '100%', minHeight: 44, background: '#EEF3FF', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#1D4ED8', fontFamily: 'inherit', padding: '10px 16px', textAlign: 'center' }}>
                                    View estimate →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {groups.length > 5 && (
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => setShowAllActivity(v => !v)} style={{ width: '100%', height: 46, borderRadius: 13, border: '1px solid rgba(15,23,42,0.07)', background: '#fff', color: '#2563EB', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {showAllActivity ? 'Show less' : 'Show all deals'}
                        </button>
                      </div>
                    )}
                  </>
                )
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

            {/* Warning banner for repeat reminders */}
            {(reminderModal.reminderCount ?? 0) === 2 ? (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991B1B',
              }}>
                This is the final reminder. If the client doesn't respond, this estimate will be marked as expired.
              </div>
            ) : (reminderModal.reminderCount ?? 0) > 2 ? (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E',
              }}>
                This will be the {nth((reminderModal.reminderCount ?? 0) + 1)} reminder for this client.
              </div>
            ) : null}

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
