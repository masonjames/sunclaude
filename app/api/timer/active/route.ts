import { NextRequest, NextResponse } from 'next/server'
import { getActiveTimer } from '@/services/time-tracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const activeTimer = await getActiveTimer(session.user.id)
    
    if (!activeTimer) {
      return NextResponse.json(null)
    }
    
    // Calculate current duration for display
    const currentDuration = Math.floor(
      (new Date().getTime() - activeTimer.startedAt.getTime()) / 60000
    )
    
    return NextResponse.json({
      ...activeTimer,
      currentDuration,
    })
  } catch (error) {
    console.error('Error getting active timer:', error)
    return NextResponse.json(
      { error: 'Failed to get active timer' },
      { status: 500 }
    )
  }
}