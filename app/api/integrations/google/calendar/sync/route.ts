import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { syncCalendarEvents, listCalendarEvents } from '@/services/integrations/google/calendar'

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

    // Perform sync
    const result = await syncCalendarEvents(userId, calendarId)

    return NextResponse.json({
      success: true,
      ...result,
      message: `Synced ${result.created} new, ${result.updated} updated, ${result.deleted} deleted events`,
    })
  } catch (error: any) {
    console.error('Error syncing calendar:', error)
    
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
      { error: 'Failed to sync calendar' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const calendarId = searchParams.get('calendarId') || 'primary'
    const timeMin = searchParams.get('timeMin') 
      ? new Date(searchParams.get('timeMin')!)
      : undefined
    const timeMax = searchParams.get('timeMax')
      ? new Date(searchParams.get('timeMax')!)
      : undefined

    // List calendar events
    const events = await listCalendarEvents(userId, calendarId, timeMin, timeMax)

    // Transform events to a simpler format for the UI
    const items = events.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description,
      dueDate: event.start?.dateTime || event.start?.date,
      priority: event.importance === 'high' ? 'high' : 'medium',
    }))

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error listing calendar events:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please connect your account first.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to list calendar events' },
      { status: 500 }
    )
  }
}