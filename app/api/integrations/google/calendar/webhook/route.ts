import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { syncCalendarEvents } from '@/services/integrations/google/calendar'

// Required for Google Calendar webhooks
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Get webhook headers from Google
    const headersList = headers()
    const channelId = headersList.get('x-goog-channel-id')
    const resourceId = headersList.get('x-goog-resource-id')
    const resourceState = headersList.get('x-goog-resource-state')
    const resourceUri = headersList.get('x-goog-resource-uri')

    console.log('Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      resourceUri,
    })

    // Validate required headers
    if (!channelId || !resourceId || !resourceState) {
      return NextResponse.json(
        { error: 'Missing required Google webhook headers' },
        { status: 400 }
      )
    }

    // Handle sync notification
    if (resourceState === 'sync') {
      // This is just a sync confirmation, acknowledge it
      console.log('Sync notification received for channel:', channelId)
      return NextResponse.json({ success: true })
    }

    // Find the sync state by channel ID
    const syncState = await prisma.googleSyncState.findUnique({
      where: { channelId },
    })

    if (!syncState) {
      console.error('No sync state found for channel:', channelId)
      return NextResponse.json(
        { error: 'Unknown channel ID' },
        { status: 404 }
      )
    }

    // Handle exists notification (actual changes)
    if (resourceState === 'exists') {
      // Perform incremental sync
      console.log('Processing calendar changes for user:', syncState.userId)
      
      try {
        const result = await syncCalendarEvents(
          syncState.userId,
          syncState.calendarId
        )
        
        console.log('Sync completed:', result)
        
        return NextResponse.json({
          success: true,
          ...result,
        })
      } catch (syncError) {
        console.error('Error during calendar sync:', syncError)
        // Return success to prevent Google from retrying
        return NextResponse.json({ success: true })
      }
    }

    // Handle other resource states
    console.log('Unhandled resource state:', resourceState)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling calendar webhook:', error)
    // Return success to prevent Google from retrying
    return NextResponse.json({ success: true })
  }
}