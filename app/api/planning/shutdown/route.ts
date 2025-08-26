import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }
    
    // Get the default user
    const user = await prisma.user.findFirst({
      where: { email: 'user@example.com' },
      include: {
        userSettings: true,
      },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Stop any active timers
    const activeTimer = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
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
            duration,
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
    
    // Get all tasks for the day
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        date,
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
    const totalMinutesWorked = tasks.reduce((acc, task) => acc + task.actualMinutes, 0)
    const totalMinutesEstimated = tasks.reduce((acc, task) => acc + task.estimatedMinutes, 0)
    
    // Handle incomplete tasks based on user settings
    if (user.userSettings?.autoRollover && incompleteTasks.length > 0) {
      const tomorrow = new Date(date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      // Rollover incomplete tasks to tomorrow
      await Promise.all(
        incompleteTasks.map(task =>
          prisma.task.update({
            where: { id: task.id },
            data: {
              date: tomorrowStr,
              status: task.status === 'IN_PROGRESS' ? 'TODO' : task.status,
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
          userId: user.id,
          date,
        },
      },
      update: {
        completedAt: new Date(),
        summary: JSON.stringify(summary),
      },
      create: {
        userId: user.id,
        date,
        completedAt: new Date(),
        summary: JSON.stringify(summary),
      },
    })
    
    // Send Slack summary if webhook URL is configured
    if (user.userSettings?.slackWebhookUrl) {
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
        await fetch(user.userSettings.slackWebhookUrl, {
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
      rolledOverTasks: user.userSettings?.autoRollover ? incompleteTasks.length : 0,
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