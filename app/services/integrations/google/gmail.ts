import { google, gmail_v1 } from 'googleapis'
import { prisma } from '@/lib/db'
import { withGoogleClient } from '@/lib/oauth/google'
import { Task, ExternalItem } from '@prisma/client'

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

export interface GmailThread {
  id: string
  snippet: string
  subject: string
  from: string
  date: string
  url: string
  labels?: string[]
  unread?: boolean
}

/**
 * List Gmail threads with optional label filtering
 */
export async function listThreads(
  userId: string,
  labelIds: string[] = ['INBOX'],
  maxResults: number = 50
): Promise<GmailThread[]> {
  const oauth2Client = await withGoogleClient(userId, GMAIL_SCOPES)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Build query
  const query = labelIds.map(id => `in:${id.toLowerCase()}`).join(' ')
  
  // List threads
  const response = await gmail.users.threads.list({
    userId: 'me',
    q: query,
    maxResults,
  })

  if (!response.data.threads) {
    return []
  }

  // Get detailed information for each thread
  const threads = await Promise.all(
    response.data.threads.map(async (thread) => {
      const threadDetail = await gmail.users.threads.get({
        userId: 'me',
        id: thread.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      })

      // Get the first message for metadata
      const firstMessage = threadDetail.data.messages?.[0]
      const headers = firstMessage?.payload?.headers || []
      
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
      const date = headers.find(h => h.name === 'Date')?.value || ''
      
      return {
        id: thread.id!,
        snippet: threadDetail.data.snippet || '',
        subject,
        from,
        date,
        url: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`,
        labels: firstMessage?.labelIds,
        unread: firstMessage?.labelIds?.includes('UNREAD'),
      }
    })
  )

  return threads
}

/**
 * Get a single Gmail thread
 */
export async function getThread(
  userId: string,
  threadId: string
): Promise<GmailThread> {
  const oauth2Client = await withGoogleClient(userId, GMAIL_SCOPES)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'Date'],
  })

  const firstMessage = response.data.messages?.[0]
  const headers = firstMessage?.payload?.headers || []
  
  const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
  const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
  const date = headers.find(h => h.name === 'Date')?.value || ''

  return {
    id: response.data.id!,
    snippet: response.data.snippet || '',
    subject,
    from,
    date,
    url: `https://mail.google.com/mail/u/0/#inbox/${response.data.id}`,
    labels: firstMessage?.labelIds,
    unread: firstMessage?.labelIds?.includes('UNREAD'),
  }
}

/**
 * Create a task from a Gmail thread
 */
export async function createTaskFromThread(
  userId: string,
  threadId: string
): Promise<Task> {
  // Get thread details
  const thread = await getThread(userId, threadId)

  // Check if we already have an external item for this thread
  const existingItem = await prisma.externalItem.findUnique({
    where: {
      provider_externalId: {
        provider: 'gmail',
        externalId: threadId,
      },
    },
    include: {
      task: true,
    },
  })

  if (existingItem?.task) {
    return existingItem.task
  }

  // Parse date for the task
  const threadDate = new Date(thread.date)
  const taskDate = threadDate.toISOString().split('T')[0]
  const taskTime = threadDate.toTimeString().substring(0, 5)

  // Create the task
  const task = await prisma.task.create({
    data: {
      userId,
      title: `Email: ${thread.subject}`,
      description: `From: ${thread.from}\n\n${thread.snippet}`,
      date: taskDate,
      dueTime: taskTime,
      priority: thread.unread ? 'high' : 'medium',
    },
  })

  // Create the external item link
  await prisma.externalItem.create({
    data: {
      userId,
      taskId: task.id,
      provider: 'gmail',
      externalId: threadId,
      title: thread.subject,
      description: thread.snippet,
      url: thread.url,
      metadata: JSON.stringify({
        from: thread.from,
        labels: thread.labels,
        unread: thread.unread,
      }),
    },
  })

  // Mark the email as read if configured
  if (thread.unread) {
    await markThreadAsRead(userId, threadId)
  }

  return task
}

/**
 * Mark a Gmail thread as read
 */
export async function markThreadAsRead(
  userId: string,
  threadId: string
): Promise<void> {
  const oauth2Client = await withGoogleClient(userId, GMAIL_SCOPES)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  await gmail.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  })
}

/**
 * Add a label to a Gmail thread
 */
export async function addLabelToThread(
  userId: string,
  threadId: string,
  labelId: string
): Promise<void> {
  const oauth2Client = await withGoogleClient(userId, GMAIL_SCOPES)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  await gmail.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: {
      addLabelIds: [labelId],
    },
  })
}

/**
 * Search Gmail for specific messages
 */
export async function searchGmail(
  userId: string,
  query: string,
  maxResults: number = 25
): Promise<GmailThread[]> {
  const oauth2Client = await withGoogleClient(userId, GMAIL_SCOPES)
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  })

  if (!response.data.messages) {
    return []
  }

  const threads = await Promise.all(
    response.data.messages.map(async (message) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      })

      const headers = msg.data.payload?.headers || []
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
      const date = headers.find(h => h.name === 'Date')?.value || ''

      return {
        id: message.id!,
        snippet: msg.data.snippet || '',
        subject,
        from,
        date,
        url: `https://mail.google.com/mail/u/0/#inbox/${message.threadId}`,
        labels: msg.data.labelIds,
        unread: msg.data.labelIds?.includes('UNREAD'),
      }
    })
  )

  return threads
}