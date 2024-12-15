import { NextResponse } from 'next/server'
import { getLinearItems } from '@/services/linear'
import { mockLinearItems } from '@/services/mock-data'

export async function GET() {
  try {
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json({ items: mockLinearItems })
    }

    // TODO: Get access token from session/auth
    const accessToken = process.env.LINEAR_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Linear not configured' },
        { status: 401 }
      )
    }

    const items = await getLinearItems(accessToken)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Linear API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Linear items' },
      { status: 500 }
    )
  }
}
