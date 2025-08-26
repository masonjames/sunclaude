import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { TaskStatus } from '@/types/task'

type ReorderBody = {
  date: string
  status: TaskStatus
  orderedIds: string[]
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date, status, orderedIds }: ReorderBody = await req.json()

    if (!date || !status || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: date, status, orderedIds' },
        { status: 400 }
      )
    }

    // Parse date to DateTime for Prisma
    const plannedDate = new Date(`${date}T00:00:00.000Z`)

    // Update all tasks in the ordered list with their new sort order
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.task.update({
          where: { id },
          data: {
            plannedDate,
            status,
            order: idx,
          },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder tasks:', error)
    return NextResponse.json(
      { error: 'Failed to reorder tasks' },
      { status: 500 }
    )
  }
}