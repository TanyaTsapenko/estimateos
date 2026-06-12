import type { SupabaseClient } from '@supabase/supabase-js'

export async function getCompanyName(admin: SupabaseClient, profileUserId: string): Promise<string> {
  const sanitized = profileUserId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

  const { data: prof } = await admin.from('profiles')
    .select('company_name, first_name, last_name, team_owner_id')
    .eq('id', sanitized)
    .single()

  if (prof?.company_name) return prof.company_name

  if (prof?.team_owner_id) {
    const ownerSanitized = prof.team_owner_id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
    const { data: ownerProf } = await admin.from('profiles')
      .select('company_name')
      .eq('id', ownerSanitized)
      .single()
    if (ownerProf?.company_name) return ownerProf.company_name
  }

  return `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Your contractor'
}
