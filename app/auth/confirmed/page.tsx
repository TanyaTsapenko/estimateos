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

    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token })
        .then(async ({ data }) => {
          if (data.session?.user) {
            await finish(data.session.user.id, data.session.user.email, data.session.user.user_metadata)
          } else {
            router.replace('/auth?error=confirmation_expired')
          }
        })
    } else {
      router.replace('/auth?error=confirmation_expired')
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
