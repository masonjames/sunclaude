import { Queue } from 'bullmq'

const connection = {
  connection: {
    // You can pass either a redis:// URL or host/port
    // BullMQ accepts an ioredis connection options object
    // See: https://docs.bullmq.io/
    ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}),
  } as any,
  prefix: process.env.QUEUE_PREFIX || 'sunclaude',
}

export const queueName = process.env.QUEUE_NAME || 'sunclaude-sync'
export const bullQueue = new Queue(queueName, connection)