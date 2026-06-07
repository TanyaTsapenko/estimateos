import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Upsert a basic profile row so the app doesn't break on first login
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.user_metadata?.full_name?.split(' ')[0] ?? null,
        last_name:  data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })

      // If `next` was explicitly set (e.g. password reset), honour it.
      // Otherwise decide based on whether the user has completed onboarding.
      if (next !== '/dashboard') {
        return NextResponse.redirect(new URL(next, origin))
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', data.user.id)
        .single()

      const destination = profile?.onboarding_done ? '/dashboard' : '/onboarding'
      return NextResponse.redirect(new URL(destination, origin))
    }
  }

  return NextResponse.redirect(new URL('/auth?error=oauth', origin))
}
