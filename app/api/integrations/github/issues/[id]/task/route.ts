import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { createTaskFromIssue } from '@/services/integrations/github'

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

    // The ID should be in format: owner/repo/number
    const { id } = await params
    const issueId = decodeURIComponent(id)

    // Create task from issue
    const task = await createTaskFromIssue(userId, issueId)

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        date: task.date,
        priority: task.priority,
      },
      message: 'Task created from GitHub issue successfully',
    })
  } catch (error: any) {
    console.error('Error creating task from GitHub issue:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please sign in with GitHub first.' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('Invalid issue ID')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create task from issue' },
      { status: 500 }
    )
  }
}