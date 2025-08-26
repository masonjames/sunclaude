import type { Task } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface SyncJob {
  id: string
  type: 
    | 'google_calendar'                // legacy alias for sync
    | 'google_calendar_sync'
    | 'google_calendar_update'
    | 'google_calendar_delete'
    | 'google_calendar_watch'
    | 'gmail'
    | 'github'
    | 'notion'
    | 'asana'
    | 'slack'
  userId: string
  payload?: any
  priority?: number
  retries?: number
  maxRetries?: number
  createdAt?: Date
  scheduledFor?: Date
}

export interface SyncJobResult {
  success: boolean
  data?: any
  error?: string
  syncedCount?: number
}

// In-memory queue for development (replace with Redis/database queue in production)
const jobQueue: SyncJob[] = []
let isProcessing = false

export async function enqueue(job: SyncJob): Promise<void> {
  console.log(`[SyncEngine] Enqueuing job: ${job.type} for user ${job.userId}`)
  
  const jobWithDefaults: SyncJob = {
    ...job,
    id: job.id || generateJobId(),
    priority: job.priority || 0,
    retries: job.retries || 0,
    maxRetries: job.maxRetries || 3,
    createdAt: new Date(),
    scheduledFor: job.scheduledFor || new Date()
  }
  
  jobQueue.push(jobWithDefaults)
  jobQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue()
  }
}

