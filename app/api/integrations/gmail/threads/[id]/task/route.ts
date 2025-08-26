import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { createTaskFromThread } from '@/services/integrations/google/gmail'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: threadId } = await params

    // Create task from thread
    const task = await createTaskFromThread(userId, threadId)

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        date: task.date,
        dueTime: task.dueTime,
        priority: task.priority,
      },
      message: 'Task created from email successfully',
    })
  } catch (error: any) {
    console.error('Error creating task from Gmail thread:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Google account with Gmail permissions.' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('Missing required permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create task from email' },
      { status: 500 }
    )
  }
}