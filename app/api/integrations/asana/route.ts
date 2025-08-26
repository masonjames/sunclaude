import { NextResponse } from 'next/server'
import { getAsanaItems } from '@/services/asana'
import { mockAsanaItems } from '@/services/mock-data'

export async function GET() {
  try {
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json(mockAsanaItems)
    }

    // TODO: Get access token from session/auth
    const accessToken = process.env.ASANA_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Asana not configured' },
        { status: 401 }
      )
    }

    const items = await getAsanaItems(accessToken)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Asana API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Asana items' },
      { status: 500 }
    )
  }
}
