import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, addDays } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }
    
    // Get authenticated user from session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    
    // Get user settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    })
    
    // Stop any active timers
    const activeTimer = await prisma.timeEntry.findFirst({
      where: {
        userId,
        endedAt: null,
      },
    })
    
    if (activeTimer) {
      const duration = Math.floor(
        (new Date().getTime() - activeTimer.startedAt.getTime()) / 60000
      )
      
      await prisma.$transaction([
        prisma.timeEntry.update({
          where: { id: activeTimer.id },
          data: {
            endedAt: new Date(),
            durationMinutes: duration,
          },
        }),
        prisma.task.update({
          where: { id: activeTimer.taskId },
          data: {
            actualMinutes: {
              increment: duration,
            },
          },
        }),
      ])
    }
    
    const shutdownDate = startOfDay(new Date(date))
    
    // Get all tasks for the day
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        plannedDate: shutdownDate,
      },
      include: {
        timeEntries: true,
      },
    })
    
    // Calculate statistics
    const completedTasks = tasks.filter(task => task.status === 'DONE')
    const plannedTasks = tasks.filter(task => task.status === 'PLANNED')
    const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS')
    const incompleteTasks = [...plannedTasks, ...inProgressTasks]
    
    // Calculate total time spent
    const totalMinutesWorked = tasks.reduce((acc, task) => acc + (task.actualMinutes || 0), 0)
    const totalMinutesEstimated = tasks.reduce((acc, task) => acc + (task.estimateMinutes || 0), 0)
    
    // Handle incomplete tasks based on user settings
    if (userSettings?.autoRollover && incompleteTasks.length > 0) {
      const tomorrow = addDays(shutdownDate, 1)
      
      // Rollover incomplete tasks to tomorrow
      await Promise.all(
        incompleteTasks.map(task =>
          prisma.task.update({
            where: { id: task.id },
            data: {
              plannedDate: tomorrow,
              status: task.status === 'IN_PROGRESS' ? 'PLANNED' : task.status,
            },
          })
        )
      )
    }
    
    // Create or update daily plan summary
    const summary = {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      incompleteTasks: incompleteTasks.length,
      totalMinutesWorked,
      totalMinutesEstimated,
      accuracyPercentage: totalMinutesEstimated > 0 
        ? Math.round((totalMinutesWorked / totalMinutesEstimated) * 100)
        : 0,
    }
    
    const dailyPlan = await prisma.dailyPlan.upsert({
      where: {
        userId_date: {
          userId,
          date: shutdownDate,
        },
      },
      update: {
        completedAt: new Date(),
        summary: JSON.stringify(summary),
      },
      create: {
        userId,
        date: shutdownDate,
        completedAt: new Date(),
        summary: JSON.stringify(summary),
        capacityMinutes: userSettings?.defaultDailyCapacityMinutes || 360,
        plannedMinutes: totalMinutesEstimated,
      },
    })
    
    // Send Slack summary if webhook URL is configured
    if (userSettings?.slackWebhookUrl) {
      const slackMessage = {
        text: `Daily Shutdown Summary for ${date}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📊 Daily Summary - ${date}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Tasks Completed:*\n${completedTasks.length}/${tasks.length}`,
              },
              {
                type: 'mrkdwn',
                text: `*Time Worked:*\n${Math.floor(totalMinutesWorked / 60)}h ${totalMinutesWorked % 60}m`,
              },
              {
                type: 'mrkdwn',
                text: `*Estimation Accuracy:*\n${summary.accuracyPercentage}%`,
              },
              {
                type: 'mrkdwn',
                text: `*Tasks Rolled Over:*\n${incompleteTasks.length}`,
              },
            ],
          },
        ],
      }
      
      try {
        await fetch(userSettings.slackWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackMessage),
        })
      } catch (error) {
        console.error('Failed to send Slack notification:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      summary,
      rolledOverTasks: userSettings?.autoRollover ? incompleteTasks.length : 0,
      dailyPlan,
    })
  } catch (error) {
    console.error('Error during daily shutdown:', error)
    return NextResponse.json(
      { error: 'Failed to complete daily shutdown' },
      { status: 500 }
    )
  }
}