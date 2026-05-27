import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input') || ''
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ predictions: [] })

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:ca&types=address&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  return NextResponse.json(data)
}
