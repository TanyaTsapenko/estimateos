import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import DrawerNav from '@/components/DrawerNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('trade, team_owner_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.trade && !profile?.team_owner_id) redirect('/onboarding')

  return (
    <div className="app-shell">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="main-content">{children}</div>
      <DrawerNav />
    </div>
  )
}
