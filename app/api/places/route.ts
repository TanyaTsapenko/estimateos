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

    const body: Record<string, unknown> = {
      input,
      includedRegionCodes: ['ca'],
    }
    if (placeTypes !== 'address') {
      body.includedPrimaryTypes = [placeTypes.replace(/[()]/g, '')]
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    console.log('[places] autocomplete suggestions:', data.suggestions?.length ?? 0)
    if (!res.ok) {
      console.error('[places] autocomplete error:', data)
      return NextResponse.json({ predictions: [] })
    }

    // Normalize to the shape the frontend expects
    const predictions = (data.suggestions ?? []).map((s: {
      placePrediction: {
        placeId: string
        structuredFormat: { mainText: { text: string }; secondaryText: { text: string } }
      }
    }) => ({
      place_id: s.placePrediction.placeId,
      structured_formatting: {
        main_text: s.placePrediction.structuredFormat?.mainText?.text ?? '',
        secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
      },
    }))
    return NextResponse.json({ predictions })
  }

  if (type === 'details') {
    const placeId = searchParams.get('place_id') || ''
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'addressComponents,formattedAddress',
      },
    })
    const data = await res.json()
    console.log('[places] details ok:', res.ok)
    if (!res.ok) {
      console.error('[places] details error:', data)
      return NextResponse.json({ result: null }, { status: 502 })
    }

    // Normalize to legacy shape the frontend expects: { result: { address_components } }
    const address_components = (data.addressComponents ?? []).map((c: {
      types: string[]
      longText: string
      shortText: string
    }) => ({
      types: c.types,
      long_name: c.longText,
      short_name: c.shortText,
    }))
    return NextResponse.json({ result: { address_components, formatted_address: data.formattedAddress } })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
