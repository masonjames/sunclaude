import { NextRequest, NextResponse } from 'next/server'
import { stopTimer } from '@/services/time-tracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    // Get authenticated user from session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const timer = await stopTimer(session.user.id)
    
    if (!timer) {
      return NextResponse.json(
        { error: 'No active timer found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(timer)
  } catch (error) {
    console.error('Error stopping timer:', error)
    return NextResponse.json(
      { error: 'Failed to stop timer' },
      { status: 500 }
    )
  }
}