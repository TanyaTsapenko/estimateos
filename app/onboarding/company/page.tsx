'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CompanySetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    company_name: '', phone: '', website: '',
    city: '', province: 'AB', licence: '', insurance: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleNext() {
    if (!form.company_name.trim()) return setError('Company name is required')
    if (!form.city.trim()) return setError('City is required')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      ...form,
      updated_at: new Date().toISOString(),
    })
    if (upsertError) { setError(upsertError.message); setLoading(false); return }
    router.push('/onboarding/niche')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="gh">
        <div className="h-top">
          <div className="pills"><div className="pill active" /><div className="pill" /></div>
        </div>
        <div className="h-title">
          <div className="h-eye">Step 1 of 2 · Company</div>
          <div className="h-big">Your Company</div>
          <div className="h-sub">Appears on all your estimates</div>
        </div>
      </div>
      <div className="card">
        {error && <div className="error-msg">{error}</div>}
        <div className="r1"><div className="f"><label>Company Name</label>
          <input placeholder="Arctic Climate Solutions" value={form.company_name} onChange={e => set('company_name', e.target.value)} /></div></div>
        <div className="r2">
          <div className="f"><label>Phone</label>
            <input type="tel" placeholder="(403) 555-0244" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="f"><label>Website</label>
            <input placeholder="arcticclimate.ca" value={form.website} onChange={e => set('website', e.target.value)} /></div>
        </div>
        <div className="r2">
          <div className="f"><label>City</label>
            <input placeholder="Calgary" value={form.city} onChange={e => set('city', e.target.value)} /></div>
          <div className="f"><label>Province</label>
            <select value={form.province} onChange={e => set('province', e.target.value)}>
              <option value="AB">AB — GST 5%</option>
              <option value="ON">ON — HST 13%</option>
              <option value="BC">BC — HST 12%</option>
              <option value="QC">QC — 14.975%</option>
              <option value="MB">MB — 12%</option>
              <option value="SK">SK — 11%</option>
              <option value="NS">NS — HST 15%</option>
              <option value="NB">NB — HST 15%</option>
              <option value="NL">NL — HST 15%</option>
              <option value="PE">PE — HST 15%</option>
              <option value="NT">NT — GST 5%</option>
              <option value="NU">NU — GST 5%</option>
              <option value="YT">YT — GST 5%</option>
            </select>
          </div>
        </div>
        <div className="r1"><div className="f"><label>Licence / Registration #</label>
          <input placeholder="AB-G2-4821" value={form.licence} onChange={e => set('licence', e.target.value)} />
          <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2 }}>Contractor, gas or electrical licence number</div>
        </div></div>
        <div className="r1"><div className="f"><label>Insurance Provider</label>
          <input placeholder="Intact Insurance" value={form.insurance} onChange={e => set('insurance', e.target.value)} /></div></div>
        <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', marginTop: 4 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏢</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--jet)' }}>Upload your logo</div>
          <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2 }}>PNG or JPG · Shown on all estimates</div>
        </div>
      </div>
      <div className="nav">
        <button className="btn-back" onClick={() => router.push('/auth')}>← Back</button>
        <button className="btn-next" onClick={handleNext} disabled={loading}>
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
