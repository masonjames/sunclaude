import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { postDailyPlan } from '@/services/integrations/slack'

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
    const { date, channelId } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // Parse date or use today
    const planDate = date ? new Date(date) : new Date()

    // Post the daily plan
    const result = await postDailyPlan(userId, planDate, channelId)

    return NextResponse.json({
      success: true,
      messageTimestamp: result.ts,
      message: 'Daily plan posted to Slack successfully',
    })
  } catch (error: any) {
    console.error('Error posting daily plan to Slack:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Slack not connected. Please connect your Slack workspace first.' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('No tasks found')) {
      return NextResponse.json(
        { error: 'No tasks found for the specified date' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to post daily plan to Slack' },
      { status: 500 }
    )
  }
}