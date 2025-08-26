import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncCalendarEvents } from '@/services/integrations/google/calendar'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { calendarId = 'primary' } = await request.json()

    const syncedTasks = await syncCalendarEvents(session.user.id, calendarId)

    return NextResponse.json({
      success: true,
      syncedTasks: syncedTasks.length,
      tasks: syncedTasks,
    })
  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar events' },
      { status: 500 }
    )
  }
}