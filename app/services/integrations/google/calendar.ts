import { google, calendar_v3 } from 'googleapis'
import { prisma } from '@/lib/db'
import { withGoogleClient } from '@/lib/oauth/google'
import { Task, CalendarEvent, GoogleSyncState } from '@prisma/client'
import { addHours, parseISO } from 'date-fns'

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar']

/**
 * Convert a Google Calendar event to a Task
 */
export async function upsertTaskFromEvent(
  userId: string,
  event: calendar_v3.Schema$Event
): Promise<Task> {
  if (!event.id || !event.summary) {
    throw new Error('Invalid event: missing id or summary')
  }

  // Parse event dates
  const startDate = event.start?.dateTime || event.start?.date
  const endDate = event.end?.dateTime || event.end?.date
  
  if (!startDate) {
    throw new Error('Invalid event: missing start date')
  }

  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : addHours(start, 1)

  // Check if we already have a calendar event for this
  const existingCalendarEvent = await prisma.calendarEvent.findUnique({
    where: {
      provider_externalId: {
        provider: 'google',
        externalId: event.id,
      },
    },
    include: {
      task: true,
    },
  })

  // Prepare task data
  const taskData = {
    title: event.summary,
    description: event.description || undefined,
    date: start.toISOString().split('T')[0],
    dueTime: start.toTimeString().substring(0, 5),
    scheduledStart: start,
    scheduledEnd: end,
    userId,
  }

  let task: Task

  if (existingCalendarEvent?.task) {
    // Update existing task
    task = await prisma.task.update({
      where: { id: existingCalendarEvent.task.id },
      data: taskData,
    })
  } else {
    // Create new task
    task = await prisma.task.create({
      data: taskData,
    })
  }

  // Upsert the calendar event record
  await prisma.calendarEvent.upsert({
    where: {
      provider_externalId: {
        provider: 'google',
        externalId: event.id,
      },
    },
    create: {
      userId,
      taskId: task.id,
      provider: 'google',
      externalId: event.id,
      iCalUID: event.iCalUID || undefined,
      summary: event.summary,
      description: event.description || undefined,
      start,
      end,
    },
    update: {
      taskId: task.id,
      summary: event.summary,
      description: event.description || undefined,
      start,
      end,
      iCalUID: event.iCalUID || undefined,
    },
  })

  return task
}

/**
 * Create or update a Google Calendar event from a Task
 */
export async function createOrUpdateEventFromTask(
  userId: string,
  taskId: string
): Promise<CalendarEvent> {
  const oauth2Client = await withGoogleClient(userId, CALENDAR_SCOPES)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Get the task with its calendar event if it exists
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      calendarEvents: {
        where: { provider: 'google' },
      },
    },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  // Prepare event data
  const eventData: calendar_v3.Schema$Event = {
    summary: task.title,
    description: task.description || undefined,
    start: {
      dateTime: task.scheduledStart?.toISOString() || 
                `${task.date}T${task.dueTime || '09:00'}:00`,
      timeZone: 'UTC',
    },
    end: {
      dateTime: task.scheduledEnd?.toISOString() || 
                addHours(
                  task.scheduledStart || parseISO(`${task.date}T${task.dueTime || '09:00'}`),
                  1
                ).toISOString(),
      timeZone: 'UTC',
    },
  }

  let googleEvent: calendar_v3.Schema$Event
  let calendarEvent = task.calendarEvents[0]

  // Get user settings for default calendar
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
  })
  const calendarId = userSettings?.defaultCalendarId || 'primary'

  if (calendarEvent) {
    // Update existing event
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId: calendarEvent.externalId,
        requestBody: eventData,
      })
      googleEvent = response.data
    } catch (error: any) {
      if (error.code === 404) {
        // Event was deleted on Google side, recreate it
        const response = await calendar.events.insert({
          calendarId,
          requestBody: eventData,
        })
        googleEvent = response.data
      } else {
        throw error
      }
    }
  } else {
    // Create new event
    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData,
    })
    googleEvent = response.data
  }

  if (!googleEvent.id) {
    throw new Error('Failed to create/update Google Calendar event')
  }

  // Update or create the CalendarEvent record
  const updatedCalendarEvent = await prisma.calendarEvent.upsert({
    where: {
      provider_externalId: {
        provider: 'google',
        externalId: googleEvent.id,
      },
    },
    create: {
      userId,
      taskId,
      provider: 'google',
      externalId: googleEvent.id,
      iCalUID: googleEvent.iCalUID || undefined,
      summary: googleEvent.summary!,
      description: googleEvent.description || undefined,
      start: new Date(googleEvent.start?.dateTime || googleEvent.start?.date!),
      end: new Date(googleEvent.end?.dateTime || googleEvent.end?.date!),
    },
    update: {
      summary: googleEvent.summary!,
      description: googleEvent.description || undefined,
      start: new Date(googleEvent.start?.dateTime || googleEvent.start?.date!),
      end: new Date(googleEvent.end?.dateTime || googleEvent.end?.date!),
      iCalUID: googleEvent.iCalUID || undefined,
    },
  })

  return updatedCalendarEvent
}

/**
 * Delete a Google Calendar event associated with a task
 */
