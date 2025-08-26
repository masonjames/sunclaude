import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { stopCalendarWatch } from '@/services/integrations/google/calendar'

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

    // Stop the watch
    await stopCalendarWatch(userId, calendarId)

    return NextResponse.json({
      success: true,
      message: 'Calendar watch stopped successfully',
    })
  } catch (error: any) {
    console.error('Error stopping calendar watch:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to stop calendar watch' },
      { status: 500 }
    )
  }
}