export async function process(job: SyncJob): Promise<SyncJobResult> {
  console.log(`[SyncEngine] Processing job: ${job.type} for user ${job.userId}`)
  
  try {
    switch (job.type) {
      case 'google_calendar':
      case 'google_calendar_sync':
        return await processGoogleCalendarSync(job)
      case 'google_calendar_update':
        return await processGoogleCalendarUpdate(job)
      case 'google_calendar_delete':
        return await processGoogleCalendarDelete(job)
      case 'google_calendar_watch':
        return await processGoogleCalendarWatch(job)
      case 'gmail':
        return await processGmailSync(job)
      case 'github':
        return await processGithubSync(job)
      case 'notion':
        return await processNotionSync(job)
      case 'asana':
        return await processAsanaSync(job)
      case 'slack':
        return await processSlackSync(job)
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  } catch (error) {
    console.error(`[SyncEngine] Job failed: ${job.type}`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function processQueue(): Promise<void> {
  if (isProcessing) return
  isProcessing = true
  
  try {
    while (jobQueue.length > 0) {
      const job = jobQueue.shift()
      if (!job) continue
      
      // Check if job is scheduled for future
      if (job.scheduledFor && job.scheduledFor > new Date()) {
        jobQueue.unshift(job) // Put back at front
        break
      }
      
      const result = await process(job)
      
      if (!result.success && job.retries! < job.maxRetries!) {
        // Retry with exponential backoff
        job.retries = (job.retries || 0) + 1
        job.scheduledFor = new Date(Date.now() + Math.pow(2, job.retries) * 1000)
        jobQueue.push(job)
        console.log(`[SyncEngine] Retrying job ${job.id} in ${Math.pow(2, job.retries)} seconds`)
      } else if (!result.success) {
        console.error(`[SyncEngine] Job ${job.id} failed after ${job.maxRetries} retries`)
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } finally {
    isProcessing = false
  }
}

// Job processors - integrated with actual services
async function processGoogleCalendarSync(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { syncCalendarEvents } = await import('./integrations/google/calendar')
    const tasks = await syncCalendarEvents(job.userId, job.payload?.calendarId || 'primary')
    return { success: true, syncedCount: tasks.length, data: tasks }
  } catch (error) {
    console.error('[SyncEngine] Google Calendar sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedCount: 0 
    }
  }
}

async function processGoogleCalendarUpdate(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { updateEventFromTask } = await import('./integrations/google/calendar')
    const calendarId: string = job.payload?.calendarId || 'primary'
    let task: Task | null = job.payload?.task || null

    // Fallback: fetch by id if only taskId provided
    const taskId: string | undefined = job.payload?.taskId || job.payload?.task?.id
    if (!task && taskId) {
      task = await prisma.task.findUnique({ where: { id: taskId } })
    }
    if (!task) throw new Error('Missing task or taskId in payload')

    const event = await updateEventFromTask(job.userId, task, calendarId)
    return { success: true, data: event }
  } catch (error) {
    console.error('[SyncEngine] Google Calendar update failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function processGoogleCalendarDelete(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { deleteEventForTask } = await import('./integrations/google/calendar')
    const calendarId: string = job.payload?.calendarId || 'primary'
    const taskId: string | undefined = job.payload?.taskId || job.payload?.task?.id
    if (!taskId) throw new Error('Missing taskId in payload')

    await deleteEventForTask(job.userId, taskId, calendarId)
    return { success: true }
  } catch (error) {
    console.error('[SyncEngine] Google Calendar delete failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function processGoogleCalendarWatch(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { watchCalendar } = await import('./integrations/google/calendar')
    const calendarId: string = job.payload?.calendarId || 'primary'
    const res = await watchCalendar(job.userId, calendarId)
    return { success: true, data: res }
  } catch (error) {
    console.error('[SyncEngine] Google Calendar watch failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function processGmailSync(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { getGmailItems } = await import('./gmail')
    
    if (!job.payload?.accessToken) {
      throw new Error('Access token required for Gmail sync')
    }
    
    const items = await getGmailItems(job.payload.accessToken)
    return { success: true, syncedCount: items.length, data: items }
  } catch (error) {
    console.error('[SyncEngine] Gmail sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedCount: 0 
    }
  }
}

async function processGithubSync(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { getAssignedIssues } = await import('./github')
    
    if (!job.userId) {
      throw new Error('User ID required for GitHub sync')
    }
    
    const items = await getAssignedIssues(job.userId)
    return { success: true, syncedCount: items.length, data: items }
  } catch (error) {
    console.error('[SyncEngine] GitHub sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedCount: 0 
    }
  }
}

async function processNotionSync(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { getNotionItems } = await import('./notion')
    
    if (!job.payload?.accessToken) {
      throw new Error('Access token required for Notion sync')
    }
    
    const items = await getNotionItems(job.payload.accessToken)
    return { success: true, syncedCount: items.length, data: items }
  } catch (error) {
    console.error('[SyncEngine] Notion sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedCount: 0 
    }
  }
}

async function processAsanaSync(job: SyncJob): Promise<SyncJobResult> {
  try {
    const { getAsanaItems } = await import('./asana')
    
    if (!job.payload?.accessToken) {
      throw new Error('Access token required for Asana sync')
    }
    
    const items = await getAsanaItems(job.payload.accessToken)
    return { success: true, syncedCount: items.length, data: items }
  } catch (error) {
    console.error('[SyncEngine] Asana sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedCount: 0 
    }
  }
}

async function processSlackSync(job: SyncJob): Promise<SyncJobResult> {
  try {
    // Slack integration not implemented yet
    return { success: true, syncedCount: 0, data: [] }
  } catch (error) {
    console.error('[SyncEngine] Slack sync failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      syncedCount: 0 
    }
  }
}

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Utility functions for common sync operations
export async function enqueueBulkSync(userId: string, types: SyncJob['type'][]): Promise<void> {
  const jobs = types.map(type => ({
    id: generateJobId(),
    type,
    userId,
    priority: type === 'google_calendar' ? 2 : type === 'asana' ? 1.5 : 1 // Prioritize calendar > asana > others
  }))
  
  for (const job of jobs) {
    await enqueue(job)
  }
}

export function getQueueStatus(): { 
  queueLength: number
  isProcessing: boolean
  jobs: Pick<SyncJob, 'id' | 'type' | 'userId' | 'retries'>[]
} {
  return {
    queueLength: jobQueue.length,
    isProcessing,
    jobs: jobQueue.map(job => ({
      id: job.id,
      type: job.type,
      userId: job.userId,
      retries: job.retries || 0
    }))
  }
}

// Calendar sync convenience helpers
export async function enqueueCalendarSync(userId: string, calendarId?: string): Promise<void> {
  return enqueue({
    id: generateJobId(),
    type: 'google_calendar_sync',
    userId,
    payload: { calendarId },
    priority: 2,
  })
}

export async function enqueueCalendarUpdate(userId: string, task: Task, calendarId?: string): Promise<void> {
  return enqueue({
    id: generateJobId(),
    type: 'google_calendar_update',
    userId,
    payload: { task, calendarId },
    priority: 2,
  })
}

export async function enqueueCalendarDelete(userId: string, taskId: string, calendarId?: string): Promise<void> {
  return enqueue({
    id: generateJobId(),
    type: 'google_calendar_delete',
    userId,
    payload: { taskId, calendarId },
    priority: 2,
  })
}

export async function enqueueCalendarWatch(userId: string, calendarId?: string): Promise<void> {
  return enqueue({
    id: generateJobId(),
    type: 'google_calendar_watch',
    userId,
    payload: { calendarId },
    priority: 2.5, // slightly higher to establish/renew channels promptly
  })
}