import { google, calendar_v3 } from 'googleapis'
import { prisma } from '@/lib/db'
import { withGoogleClient } from '@/lib/oauth/google'
import { Task } from '@prisma/client'
import { addHours } from 'date-fns'

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar']

/**
 * Get user's calendar list
 */
export async function getCalendars(userId: string) {
  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    const response = await calendar.calendarList.list()
    return response.data.items || []
  })
}

/**
 * Create a calendar event from a task
 */
export async function createEventFromTask(
  userId: string,
  task: Task,
  calendarId: string = 'primary'
): Promise<calendar_v3.Schema$Event> {
  if (!task.scheduledStart || !task.scheduledEnd) {
    throw new Error('Task must have scheduled start and end times')
  }

  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    
    const event: calendar_v3.Schema$Event = {
      summary: task.title,
      description: task.description || undefined,
      start: {
        dateTime: task.scheduledStart!.toISOString(),
      },
      end: {
        dateTime: task.scheduledEnd!.toISOString(),
      },
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    })

    // Create CalendarEvent record to link task and event
    if (response.data.id) {
      await prisma.calendarEvent.create({
        data: {
          userId,
          taskId: task.id,
          provider: 'google',
          calendarId,
          eventId: response.data.id,
          iCalUID: response.data.iCalUID,
          start: task.scheduledStart!,
          end: task.scheduledEnd!,
          etag: response.data.etag,
          sequence: response.data.sequence,
          lastSyncedAt: new Date(),
        },
      })
    }

    return response.data
  })
}

/**
 * Convert a Google Calendar event to a Task
 */
export async function createTaskFromEvent(
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

  // Check if we already have a task for this event
  const existingCalendarEvent = await prisma.calendarEvent.findFirst({
    where: {
      provider: 'google',
      eventId: event.id,
      userId,
    },
    include: {
      task: true,
    },
  })

  if (existingCalendarEvent) {
    return existingCalendarEvent.task
  }

  // Create new task
  const task = await prisma.task.create({
    data: {
      userId,
      title: event.summary,
      description: event.description || null,
      status: 'SCHEDULED',
      plannedDate: start,
      scheduledStart: start,
      scheduledEnd: end,
      estimateMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
    },
  })

  // Create CalendarEvent link
  await prisma.calendarEvent.create({
    data: {
      userId,
      taskId: task.id,
      provider: 'google',
      calendarId: 'primary', // This would come from the event context
      eventId: event.id,
      iCalUID: event.iCalUID,
      start: start,
      end: end,
      etag: event.etag,
      sequence: event.sequence,
      lastSyncedAt: new Date(),
    },
  })

  return task
}

/**
 * Sync events from Google Calendar
 */
export async function syncCalendarEvents(
  userId: string,
  calendarId: string = 'primary'
) {
  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    
    // Get recent events (last 30 days, next 30 days)
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 30)
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []
    const syncedTasks = []

    for (const event of events) {
      try {
        if (event.summary && event.start?.dateTime) {
          const task = await createTaskFromEvent(userId, event)
          syncedTasks.push(task)
        }
      } catch (error) {
        console.error('Error syncing event:', event.id, error)
      }
    }

    return syncedTasks
  })
}