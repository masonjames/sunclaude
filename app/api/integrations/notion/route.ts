import { NextResponse } from 'next/server'
import { mockNotionItems } from '@/services/mock-data'

export async function GET() {
  try {
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json({ items: mockNotionItems })
    }

    // Real implementation would go here
    throw new Error('Notion integration not configured')
  } catch (error) {
    console.error('Error fetching Notion items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Notion items' },
      { status: 500 }
    )
  }
}
