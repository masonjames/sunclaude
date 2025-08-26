import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper function to get default user
async function getDefaultUser() {
  const user = await prisma.user.findFirst({
    where: { email: 'user@example.com' }
  })
  
  if (!user) {
    // Create default user if not exists
    return await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Default User',
      }
    })
  }
  
  return user
}

export async function GET() {
  try {
    const user = await getDefaultUser()
    
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        timeEntries: {
          where: { endedAt: null },
          take: 1,
        },
      },
    })
    
    // Add a flag for active timer
    const tasksWithTimerStatus = tasks.map(task => ({
      ...task,
      hasActiveTimer: task.timeEntries.length > 0,
    }))
    
    return NextResponse.json(tasksWithTimerStatus)
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDefaultUser()
    const json = await request.json()
    
    const task = await prisma.task.create({
      data: {
        ...json,
        userId: user.id,
        status: json.status || 'TODO',
        estimatedMinutes: json.estimatedMinutes || 0,
        actualMinutes: json.actualMinutes || 0,
      },
    })
    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json()
    const { id, ...data } = json
    const task = await prisma.task.update({
      where: { id },
      data,
    })
    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: 'Error updating task' }, { status: 500 })
  }
}
