import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default user settings
  await prisma.userSettings.upsert({
    where: { userId: 'default-user' },
    update: {},
    create: {
      userId: 'default-user',
      defaultDailyCapacityMinutes: 480, // 8 hours
      timezone: 'UTC',
      workingHours: '09:00-17:00',
    }
  })

  // Create backlog tasks for testing
  const backlogTasks = [
    {
      title: 'Review and refactor authentication module',
      description: 'Audit current auth implementation and improve security',
      priority: 'high',
      status: 'BACKLOG',
      estimateMinutes: 120,
      source: 'manual',
    },
    {
      title: 'Implement user profile page',
      description: 'Create user profile with avatar, settings, and preferences',
      priority: 'medium',
      status: 'BACKLOG',
      estimateMinutes: 180,
      source: 'manual',
    },
    {
      title: 'Add data export functionality',
      description: 'Allow users to export their data in CSV and JSON formats',
      priority: 'low',
      status: 'BACKLOG',
      estimateMinutes: 90,
      source: 'manual',
    },
    {
      title: 'Fix responsive design issues',
      description: 'Address layout problems on mobile devices',
      priority: 'high',
      status: 'BACKLOG',
      estimateMinutes: 60,
      source: 'manual',
    },
    {
      title: 'Write API documentation',
      description: 'Document all API endpoints with examples',
      priority: 'medium',
      status: 'BACKLOG',
      estimateMinutes: 150,
      source: 'manual',
    },
    {
      title: 'Optimize database queries',
      description: 'Review slow queries and add appropriate indexes',
      priority: 'high',
      status: 'BACKLOG',
      estimateMinutes: 120,
      source: 'manual',
    },
    {
      title: 'Add unit tests for services',
      description: 'Increase test coverage for service layer',
      priority: 'medium',
      status: 'BACKLOG',
      estimateMinutes: 240,
      source: 'manual',
    },
    {
      title: 'Implement caching strategy',
      description: 'Add Redis caching for frequently accessed data',
      priority: 'low',
      status: 'BACKLOG',
      estimateMinutes: 180,
      source: 'manual',
    },
  ]

  for (const task of backlogTasks) {
    await prisma.task.create({
      data: {
        ...task,
        date: new Date().toISOString().split('T')[0],
      }
    })
  }

  console.log('✅ Seeded planning data successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })