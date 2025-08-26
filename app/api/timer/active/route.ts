import { NextRequest, NextResponse } from 'next/server'
import { getActiveTimer } from '@/services/time-tracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const activeTimer = await getActiveTimer(user.id)
    
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