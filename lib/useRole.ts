'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

export type AppRole = 'owner' | 'estimator' | 'admin' | 'manager'

export function useRole(): { role: AppRole; loading: boolean } {
  const [role, setRole] = useState<AppRole>('owner')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user ?? null
        if (!user) { setRole('estimator'); setLoading(false); return }

        const { data } = await supabase
          .from('profiles')
          .select('role, member_role, team_owner_id')
          .eq('id', user.id)
          .maybeSingle()

        if (!data) { setRole('estimator'); setLoading(false); return }

        const r = (data.role ?? null) as string | null
        const isTeamMember = !!data.team_owner_id

        if (r === 'estimator' || (!r && isTeamMember && data.member_role === 'estimator')) {
          setRole('estimator')
        } else if (r === 'admin' || (!r && isTeamMember && data.member_role === 'admin')) {
          setRole('admin')
        } else {
          setRole('owner')
        }
        setLoading(false)
      } catch { setRole('estimator'); setLoading(false) }
    })()
  }, [])

  return { role, loading }
}
