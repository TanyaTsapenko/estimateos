import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

export type AppRole = 'owner' | 'estimator'

export function useRole(): { role: AppRole; loading: boolean } {
  const [role, setRole] = useState<AppRole>('owner')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('role, member_role, team_owner_id')
        .eq('id', user.id)
        .single()

      if (!data) { setLoading(false); return }

      const r = (data.role ?? null) as string | null
      const isTeamMember = !!data.team_owner_id

      if (r === 'estimator') {
        setRole('estimator')
      } else if (!r && isTeamMember && data.member_role && data.member_role !== 'owner') {
        // Legacy: role column not yet populated but team member exists
        setRole('estimator')
      } else {
        setRole('owner')
      }
      setLoading(false)
    })
  }, [])

  return { role, loading }
}
