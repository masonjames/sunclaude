import { WebClient } from '@slack/web-api'
import { prisma } from '@/lib/db'
import { getIntegrationConnection } from '@/lib/oauth/helpers'
import { Task } from '@prisma/client'

/**
 * Get Slack client for a user
 */
async function getSlackClient(userId: string): Promise<WebClient> {
  const connection = await getIntegrationConnection(userId, 'slack')

  if (!connection || !connection.accessToken) {
    throw new Error('Slack not connected. Please connect your Slack workspace first.')
  }

  return new WebClient(connection.accessToken)
}

/**
 * List Slack channels
 */
export async function listChannels(userId: string) {
  const slack = await getSlackClient(userId)

  const result = await slack.conversations.list({
    types: 'public_channel,private_channel',
    limit: 100,
  })

  return result.channels?.map(channel => ({
    id: channel.id,
    name: channel.name,
    is_private: channel.is_private,
    is_member: channel.is_member,
    num_members: channel.num_members,
  })) || []
}

/**
 * Post daily plan to Slack
 */
export async function postDailyPlan(
  userId: string,
  date: Date,
  channelId: string
): Promise<{ ts: string }> {
  const slack = await getSlackClient(userId)
  
  // Get tasks for the specified date
  const dateStr = date.toISOString().split('T')[0]
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      date: dateStr,
    },
    orderBy: [
      { priority: 'desc' },
      { dueTime: 'asc' },
    ],
  })

  if (tasks.length === 0) {
    throw new Error('No tasks found for the specified date')
  }

  // Format tasks for Slack
  const tasksByPriority = {
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low'),
    none: tasks.filter(t => !t.priority),
  }

  // Build message blocks
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📅 Daily Plan for ${date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Total tasks:* ${tasks.length}`,
      },
    },
  ]

  // Add high priority tasks
  if (tasksByPriority.high.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔴 High Priority (${tasksByPriority.high.length})*\n${
          tasksByPriority.high.map(t => 
            `• ${t.dueTime ? `[${t.dueTime}]` : ''} ${t.title}`
          ).join('\n')
        }`,
      },
    })
  }

  // Add medium priority tasks
  if (tasksByPriority.medium.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🟡 Medium Priority (${tasksByPriority.medium.length})*\n${
          tasksByPriority.medium.map(t => 
            `• ${t.dueTime ? `[${t.dueTime}]` : ''} ${t.title}`
          ).join('\n')
        }`,
      },
    })
  }

  // Add low priority tasks
  if (tasksByPriority.low.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🟢 Low Priority (${tasksByPriority.low.length})*\n${
          tasksByPriority.low.map(t => 
            `• ${t.dueTime ? `[${t.dueTime}]` : ''} ${t.title}`
          ).join('\n')
        }`,
      },
    })
  }

  // Add tasks without priority
  if (tasksByPriority.none.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Other Tasks (${tasksByPriority.none.length})*\n${
          tasksByPriority.none.map(t => 
            `• ${t.dueTime ? `[${t.dueTime}]` : ''} ${t.title}`
          ).join('\n')
        }`,
      },
    })
  }

  // Post message to Slack
  const result = await slack.chat.postMessage({
    channel: channelId,
    blocks,
    text: `Daily Plan for ${dateStr}`, // Fallback text
  })

  if (!result.ts) {
    throw new Error('Failed to post message to Slack')
  }

  return { ts: result.ts }
}

/**
 * Handle Slack slash command
 */
export async function handleSlashCommand(payload: {
  user_id: string
  channel_id: string
  command: string
  text: string
  team_id: string
}): Promise<string> {
  // Parse command
  const commandParts = payload.text.trim().split(' ')
  const action = commandParts[0]?.toLowerCase()

  switch (action) {
    case 'today':
      // List today's tasks
      return await getTodayTasksResponse(payload.team_id)
      
    case 'tomorrow':
      // List tomorrow's tasks
      return await getTomorrowTasksResponse(payload.team_id)
      
    case 'add':
      // Add a new task
      const taskTitle = commandParts.slice(1).join(' ')
      if (!taskTitle) {
        return 'Please provide a task title. Usage: /task add [task title]'
      }
      return await addTaskResponse(payload.team_id, taskTitle)
      
    default:
      return `Available commands:
• \`/task today\` - Show today's tasks
• \`/task tomorrow\` - Show tomorrow's tasks
• \`/task add [title]\` - Add a new task for today`
  }
}

async function getTodayTasksResponse(teamId: string): Promise<string> {
  // Find user by Slack team ID (would need to store this in metadata)
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      provider: 'slack',
      metadata: {
        contains: teamId,
      },
    },
  })

  if (!connection) {
    return 'Slack workspace not connected to a user account'
  }

  const today = new Date().toISOString().split('T')[0]
  const tasks = await prisma.task.findMany({
    where: {
      userId: connection.userId,
      date: today,
    },
  })

  if (tasks.length === 0) {
    return 'No tasks for today'
  }

  return `Today's tasks (${tasks.length}):\n${
    tasks.map(t => `• ${t.title}`).join('\n')
  }`
}

async function getTomorrowTasksResponse(teamId: string): Promise<string> {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      provider: 'slack',
      metadata: {
        contains: teamId,
      },
    },
  })

  if (!connection) {
    return 'Slack workspace not connected to a user account'
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  const tasks = await prisma.task.findMany({
    where: {
      userId: connection.userId,
      date: tomorrowStr,
    },
  })

  if (tasks.length === 0) {
    return 'No tasks for tomorrow'
  }

  return `Tomorrow's tasks (${tasks.length}):\n${
    tasks.map(t => `• ${t.title}`).join('\n')
  }`
}

async function addTaskResponse(teamId: string, title: string): Promise<string> {
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      provider: 'slack',
      metadata: {
        contains: teamId,
      },
    },
  })

  if (!connection) {
    return 'Slack workspace not connected to a user account'
  }

  const today = new Date().toISOString().split('T')[0]
  
  await prisma.task.create({
    data: {
      userId: connection.userId,
      title,
      date: today,
      priority: 'medium',
    },
  })

  return `✅ Task added: "${title}"`
}

/**
 * Store Slack OAuth tokens
 */
export async function storeSlackTokens(
  userId: string,
  accessToken: string,
  teamId: string,
  teamName: string,
  scope: string
) {
  return prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: 'slack',
      },
    },
    create: {
      userId,
      provider: 'slack',
      accessToken,
      scope,
      metadata: JSON.stringify({
        teamId,
        teamName,
      }),
    },
    update: {
      accessToken,
      scope,
      metadata: JSON.stringify({
        teamId,
        teamName,
      }),
    },
  })
}