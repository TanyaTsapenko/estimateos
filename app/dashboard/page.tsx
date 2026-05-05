'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { fmtCAD } from '@/lib/pricing'

interface Profile { first_name: string | null; company_name: string | null }
interface Estimate {
  id: string; estimate_number: string; client_name: string | null
  status: string; total: number; created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: prof }, { data: ests }] = await Promise.all([
        supabase.from('profiles').select('first_name, company_name').eq('id', user.id).single(),
        supabase.from('estimates').select('id, estimate_number, client_name, status, total, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ])
      setProfile(prof)
      setEstimates(ests || [])
      setLoading(false)
    }
    load()
  }, [])

  const signed = estimates.filter(e => e.status === 'signed')
  const open = estimates.filter(e => ['draft', 'sent'].includes(e.status))
  const monthRevenue = signed.reduce((s, e) => s + (e.total || 0), 0)
  const winRate = estimates.length > 0 ? Math.round(signed.length / estimates.length * 100) : 0
  const avgDeal = signed.length > 0 ? monthRevenue / signed.length : 0

  const statusColor: Record<string, string> = {
    draft: '#6b7280', sent: '#2563eb', signed: '#16a34a',
    declined: '#dc2626', invoiced: '#9333ea',
  }
  const statusBg: Record<string, string> = {
    draft: 'rgba(107,114,128,.1)', sent: 'rgba(37,99,235,.1)', signed: 'rgba(22,163,74,.1)',
    declined: 'rgba(220,38,38,.1)', invoiced: 'rgba(147,51,234,.1)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh" style={{ paddingBottom: 56 }}>
        <div className="h-top">
          <div>
            <div className="logo-text">Estimate<span style={{ color: 'var(--amber)' }}>OS</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/dashboard/estimates/new')}
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,.1)', color: '#111', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + New
            </button>
          </div>
        </div>
        <div className="h-title">
          <div className="h-eye">Welcome back</div>
          <div className="h-big">{loading ? '...' : profile?.first_name || 'Contractor'}</div>
          <div className="h-sub">{profile?.company_name || 'Your company'}</div>
        </div>
      </div>

      <div className="dash-bg screen-enter">
        <div className="stats">
          <div className="stat">
            <div className="stat-top">
              <div className="stat-ic">💰</div>
              <div className="stat-tr">This month</div>
            </div>
            <div className="stat-val">{loading ? '...' : fmtCAD(monthRevenue)}</div>
            <div className="stat-lbl">Revenue</div>
          </div>
          <div className="stat">
            <div className="stat-top">
              <div className="stat-ic">📋</div>
              <div className="stat-tr">Active</div>
            </div>
            <div className="stat-val">{loading ? '...' : open.length}</div>
            <div className="stat-lbl">Open estimates</div>
          </div>
          <div className="stat">
            <div className="stat-top">
              <div className="stat-ic">🎯</div>
              <div className="stat-tr">All time</div>
            </div>
            <div className="stat-val">{loading ? '...' : winRate + '%'}</div>
            <div className="stat-lbl">Win rate</div>
          </div>
          <div className="stat">
            <div className="stat-top">
              <div className="stat-ic">📈</div>
              <div className="stat-tr">Average</div>
            </div>
            <div className="stat-val">{loading ? '...' : fmtCAD(avgDeal)}</div>
            <div className="stat-lbl">Per job</div>
          </div>
        </div>

        <div className="sl2">
          <div className="sl2-t">Recent estimates</div>
          <div className="sl2-a" onClick={() => router.push('/dashboard/estimates')}>View all →</div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>Loading...</div>
        )}

        {!loading && estimates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🪟</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--jet)', marginBottom: 6 }}>No estimates yet</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Create your first estimate and close jobs before you leave the driveway.</div>
            <button className="btn-next" style={{ maxWidth: 240, margin: '0 auto' }}
              onClick={() => router.push('/dashboard/estimates/new')}>
              Create estimate →
            </button>
          </div>
        )}

        {estimates.map(e => (
          <div key={e.id} className="ec" onClick={() => router.push(`/dashboard/estimates/${e.id}`)}>
            <div className="ec-top">
              <div>
                <div className="ec-name">{e.client_name || 'Client name TBD'}</div>
                <div className="ec-date">{e.estimate_number} · {new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</div>
              </div>
              <span className="badge" style={{ color: statusColor[e.status] || '#6b7280', background: statusBg[e.status] || 'rgba(107,114,128,.1)' }}>
                {e.status.toUpperCase()}
              </span>
            </div>
            <div className="ec-bot">
              <div className="ec-tags">
                <span className="badge" style={{ background: 'rgba(53,58,62,.08)', color: 'var(--graphite)' }}>W&D</span>
              </div>
              <div className="ec-amt">{fmtCAD(e.total || 0)}</div>
            </div>
          </div>
        ))}

        <div style={{ height: 90 }} />
      </div>

      <button className="fab" onClick={() => router.push('/dashboard/estimates/new')}>
        ✏️ New Estimate
      </button>
      <BottomNav />
    </div>
  )
}
