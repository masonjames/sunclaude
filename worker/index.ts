/* eslint-disable no-console */
import { Worker } from 'bullmq'
import { bullQueue, queueName } from '../app/lib/queue/bullmq'
import dotenv from 'dotenv'

// Load env when running standalone
dotenv.config()

const connection = {
  ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}),
} as any

async function main() {
  const worker = new Worker(
    queueName,
    async (job) => {
      const { processJob } = await import('../app/services/sync-engine')
      const res = await processJob(job.data)
      return res
    },
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    }
  )

  worker.on('completed', (job, result) => {
    console.log(`[worker] ✔ completed ${job.name} (${job.id})`, result?.syncedCount ? `synced=${result.syncedCount}` : '')
  })
  worker.on('failed', (job, err) => {
    console.error(`[worker] ✖ failed ${job?.name} (${job?.id})`, err)
  })

  // Register a daily repeatable job for watch renewal
  const cron = process.env.WATCH_RENEW_CRON || '0 3 * * *'
  await bullQueue.add(
    'google_calendar_watch_renew',
    {},
    {
      repeat: { pattern: cron },
      jobId: 'google-calendar-watch-renew-daily',
      removeOnComplete: true,
      removeOnFail: 100,
    }
  )
  console.log(`[worker] Scheduled daily watch renewal with cron "${cron}"`)

  console.log(`[worker] Listening on queue "${queueName}"`)

  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log('[worker] SIGINT received, shutting down...')
    await worker.close().catch(() => {})
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM received, shutting down...')
    await worker.close().catch(() => {})
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[worker] Fatal error', err)
  process.exit(1)
})