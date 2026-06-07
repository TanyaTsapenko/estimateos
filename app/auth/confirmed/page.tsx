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
        router.replace('/onboarding')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          subscription.unsubscribe()
          await finish(session.user.id, session.user.email, session.user.user_metadata)
        }
      }
    )

    const timeout = setTimeout(async () => {
      if (finishedRef.current) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await finish(session.user.id, session.user.email, session.user.user_metadata)
      } else {
        router.replace('/auth?error=confirmation_expired')
      }
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

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
