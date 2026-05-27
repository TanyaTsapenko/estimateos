import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id') || ''
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key || !placeId) return NextResponse.json({ result: {} })

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_components&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  return NextResponse.json(data)
}
