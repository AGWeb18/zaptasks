import { NextRequest, NextResponse } from 'next/server';

const REVERSE_GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ formattedAddress: null });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        formattedAddress: null,
        error: 'Google API key missing. Set GOOGLE_PLACES_API_KEY.',
      },
      { status: 200 },
    );
  }

  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: apiKey, language: 'en' });

  try {
    const response = await fetch(`${REVERSE_GEOCODE_ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      throw new Error(`Google Geocode response ${response.status}`);
    }
    const payload = await response.json();
    const formattedAddress = payload.results?.[0]?.formatted_address ?? null;
    return NextResponse.json({ formattedAddress });
  } catch (error) {
    return NextResponse.json(
      {
        formattedAddress: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
