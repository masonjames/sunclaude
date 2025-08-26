export interface SyncJob {
  id: string
  type: 'google_calendar' | 'gmail' | 'github' | 'notion' | 'slack'
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
        return await processGoogleCalendarSync(job)
      case 'gmail':
        return await processGmailSync(job)
      case 'github':
        return await processGithubSync(job)
      case 'notion':
        return await processNotionSync(job)
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

// Job processors (stubs for now - integrate with actual services)
async function processGoogleCalendarSync(job: SyncJob): Promise<SyncJobResult> {
  // TODO: Integrate with app/services/integrations/google/calendar.ts
  await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
  return { success: true, syncedCount: 5 }
}

async function processGmailSync(job: SyncJob): Promise<SyncJobResult> {
  // TODO: Integrate with app/services/integrations/google/gmail.ts
  await new Promise(resolve => setTimeout(resolve, 100))
  return { success: true, syncedCount: 3 }
}

async function processGithubSync(job: SyncJob): Promise<SyncJobResult> {
  // TODO: Integrate with app/services/integrations/github.ts
  await new Promise(resolve => setTimeout(resolve, 100))
  return { success: true, syncedCount: 2 }
}

async function processNotionSync(job: SyncJob): Promise<SyncJobResult> {
  // TODO: Integrate with app/services/integrations/notion.ts
  await new Promise(resolve => setTimeout(resolve, 100))
  return { success: true, syncedCount: 4 }
}

async function processSlackSync(job: SyncJob): Promise<SyncJobResult> {
  // TODO: Integrate with app/services/integrations/slack.ts
  await new Promise(resolve => setTimeout(resolve, 100))
  return { success: true, syncedCount: 1 }
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
    priority: type === 'google_calendar' ? 2 : 1 // Prioritize calendar sync
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