'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ConfirmedPage() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    async function finish(userId: string, email: string | undefined, meta: Record<string, unknown>) {
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        first_name: (meta?.first_name as string) ?? null,
        last_name:  (meta?.last_name as string) ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', userId)
        .single()

      router.replace(profile?.onboarding_done ? '/dashboard' : '/onboarding')
    }

    // onAuthStateChange fires immediately with SIGNED_IN when the hash fragment
    // is present — createBrowserClient with detectSessionInUrl:true (default)
    // parses it automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          subscription.unsubscribe()
          await finish(session.user.id, session.user.email, session.user.user_metadata)
        }
      }
    )

    // Fallback: if the session is already set (e.g. page refreshed after sign-in)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        subscription.unsubscribe()
        await finish(session.user.id, session.user.email, session.user.user_metadata)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F8F9FB',
    }}>
      <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 15 }}>
        Confirming your account…
      </div>
    </div>
  )
}
