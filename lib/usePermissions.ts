'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import type { AppRole } from './useRole'

export interface Permissions {
  estimates:  boolean
  schedule:   boolean
  clients:    boolean
  price_list: boolean
  reports:    boolean
  settings:   boolean
}

export const OWNER_PERMISSIONS: Permissions = {
  estimates: true, schedule: true, clients: true,
  price_list: true, reports: true, settings: true,
}

export const DEFAULT_ESTIMATOR_PERMISSIONS: Permissions = {
  estimates: true, schedule: true, clients: true,
  price_list: false, reports: false, settings: false,
}

export function usePermissions(): { role: AppRole; permissions: Permissions; loading: boolean } {
  const [role, setRole]               = useState<AppRole>('owner')
  const [permissions, setPermissions] = useState<Permissions>(OWNER_PERMISSIONS)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('role, permissions, team_owner_id, member_role')
        .eq('id', user.id)
        .single()
      if (!data) { setLoading(false); return }

      const r = (data.role ?? null) as string | null
      const isTeamMember = !!data.team_owner_id
      const isOwner =
        r === 'owner' ||
        (!r && !isTeamMember) ||
        (!r && data.member_role === 'owner')

      if (isOwner) {
        setRole('owner')
        setPermissions(OWNER_PERMISSIONS)
      } else {
        setRole('estimator')
        const stored = data.permissions as Partial<Permissions> | null
        setPermissions({ ...DEFAULT_ESTIMATOR_PERMISSIONS, ...(stored || {}) })
      }
      setLoading(false)
    })
  }, [])

  return { role, permissions, loading }
}
