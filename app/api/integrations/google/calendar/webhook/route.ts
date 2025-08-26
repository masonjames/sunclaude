import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncIncremental } from '@/app/services/integrations/google/calendar'

export async function POST(request: NextRequest) {
  console.log('[Calendar Webhook] Received push notification')

  try {
    // Extract Google notification headers
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceId = request.headers.get('x-goog-resource-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const channelToken = request.headers.get('x-goog-channel-token') // userId if set
    const messageNumber = request.headers.get('x-goog-message-number')

    console.log('[Calendar Webhook] Headers:', {
      channelId,
      resourceId,
      resourceState,
      channelToken,
      messageNumber,
    })

    // Validate required headers
    if (!channelId || !resourceId) {
      console.error('[Calendar Webhook] Missing required headers')
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 })
    }

    // Skip sync notification (initial watch setup)
    if (resourceState === 'sync') {
      console.log('[Calendar Webhook] Sync notification, ignoring')
      return NextResponse.json({ status: 'ignored' })
    }

    // Find the sync state record to get userId and calendarId
    const syncState = await prisma.googleSyncState.findFirst({
      where: {
        channelId,
        resourceId,
        expiration: { gt: new Date() }, // ensure not expired
      },
    })

    if (!syncState) {
      console.warn('[Calendar Webhook] No active sync state found for channel:', channelId)
      return NextResponse.json({ error: 'Channel not found or expired' }, { status: 404 })
    }

    console.log('[Calendar Webhook] Found sync state for user:', syncState.userId)

    // Trigger incremental sync for the calendar
    try {
      const syncedTasks = await syncIncremental(syncState.userId, syncState.calendarId)
      console.log(`[Calendar Webhook] Synced ${syncedTasks.length} tasks`)

      return NextResponse.json({
        status: 'success',
        syncedTasks: syncedTasks.length,
        userId: syncState.userId,
        calendarId: syncState.calendarId,
      })
    } catch (syncError) {
      console.error('[Calendar Webhook] Sync failed:', syncError)
      return NextResponse.json(
        { error: 'Sync failed', details: syncError instanceof Error ? syncError.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Calendar Webhook] Request processing failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle verification requests from Google
export async function GET(request: NextRequest) {
  console.log('[Calendar Webhook] Verification request')
  
  // Google may send verification requests; respond with 200 OK
  return NextResponse.json({ status: 'webhook_ready' })
}