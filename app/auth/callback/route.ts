import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code           = searchParams.get('code')
  const token_hash     = searchParams.get('token_hash')
  const type           = searchParams.get('type')
  const next           = searchParams.get('next') ?? '/dashboard'
  const allParams      = Object.fromEntries(searchParams.entries())

  console.log('[callback] URL params:', JSON.stringify(allParams))
  console.log('[callback] origin:', origin)
  console.log('[callback] code present:', !!code, '| token_hash present:', !!token_hash, '| type:', type)

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    console.log('[callback] calling exchangeCodeForSession...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[callback] exchangeCodeForSession error:', error?.message ?? null)
    console.log('[callback] user id:', data?.user?.id ?? null)
    console.log('[callback] user email_confirmed_at:', data?.user?.email_confirmed_at ?? null)

    if (!error && data.user) {
      // Upsert a basic profile row so the app doesn't break on first login
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.user_metadata?.full_name?.split(' ')[0] ?? null,
        last_name:  data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })
      console.log('[callback] profile upsert error:', upsertError?.message ?? null)

      // If `next` was explicitly set (e.g. password reset), honour it.
      // Otherwise decide based on whether the user has completed onboarding.
      if (next !== '/dashboard') {
        console.log('[callback] next param set, redirecting to:', next)
        return NextResponse.redirect(new URL(next, origin))
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', data.user.id)
        .single()

      console.log('[callback] profile query error:', profileError?.message ?? null)
      console.log('[callback] profile.onboarding_done:', profile?.onboarding_done ?? null)

      const destination = profile?.onboarding_done ? '/dashboard' : '/onboarding'
      console.log('[callback] final redirect:', destination)
      return NextResponse.redirect(new URL(destination, origin))
    }

    console.log('[callback] falling through — error or no user after code exchange')
  } else {
    console.log('[callback] no code param — magic link may have used implicit/hash flow instead of PKCE')
  }

  console.log('[callback] redirecting to /auth?error=oauth')
  return NextResponse.redirect(new URL('/auth?error=oauth', origin))
}
