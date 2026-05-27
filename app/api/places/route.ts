import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const KEY = process.env.GOOGLE_PLACES_API_KEY
  console.log('[places] Google API key exists:', !!KEY)

  if (!KEY) {
    console.error('[places] GOOGLE_PLACES_API_KEY is not set')
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  console.log('[places] type:', type)

  if (type === 'autocomplete') {
    const input = searchParams.get('input') || ''
    const placeTypes = searchParams.get('place_types') || 'address'
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:ca&types=${encodeURIComponent(placeTypes)}&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    console.log('[places] autocomplete status:', data.status, 'predictions:', data.predictions?.length ?? 0)
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[places] Google API error:', data.status, data.error_message)
    }
    return NextResponse.json(data)
  }

  if (type === 'details') {
    const placeId = searchParams.get('place_id') || ''
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_components,formatted_address&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    console.log('[places] details status:', data.status)
    if (data.status && data.status !== 'OK') {
      console.error('[places] Google details error:', data.status, data.error_message)
    }
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
