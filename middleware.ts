import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getOnboardingDone(userId: string): Promise<boolean> {
  const sanitizedId = userId.toString().toLowerCase().trim().replace(/[^\x20-\x7E]/g, '')
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('onboarding_done').eq('id', sanitizedId).single()
  return data?.onboarding_done === true
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const publicPaths = [
    '/auth', '/estimate', '/team/join', '/sign',
    '/api/deposit-invoice', '/api/sign-contract', '/api/sign-estimate', '/api/create-deposit',
    '/api/notify-contractor-signed', '/api/send-contract-signed',
    '/api/register', '/api/send-confirmation',
    '/api/public/',
    '/auth/confirmed',
  ]
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (user) {
    // Already on onboarding — let through, no loop
    if (pathname.startsWith('/onboarding')) {
      return supabaseResponse
    }

    // Auth page: redirect to /onboarding or /dashboard based on onboarding_done
    if (pathname === '/auth') {
      const done = await getOnboardingDone(user.id)
      return NextResponse.redirect(new URL(done ? '/dashboard' : '/onboarding', request.url))
    }

    // Dashboard: guard against skipped onboarding
    if (pathname.startsWith('/dashboard')) {
      const done = await getOnboardingDone(user.id)
      if (!done) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|logo/|api/pdf|api/send-email|api/contract-pdf|api/contract-pdf-gen|api/places|api/estimate-pdf).*)'],
}
