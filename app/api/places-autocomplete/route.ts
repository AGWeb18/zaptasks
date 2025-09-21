import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_PLACES_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get('input');

  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        predictions: [],
        error: 'Google Places API key missing. Set GOOGLE_PLACES_API_KEY.',
      },
      { status: 200 },
    );
  }

  const params = new URLSearchParams({
    input,
    key: apiKey,
    components: 'country:ca',
    language: 'en',
    region: 'ca',
  });

  try {
    const response = await fetch(`${GOOGLE_PLACES_ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      throw new Error(`Google Places response ${response.status}`);
    }
    const payload = await response.json();
    return NextResponse.json({ predictions: payload.predictions ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        predictions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
