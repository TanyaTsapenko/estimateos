import { SupabaseClient } from '@supabase/supabase-js'

export async function getTeamUserIds(
  admin: SupabaseClient,
  userId: string
): Promise<{ userIds: string[]; isOwnerOrManager: boolean }> {
  const sanitizedId = userId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')

  const { data: profile } = await admin
    .from('profiles')
    .select('team_owner_id, role, member_role')
    .eq('id', sanitizedId)
    .single()

  const teamOwnerId = profile?.team_owner_id || sanitizedId
  const isOwnerOrManager =
    !profile?.team_owner_id || // solo owner
    profile?.role === 'owner' ||
    profile?.member_role === 'owner' ||
    profile?.member_role === 'manager'

  if (!isOwnerOrManager) {
    // estimator/sales — бачить тільки своє
    return { userIds: [sanitizedId], isOwnerOrManager: false }
  }

  // owner/manager — бачить всю команду
  const { data: teamMembers } = await admin
    .from('profiles')
    .select('id')
    .or(`id.eq.${teamOwnerId},team_owner_id.eq.${teamOwnerId}`)

  const userIds = (teamMembers || []).map(m => m.id.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, ''))

  return { userIds: userIds.length > 0 ? userIds : [sanitizedId], isOwnerOrManager: true }
}
