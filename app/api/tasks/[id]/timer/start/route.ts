import { NextRequest, NextResponse } from 'next/server'
import { startTimer } from '@/services/time-tracking'
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

    const taskId = params.id
    
    const timer = await startTimer(session.user.id, taskId)
    
    return NextResponse.json(timer)
  } catch (error) {
    console.error('Error starting timer:', error)
    return NextResponse.json(
      { error: 'Failed to start timer' },
      { status: 500 }
    )
  }
}