import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: 'Missing API key' }, { status: 500 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')

  if (type === 'autocomplete') {
    const input = searchParams.get('input') || ''
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:ca&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data)
  }

  if (type === 'details') {
    const placeId = searchParams.get('place_id') || ''
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_components,formatted_address&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
