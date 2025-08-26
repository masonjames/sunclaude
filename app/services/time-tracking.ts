import { prisma } from '@/lib/db'
import { TimeEntry } from '@prisma/client'

export async function startTimer(userId: string, taskId: string): Promise<TimeEntry> {
  return await prisma.$transaction(async (tx) => {
    // First, stop any active timer for this user
    const activeTimer = await tx.timeEntry.findFirst({
      where: {
        userId,
        endedAt: null,
      },
    })

    if (activeTimer) {
      // Stop the active timer
      const durationMinutes = Math.floor(
        (new Date().getTime() - activeTimer.startedAt.getTime()) / 60000
      )
      
      await tx.timeEntry.update({
        where: { id: activeTimer.id },
        data: {
          endedAt: new Date(),
          durationMinutes,
        },
      })

      // Update the task's actual minutes
      await tx.task.update({
        where: { id: activeTimer.taskId },
        data: {
          actualMinutes: {
            increment: durationMinutes,
          },
        },
      })
    }

    // Update task status to IN_PROGRESS
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
      },
    })

    // Create new timer entry
    return await tx.timeEntry.create({
      data: {
        userId,
        taskId,
        startedAt: new Date(),
      },
    })
  })
}

export async function stopTimer(userId: string): Promise<TimeEntry | null> {
  return await prisma.$transaction(async (tx) => {
    // Find the active timer
    const activeTimer = await tx.timeEntry.findFirst({
      where: {
        userId,
        endedAt: null,
      },
    })

    if (!activeTimer) {
      return null
    }

    // Calculate duration in minutes
    const durationMinutes = Math.floor(
      (new Date().getTime() - activeTimer.startedAt.getTime()) / 60000
    )

    // Update the timer entry
    const updatedTimer = await tx.timeEntry.update({
      where: { id: activeTimer.id },
      data: {
        endedAt: new Date(),
        durationMinutes,
      },
    })

    // Update the task's actual minutes
    await tx.task.update({
      where: { id: activeTimer.taskId },
      data: {
        actualMinutes: {
          increment: durationMinutes,
        },
      },
    })

    return updatedTimer
  })
}

export async function getActiveTimer(userId: string): Promise<TimeEntry | null> {
  return await prisma.timeEntry.findFirst({
    where: {
      userId,
      endedAt: null,
    },
    include: {
      task: true,
    },
  })
}