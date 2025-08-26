import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    
    const whereClause: any = {
      userId: session.user.id, // Scope tasks to authenticated user
    }
    
    // Add date range filtering if provided
    if (start || end) {
      whereClause.plannedDate = {}
      if (start) whereClause.plannedDate.gte = new Date(start)
      if (end) whereClause.plannedDate.lte = new Date(end)
    }
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [
        { plannedDate: 'asc' },
        { status: 'asc' },
        { order: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        timeEntries: {
          where: { endedAt: null },
          take: 1,
        },
      },
    })
    
    // Transform tasks to include legacy date field for backward compatibility and timer status
    const transformedTasks = tasks.map(task => ({
      ...task,
      date: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : null,
      plannedDate: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : null,
      sortOrder: task.order,
      hasActiveTimer: task.timeEntries.length > 0,
    }))
    
    return NextResponse.json(transformedTasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const json = await request.json()
    
    // Validate required fields
    if (!json.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    
    // Handle both plannedDate and legacy date field
    const dateValue = json.plannedDate || json.date
    
    const task = await prisma.task.create({
      data: {
        userId: session.user.id, // Associate with authenticated user
        title: json.title,
        description: json.description || null,
        priority: json.priority || 'MEDIUM',
        status: json.status || 'BACKLOG',
        plannedDate: dateValue ? new Date(dateValue) : new Date(),
        dueDate: json.dueDate ? new Date(json.dueDate) : null,
        estimateMinutes: json.estimateMinutes || null,
        scheduledStart: json.scheduledStart ? new Date(json.scheduledStart) : null,
        scheduledEnd: json.scheduledEnd ? new Date(json.scheduledEnd) : null,
        order: json.sortOrder ?? 0,
      },
    })
    
    // Transform task to include legacy date field for backward compatibility
    const transformedTask = {
      ...task,
      date: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : null,
      plannedDate: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : null,
      sortOrder: task.order,
    }
    
    return NextResponse.json(transformedTask)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const json = await request.json()
    const { id, ...data } = json
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }
    
    // Verify task ownership before updating
    const existingTask = await prisma.task.findFirst({
      where: { 
        id,
        userId: session.user.id // Ensure user owns the task
      }
    })
    
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }
    
    // Filter out undefined values and only update provided fields
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.status !== undefined) updateData.status = data.status
    
    // Handle both plannedDate and legacy date field
    if (data.plannedDate !== undefined) updateData.plannedDate = data.plannedDate ? new Date(data.plannedDate) : null
    else if (data.date !== undefined) updateData.plannedDate = data.date ? new Date(data.date) : null
    
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    if (data.estimateMinutes !== undefined) updateData.estimateMinutes = data.estimateMinutes
    if (data.actualMinutes !== undefined) updateData.actualMinutes = data.actualMinutes
    if (data.order !== undefined) updateData.order = data.order
    if (data.sortOrder !== undefined) updateData.order = data.sortOrder
    if (data.scheduledStart !== undefined) updateData.scheduledStart = data.scheduledStart ? new Date(data.scheduledStart) : null
    if (data.scheduledEnd !== undefined) updateData.scheduledEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : null
    
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    })
    
    // Transform task to include legacy date field for backward compatibility
    const transformedTask = {
      ...task,
      date: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : null,
      plannedDate: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : null,
      sortOrder: task.order,
    }
    
    return NextResponse.json(transformedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Error updating task' }, { status: 500 })
  }
}
