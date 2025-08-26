import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, isIntegrationConnected } from '@/lib/oauth/helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { provider } = await params

    // Map provider paths to actual provider names
    let actualProvider = provider
    if (provider === 'google') {
      // Check for Google with calendar scope
      actualProvider = 'google'
    }

    // Check connection status
    const connected = await isIntegrationConnected(userId, actualProvider)

    return NextResponse.json({ connected })
  } catch (error) {
    console.error('Error checking integration status:', error)
    return NextResponse.json(
      { error: 'Failed to check integration status' },
      { status: 500 }
    )
  }
}