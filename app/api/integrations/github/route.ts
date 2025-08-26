import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAssignedIssues, createTaskFromIssue } from '@/services/github'
import { isFeatureEnabled } from '@/lib/flags'

export async function GET() {
  try {
    // Feature flag check
    if (!isFeatureEnabled('github')) {
      return NextResponse.json(
        { error: 'GitHub integration is not enabled' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const items = await getAssignedIssues(session.user.id)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching GitHub items:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch GitHub items' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Feature flag check
    if (!isFeatureEnabled('github')) {
      return NextResponse.json(
        { error: 'GitHub integration is not enabled' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { selections, date, status } = await request.json()
    
    const createdTasks = []
    for (const item of selections) {
      const task = await createTaskFromIssue(session.user.id, item)
      createdTasks.push(task.id)
    }

    return NextResponse.json({ taskIds: createdTasks })
  } catch (error) {
    console.error('Error creating tasks from GitHub items:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tasks' },
      { status: 500 }
    )
  }
}