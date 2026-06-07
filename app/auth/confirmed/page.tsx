'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ConfirmedPage() {
  const router = useRouter()
  const finishedRef = useRef(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    async function finish(userId: string, email: string | undefined, meta: Record<string, unknown>) {
      if (finishedRef.current) return
      finishedRef.current = true

      try {
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
      } catch {
        // If anything fails, send to onboarding — safer than staying stuck
        router.replace('/onboarding')
      }
    }

    // Primary: onAuthStateChange fires with SIGNED_IN once the hash fragment
    // is parsed by createBrowserClient (detectSessionInUrl: true by default).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          finish(session.user.id, session.user.email, session.user.user_metadata)
        }
      }
    )

    // Fallback A: session may already exist if the page was refreshed or
    // Supabase parsed the hash before the listener was registered.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        finish(session.user.id, session.user.email, session.user.user_metadata)
      }
    })

    // Fallback B: after 2 s, check again in case the hash was parsed late.
    const timer = setTimeout(async () => {
      if (finishedRef.current) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        finish(session.user.id, session.user.email, session.user.user_metadata)
      } else {
        // No session after 2 s — link likely expired or already used.
        router.replace('/auth?error=confirmation_expired')
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
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