export async function deleteEventForTask(
  userId: string,
  taskId: string
): Promise<void> {
  const oauth2Client = await withGoogleClient(userId, CALENDAR_SCOPES)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Find the calendar event
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: {
      taskId,
      provider: 'google',
    },
  })

  if (!calendarEvent) {
    return // No event to delete
  }

  // Get user settings for calendar ID
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
  })
  const calendarId = userSettings?.defaultCalendarId || 'primary'

  try {
    // Delete from Google Calendar
    await calendar.events.delete({
      calendarId,
      eventId: calendarEvent.externalId,
    })
  } catch (error: any) {
    if (error.code !== 404) {
      throw error // Only ignore if event is already deleted
    }
  }

  // Delete the CalendarEvent record
  await prisma.calendarEvent.delete({
    where: { id: calendarEvent.id },
  })
}

/**
 * Set up a watch channel for real-time calendar updates
 */
export async function setupCalendarWatch(
  userId: string,
  calendarId: string = 'primary'
): Promise<GoogleSyncState> {
  const oauth2Client = await withGoogleClient(userId, CALENDAR_SCOPES)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Generate a unique channel ID
  const channelId = `cal-${userId}-${Date.now()}`
  
  // Set up the watch
  const response = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: process.env.GOOGLE_CALENDAR_WEBHOOK_URL!,
      expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    },
  })

  // Save the sync state
  const syncState = await prisma.googleSyncState.upsert({
    where: {
      userId_calendarId: {
        userId,
        calendarId,
      },
    },
    create: {
      userId,
      calendarId,
      channelId,
      resourceId: response.data.resourceId!,
      expiration: response.data.expiration 
        ? new Date(parseInt(response.data.expiration))
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      channelId,
      resourceId: response.data.resourceId!,
      expiration: response.data.expiration 
        ? new Date(parseInt(response.data.expiration))
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return syncState
}

/**
 * Stop watching a calendar for updates
 */
export async function stopCalendarWatch(
  userId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const oauth2Client = await withGoogleClient(userId, CALENDAR_SCOPES)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Get the sync state
  const syncState = await prisma.googleSyncState.findUnique({
    where: {
      userId_calendarId: {
        userId,
        calendarId,
      },
    },
  })

  if (!syncState || !syncState.channelId || !syncState.resourceId) {
    return // No watch to stop
  }

  try {
    // Stop the watch
    await calendar.channels.stop({
      requestBody: {
        id: syncState.channelId,
        resourceId: syncState.resourceId,
      },
    })
  } catch (error) {
    // Ignore errors when stopping watch
    console.error('Error stopping calendar watch:', error)
  }

  // Clear the sync state
  await prisma.googleSyncState.update({
    where: { id: syncState.id },
    data: {
      channelId: null,
      resourceId: null,
      expiration: null,
    },
  })
}

/**
 * Perform an incremental sync of calendar events
 */
export async function syncCalendarEvents(
  userId: string,
  calendarId: string = 'primary'
): Promise<{ created: number; updated: number; deleted: number }> {
  const oauth2Client = await withGoogleClient(userId, CALENDAR_SCOPES)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Get the sync state
  const syncState = await prisma.googleSyncState.findUnique({
    where: {
      userId_calendarId: {
        userId,
        calendarId,
      },
    },
  })

  let syncToken = syncState?.syncToken
  let pageToken: string | undefined
  let created = 0
  let updated = 0
  let deleted = 0

  do {
    const response = await calendar.events.list({
      calendarId,
      syncToken: syncToken || undefined,
      pageToken,
      maxResults: 100,
      showDeleted: true,
      singleEvents: true,
      orderBy: syncToken ? undefined : 'startTime',
      timeMin: syncToken ? undefined : new Date().toISOString(),
    })

    // Process events
    if (response.data.items) {
      for (const event of response.data.items) {
        if (!event.id) continue

        if (event.status === 'cancelled') {
          // Event was deleted
          const calendarEvent = await prisma.calendarEvent.findUnique({
            where: {
              provider_externalId: {
                provider: 'google',
                externalId: event.id,
              },
            },
          })

          if (calendarEvent) {
            await prisma.calendarEvent.delete({
              where: { id: calendarEvent.id },
            })
            deleted++
          }
        } else if (event.summary && (event.start?.dateTime || event.start?.date)) {
          // Event was created or updated
          const existingEvent = await prisma.calendarEvent.findUnique({
            where: {
              provider_externalId: {
                provider: 'google',
                externalId: event.id,
              },
            },
          })

          await upsertTaskFromEvent(userId, event)
          
          if (existingEvent) {
            updated++
          } else {
            created++
          }
        }
      }
    }

    pageToken = response.data.nextPageToken || undefined
    
    // Save the sync token for next time
    if (response.data.nextSyncToken) {
      await prisma.googleSyncState.upsert({
        where: {
          userId_calendarId: {
            userId,
            calendarId,
          },
        },
        create: {
          userId,
          calendarId,
          syncToken: response.data.nextSyncToken,
          lastSyncAt: new Date(),
        },
        update: {
          syncToken: response.data.nextSyncToken,
          lastSyncAt: new Date(),
        },
      })
    }
  } while (pageToken)

  return { created, updated, deleted }
}

/**
 * List calendar events for a user
 */
export async function listCalendarEvents(
  userId: string,
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<calendar_v3.Schema$Event[]> {
  const oauth2Client = await withGoogleClient(userId, CALENDAR_SCOPES)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin?.toISOString() || new Date().toISOString(),
    timeMax: timeMax?.toISOString() || addHours(new Date(), 24 * 7).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  return response.data.items || []
}