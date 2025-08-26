import { NextRequest, NextResponse } from 'next/server'
import { stopTimer } from '@/services/time-tracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
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

    const timer = await stopTimer(user.id)
    
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