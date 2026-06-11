import { SupabaseClient } from '@supabase/supabase-js'

export async function logActivity(admin: SupabaseClient, params: {
  user_id: string
  event_type: string
  actor_type: 'contractor' | 'client'
  actor_name?: string
  entity_type?: string
  entity_id?: string
  entity_number?: string
  client_name?: string
  amount?: number
}) {
  await admin.from('activity_log').insert(params)
}
