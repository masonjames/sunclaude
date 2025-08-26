import { NextResponse } from 'next/server'
import { mockCalendarItems } from '@/services/mock-data'

export async function GET() {
  try {
    // In a real implementation, we would check for environment variables and tokens here
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json(mockCalendarItems)
    }

    // Real implementation would go here
    throw new Error('Google Calendar integration not configured')
  } catch (error) {
    console.error('Error fetching Google Calendar items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google Calendar items' },
      { status: 500 }
    )
  }
}