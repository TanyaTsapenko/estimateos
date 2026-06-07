import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function resolveDestination(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  next: string,
  origin: string,
): Promise<NextResponse> {
  if (next !== '/dashboard') {
    return NextResponse.redirect(new URL(next, origin))
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', userId)
    .single()
  const destination = profile?.onboarding_done ? '/dashboard' : '/onboarding'
  return NextResponse.redirect(new URL(destination, origin))
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/dashboard'

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

  // PKCE flow — OAuth and some magic links
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.user_metadata?.full_name?.split(' ')[0] ?? null,
        last_name:  data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })
      return resolveDestination(supabase, data.user.id, next, origin)
    }
  }

  // token_hash flow — some email confirmation links
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email',
    })
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.user_metadata?.first_name ?? null,
        last_name:  data.user.user_metadata?.last_name ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })
      return resolveDestination(supabase, data.user.id, next, origin)
    }
  }

  // Hash fragment flow (#access_token=...) cannot be read server-side.
  // The /auth/confirmed client page handles it when redirectTo points there.
  return NextResponse.redirect(new URL('/auth?error=oauth', origin))
}
