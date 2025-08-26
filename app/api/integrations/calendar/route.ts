import { NextResponse } from 'next/server'
import { getCalendarItems } from '@/services/calendar'
import { mockCalendarItems } from '@/services/mock-data'

export async function GET() {
  try {
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json(mockCalendarItems)
    }

    // TODO: Get access token from session/auth
    const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Calendar not configured' },
        { status: 401 }
      )
    }

    const items = await getCalendarItems(accessToken)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Calendar items' },
      { status: 500 }
    )
  }
}
