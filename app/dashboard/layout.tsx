import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BottomTabBar from '@/components/BottomTabBar'
import NotificationsPanel from '@/components/NotificationsPanel'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  return (
    <div className="app-shell">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="main-content">{children}</div>
      <BottomTabBar />
      <NotificationsPanel />
    </div>
  )
}
