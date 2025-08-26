import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { watchCalendar, stopWatchCalendar } from '@/services/integrations/google/calendar'

export async function POST(request: NextRequest) {
  console.log('[Calendar Watch] Starting watch channel registration')

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const calendarId = body.calendarId || 'primary'

    console.log(`[Calendar Watch] Registering watch for user ${session.user.id}, calendar ${calendarId}`)

    const watchResult = await watchCalendar(session.user.id, calendarId)

    console.log('[Calendar Watch] Registration successful:', watchResult)

    return NextResponse.json({
      success: true,
      channelId: watchResult.channelId,
      resourceId: watchResult.resourceId,
      expiration: watchResult.expiration,
      calendarId,
    })
  } catch (error) {
    console.error('[Calendar Watch] Registration failed:', error)
    
    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { error: 'Insufficient calendar permissions', details: error.message },
          { status: 403 }
        )
      }
      if (error.message.includes('GOOGLE_CALENDAR_WEBHOOK_URL')) {
        return NextResponse.json(
          { error: 'Webhook URL not configured', details: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to register watch channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  console.log('[Calendar Watch] Stopping watch channel')

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId') || 'primary'

    console.log(`[Calendar Watch] Stopping watch for user ${session.user.id}, calendar ${calendarId}`)

    await stopWatchCalendar(session.user.id, calendarId)

    console.log('[Calendar Watch] Watch channel stopped successfully')

    return NextResponse.json({
      success: true,
      message: 'Watch channel stopped',
      calendarId,
    })
  } catch (error) {
    console.error('[Calendar Watch] Stop failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to stop watch channel',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('[Calendar Watch] Getting watch status')

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId') || 'primary'

    // Get current watch state from database
    const { prisma } = await import('@/lib/db')
    const syncState = await prisma.googleSyncState.findFirst({
      where: { 
        userId: session.user.id,
        calendarId,
        expiration: { gt: new Date() }, // only active watches
      },
    })

    if (!syncState) {
      return NextResponse.json({
        isWatching: false,
        calendarId,
        message: 'No active watch channel'
      })
    }

    return NextResponse.json({
      isWatching: true,
      calendarId,
      channelId: syncState.channelId,
      resourceId: syncState.resourceId,
      expiration: syncState.expiration,
      lastSyncAt: syncState.lastSyncAt,
    })
  } catch (error) {
    console.error('[Calendar Watch] Status check failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get watch status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}