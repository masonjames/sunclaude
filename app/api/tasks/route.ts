import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    
    const whereClause: any = {}
    
    // Add date range filtering if provided
    if (start || end) {
      whereClause.date = {}
      if (start) whereClause.date.gte = start
      if (end) whereClause.date.lte = end
    }
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    
    // Validate required fields
    if (!json.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    
    const task = await prisma.task.create({
      data: {
        title: json.title,
        description: json.description || null,
        priority: json.priority || null,
        dueTime: json.dueTime || null,
        date: json.date || new Date().toISOString().split('T')[0], // Default to today
      },
    })
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json()
    const { id, ...data } = json
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }
    
    // Filter out undefined values and only update provided fields
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.dueTime !== undefined) updateData.dueTime = data.dueTime
    if (data.date !== undefined) updateData.date = data.date
    
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Error updating task' }, { status: 500 })
  }
}
