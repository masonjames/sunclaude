import { NextResponse } from 'next/server'
import { mockGmailItems } from '@/services/mock-data'

export async function GET() {
  try {
    // In a real implementation, we would check for environment variables and tokens here
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json({ items: mockGmailItems })
    }

    // Real implementation would go here
    throw new Error('Gmail integration not configured')
  } catch (error) {
    console.error('Error fetching Gmail items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Gmail items' },
      { status: 500 }
    )
  }
}
