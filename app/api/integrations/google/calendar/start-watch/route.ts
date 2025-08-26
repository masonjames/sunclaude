import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { setupCalendarWatch } from '@/services/integrations/google/calendar'

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const calendarId = body.calendarId || 'primary'

    // Set up the watch
    const syncState = await setupCalendarWatch(userId, calendarId)

    return NextResponse.json({
      success: true,
      channelId: syncState.channelId,
      expiration: syncState.expiration,
      message: 'Calendar watch started successfully',
    })
  } catch (error: any) {
    console.error('Error starting calendar watch:', error)
    
    // Handle specific error cases
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please connect your account first.' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('Missing required permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start calendar watch' },
      { status: 500 }
    )
  }
}