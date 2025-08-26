import { google, calendar_v3 } from 'googleapis'
import { prisma } from '@/lib/db'
import { withGoogleClient } from '@/lib/oauth/google'
import { Task } from '@prisma/client'
import { addHours, addDays } from 'date-fns'

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar']

// Helper: generate a random channel id for watch
function genChannelId(): string {
  return `gcal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// Helper: normalize event start/end to Date objects
function parseEventTimes(event: calendar_v3.Schema$Event): { start?: Date; end?: Date; allDay: boolean } {
  const startStr = event.start?.dateTime || event.start?.date
  const endStr = event.end?.dateTime || event.end?.date
  if (!startStr) return { allDay: false } // invalid
  const allDay = !!event.start?.date && !event.start?.dateTime
  const start = new Date(startStr)
  const end = endStr ? new Date(endStr) : addHours(start, 1)
  return { start, end, allDay }
}

/**
 * Convert a Task to Google Calendar event format
 */
export function taskToGoogleEvent(
  task: Task,
  opts?: { timeZone?: string; forceAllDay?: boolean }
): calendar_v3.Schema$Event {
  // Require scheduled times unless forceAllDay; otherwise create all-day entry if plannedDate exists
  if (!opts?.forceAllDay && (!task.scheduledStart || !task.scheduledEnd)) {
    if (!task.plannedDate) {
      throw new Error('Task must have scheduledStart/scheduledEnd or plannedDate for all-day event')
    }
    return {
      summary: task.title,
      description: task.description || undefined,
      start: { date: task.plannedDate.toISOString().slice(0, 10) },
      // Google all-day events use exclusive end date (next day)
      end: { date: addDays(task.plannedDate, 1).toISOString().slice(0, 10) },
      extendedProperties: { private: { taskId: task.id } },
    }
  }

  return {
    summary: task.title,
    description: task.description || undefined,
    start: {
      dateTime: task.scheduledStart!.toISOString(),
      timeZone: opts?.timeZone,
    },
    end: {
      dateTime: task.scheduledEnd!.toISOString(),
      timeZone: opts?.timeZone,
    },
    extendedProperties: { private: { taskId: task.id } },
  }
}

/**
 * Apply Google Calendar event to create or update a Task
 */
export async function applyGoogleEventToTask(
  userId: string,
  calendarId: string,
  event: calendar_v3.Schema$Event
): Promise<Task> {
  if (!event.id || !event.summary) throw new Error('Invalid event: missing id or summary')

  // Lookup by eventId first
  const existingLink = await prisma.calendarEvent.findFirst({
    where: { userId, provider: 'google', calendarId, eventId: event.id },
    include: { task: true },
  })

  const { start, end, allDay } = parseEventTimes(event)
  if (!start) throw new Error('Invalid event: missing start')

  // Determine task fields from event
  const taskUpdates: Partial<Task> = {
    title: event.summary || undefined,
    description: event.description || undefined,
  }

  if (allDay) {
    taskUpdates.status = 'PLANNED'
    taskUpdates.plannedDate = start
    taskUpdates.scheduledStart = null as any
    taskUpdates.scheduledEnd = null as any
    taskUpdates.estimateMinutes = null as any
  } else {
    taskUpdates.status = 'SCHEDULED'
    taskUpdates.plannedDate = start
    taskUpdates.scheduledStart = start
    taskUpdates.scheduledEnd = end
    taskUpdates.estimateMinutes = Math.round(((end!.getTime() - start.getTime()) / 60000))
  }

  let task: Task

  if (existingLink) {
    // Update existing task minimally to match event
    task = await prisma.task.update({
      where: { id: existingLink.taskId },
      data: {
        title: taskUpdates.title!,
        description: (taskUpdates as any).description ?? null,
        status: taskUpdates.status!,
        plannedDate: taskUpdates.plannedDate!,
        scheduledStart: (taskUpdates as any).scheduledStart || null,
        scheduledEnd: (taskUpdates as any).scheduledEnd || null,
        estimateMinutes: (taskUpdates as any).estimateMinutes || null,
      },
    })

    await prisma.calendarEvent.update({
      where: { id: existingLink.id },
      data: {
        iCalUID: event.iCalUID,
        etag: event.etag,
        sequence: event.sequence ?? undefined,
        start: start,
        end: end!,
        lastSyncedAt: new Date(),
      },
    })
  } else {
    // If not linked, create task and link
    task = await prisma.task.create({
      data: {
        userId,
        title: taskUpdates.title!,
        description: (taskUpdates as any).description ?? null,
        status: taskUpdates.status!,
        plannedDate: taskUpdates.plannedDate!,
        scheduledStart: (taskUpdates as any).scheduledStart || null,
        scheduledEnd: (taskUpdates as any).scheduledEnd || null,
        estimateMinutes: (taskUpdates as any).estimateMinutes || null,
      },
    })

    await prisma.calendarEvent.create({
      data: {
        userId,
        taskId: task.id,
        provider: 'google',
        calendarId,
        eventId: event.id!,
        iCalUID: event.iCalUID,
        start: start,
        end: end!,
        etag: event.etag,
        sequence: event.sequence ?? undefined,
        lastSyncedAt: new Date(),
      },
    })
  }

  return task
}

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
  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    
    // Pass user's timezone for correctness
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    const timeZone = settings?.timezone || 'UTC'
    const eventBody = taskToGoogleEvent(task, { timeZone })

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventBody,
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
  event: calendar_v3.Schema$Event,
  calendarId: string = 'primary'
): Promise<Task> {
  return applyGoogleEventToTask(userId, calendarId, event)
}

/**
 * Update existing Google Calendar event from a task
 */
export async function updateEventFromTask(
  userId: string,
  task: Task,
  calendarId: string = 'primary'
): Promise<calendar_v3.Schema$Event> {
  if (!task.scheduledStart || !task.scheduledEnd) {
    // For MVP require explicit schedule; consider forceAllDay opt-in later
    throw new Error('Task must have scheduledStart and scheduledEnd to update Google event')
  }

  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })

    // Find mapping; create if missing
    const link = await prisma.calendarEvent.findUnique({
      where: { taskId: task.id },
    })

    if (!link) {
      return await createEventFromTask(userId, task, calendarId)
    }

    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    const timeZone = settings?.timezone || 'UTC'
    const requestBody = taskToGoogleEvent(task, { timeZone })
    const res = await calendar.events.patch({
      calendarId: link.calendarId || calendarId,
      eventId: link.eventId,
      requestBody,
      sendUpdates: 'all',
    })

    if (res.data) {
      const { start, end } = parseEventTimes(res.data)
      await prisma.calendarEvent.update({
        where: { id: link.id },
        data: {
          etag: res.data.etag,
          sequence: res.data.sequence ?? undefined,
          iCalUID: res.data.iCalUID,
          start: start || task.scheduledStart!,
          end: end || task.scheduledEnd!,
          lastSyncedAt: new Date(),
        },
      })
    }

    return res.data as calendar_v3.Schema$Event
  })
}

/**
 * Delete Google Calendar event for a task
 */
export async function deleteEventForTask(
  userId: string,
  taskId: string,
  calendarId: string = 'primary'
): Promise<void> {
  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    const link = await prisma.calendarEvent.findUnique({ where: { taskId } })
    if (!link) return

    await calendar.events.delete({
      calendarId: link.calendarId || calendarId,
      eventId: link.eventId,
      sendUpdates: 'all',
    })

    await prisma.calendarEvent.delete({ where: { id: link.id } })
  })
}

/**
 * Incremental sync with syncToken (seed + delta)
 */
export async function syncIncremental(
  userId: string,
  calendarId: string = 'primary'
): Promise<Task[]> {
  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })

    // Load sync state (if any)
    const state = await prisma.googleSyncState.findFirst({
      where: { userId, calendarId },
    })

    const tasksTouched: Task[] = []
    let pageToken: string | undefined
    let syncToken = state?.syncToken
    let needSeed = !syncToken

    // If no syncToken, perform seed in a time window
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 30)

    try {
      do {
        const params: calendar_v3.Params$Resource$Events$List = {
          calendarId,
          singleEvents: true,
          showDeleted: true, // to receive cancellations
          ...(needSeed
            ? { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), orderBy: 'startTime' as const }
            : syncToken ? { syncToken } : {}),
          pageToken,
        }

        const resp = await calendar.events.list(params)
        const items = resp.data.items || []
        for (const ev of items) {
          if (!ev.id) continue

          if (ev.status === 'cancelled') {
            // remote deletion -> unlink and optionally move task back to PLANNED
            const link = await prisma.calendarEvent.findFirst({
              where: { userId, provider: 'google', calendarId, eventId: ev.id },
            })
            if (link) {
              await prisma.calendarEvent.delete({ where: { id: link.id } })
              // Optional: update task status/times
              // await prisma.task.update({ where: { id: link.taskId }, data: { status: 'PLANNED', scheduledStart: null, scheduledEnd: null } })
            }
            continue
          }

          // Skip recurring instances for MVP
          if (ev.recurringEventId) continue

          const task = await applyGoogleEventToTask(userId, calendarId, ev)
          tasksTouched.push(task)
        }

        pageToken = resp.data.nextPageToken || undefined
        if (resp.data.nextSyncToken) {
          syncToken = resp.data.nextSyncToken
          needSeed = false
        }
      } while (pageToken)

      // Persist new syncToken and lastSyncAt
      await prisma.googleSyncState.upsert({
        where: state ? { id: state.id } : { channelId: 'noop' }, // channelId unique forces create path below
        update: { syncToken, lastSyncAt: new Date(), calendarId },
        create: {
          userId,
          resourceId: '', // will be set when watch starts
          channelId: `bootstrap_${calendarId}_${Date.now()}`,
          calendarId,
          expiration: new Date(Date.now() + 1000 * 60 * 60 * 24), // placeholder until watch; not used for syncToken
          syncToken: syncToken || null,
          lastSyncAt: new Date(),
        },
      })

      return tasksTouched
    } catch (err: any) {
      // Handle 410 Gone: invalid sync token -> clear and re-seed
      if (err?.code === 410 || err?.response?.status === 410) {
        await prisma.googleSyncState.updateMany({
          where: { userId, calendarId },
          data: { syncToken: null },
        })
        // Retry once with seeding
        return await syncIncremental(userId, calendarId)
      }
      throw err
    }
  })
}

/**
 * Sync events from Google Calendar
 */
export async function syncCalendarEvents(
  userId: string,
  calendarId: string = 'primary'
) {
  return syncIncremental(userId, calendarId)
}

/**
 * Register watch channel for push notifications
 */
export async function watchCalendar(
  userId: string,
  calendarId: string = 'primary'
): Promise<{ channelId: string; resourceId?: string; expiration?: string | null }> {
  if (!process.env.GOOGLE_CALENDAR_WEBHOOK_URL) {
    throw new Error('GOOGLE_CALENDAR_WEBHOOK_URL is not configured')
  }

  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    const channelId = genChannelId()

    // Stop any existing channel for this user+calendar
    const existing = await prisma.googleSyncState.findFirst({ where: { userId, calendarId } })
    if (existing?.channelId && existing?.resourceId) {
      // Stop previous channel
      await calendar.channels.stop({
        requestBody: { id: existing.channelId, resourceId: existing.resourceId },
      }).catch(() => undefined) // ignore errors on stop
    }

    const resp = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: process.env.GOOGLE_CALENDAR_WEBHOOK_URL!,
        token: userId, // echoed back in X-Goog-Channel-Token (optional)
      },
    })

    // Persist channel metadata
    const expiration = resp.data.expiration ? new Date(Number(resp.data.expiration)) : null
    await prisma.googleSyncState.upsert({
      where: existing ? { id: existing.id } : { channelId }, // new row if none exists
      update: {
        channelId,
        resourceId: resp.data.resourceId || '',
        expiration: expiration || new Date(Date.now() + 1000 * 60 * 60 * 24),
        calendarId,
      },
      create: {
        userId,
        channelId,
        resourceId: resp.data.resourceId || '',
        calendarId,
        expiration: expiration || new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    })

    return { channelId, resourceId: resp.data.resourceId || undefined, expiration: resp.data.expiration || null }
  })
}

/**
 * Stop watch channel for push notifications
 */
export async function stopWatchCalendar(
  userId: string,
  calendarId: string = 'primary'
): Promise<void> {
  return withGoogleClient(userId, async (auth) => {
    const calendar = google.calendar({ version: 'v3', auth })
    const state = await prisma.googleSyncState.findFirst({ where: { userId, calendarId } })
    if (!state?.channelId || !state?.resourceId) return

    await calendar.channels.stop({
      requestBody: { id: state.channelId, resourceId: state.resourceId },
    }).catch(() => undefined)

    await prisma.googleSyncState.update({
      where: { id: state.id },
      data: { channelId: state.channelId, resourceId: state.resourceId, expiration: new Date() }, // mark expired; keep syncToken
    })
  })
}