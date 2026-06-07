import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BottomTabBar from '@/components/BottomTabBar'
import MobileSidebar from '@/components/MobileSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('trade')
    .eq('id', user.id)
    .single()
  if (!profile?.trade) redirect('/onboarding')

  return (
    <div className="app-shell">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="main-content">{children}</div>
      <BottomTabBar />
      <MobileSidebar />
    </div>
  )
}
