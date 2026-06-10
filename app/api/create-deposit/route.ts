import { NextRequest, NextResponse } from 'next/server'

// Public proxy: sign pages call this; secret never touches the client bundle.
export async function POST(request: NextRequest) {
  const { estimateId } = await request.json()
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const secret = process.env.INTERNAL_API_SECRET || ''
  const base = request.nextUrl.origin
  const res = await fetch(`${base}/api/deposit-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({ estimateId }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
