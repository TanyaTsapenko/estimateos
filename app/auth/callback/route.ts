import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
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
    .maybeSingle()
  const destination = profile?.onboarding_done ? '/dashboard' : '/onboarding'
  return NextResponse.redirect(new URL(destination, origin))
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const rawNext    = searchParams.get('next') ?? '/dashboard'
  // Guard against open redirect: only allow same-origin relative paths
  const next       = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

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
      const meta = (data.user.user_metadata || {}) as Record<string, string>
      const firstName = meta.first_name || (meta.full_name ? meta.full_name.split(' ')[0] : null) || null
      const lastName  = meta.last_name  || (meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') || null : null) || null
      const upsertPayload: Record<string, unknown> = {
        id: data.user.id,
        email: data.user.email,
        updated_at: new Date().toISOString(),
      }
      if (firstName || lastName) {
        const { data: existing } = await supabase.from('profiles').select('first_name, last_name').eq('id', data.user.id).maybeSingle()
        if (!existing?.first_name) upsertPayload.first_name = firstName
        if (!existing?.last_name)  upsertPayload.last_name  = lastName
      }
      await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id', ignoreDuplicates: false })
      return resolveDestination(supabase, data.user.id, next, origin)
    }
  }

  // token_hash flow — some email confirmation links
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })
    if (!error && data.user) {
      const meta = (data.user.user_metadata || {}) as Record<string, string>
      const firstName = meta.first_name || null
      const lastName  = meta.last_name  || null
      const upsertPayload: Record<string, unknown> = {
        id: data.user.id,
        email: data.user.email,
        updated_at: new Date().toISOString(),
      }
      if (firstName || lastName) {
        const { data: existing } = await supabase.from('profiles').select('first_name, last_name').eq('id', data.user.id).maybeSingle()
        if (!existing?.first_name) upsertPayload.first_name = firstName
        if (!existing?.last_name)  upsertPayload.last_name  = lastName
      }
      await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'id', ignoreDuplicates: false })
      return resolveDestination(supabase, data.user.id, next, origin)
    }
  }

  // Hash fragment flow (#access_token=...) cannot be read server-side.
  // The /auth/confirmed client page handles it when redirectTo points there.
  return NextResponse.redirect(new URL('/auth?error=oauth', origin))
}
