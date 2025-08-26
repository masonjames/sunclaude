import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Create or find test user
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  })

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      }
    })
  }

  // Create or update user settings (Phase 4 addition)
  await prisma.userSettings.upsert({
    where: { userId: testUser.id },
    update: {
      autoRollover: true,
      dailyShutdownHour: 18,
    },
    create: {
      userId: testUser.id,
      autoRollover: true,
      dailyShutdownHour: 18,
    }
  })

  const tasks = [
    {
      title: "Design Review",
      description: "Review new homepage design",
      priority: "HIGH",
      status: "PLANNED",
      plannedDate: today,
      dueDate: today,
      estimateMinutes: 45,
      actualMinutes: 0,
      userId: testUser.id,
    },
    {
      title: "Team Meeting",
      description: "Weekly sync with the team",
      priority: "MEDIUM",
      status: "SCHEDULED",
      plannedDate: today,
      scheduledStart: new Date(today.setHours(11, 0, 0, 0)),
      scheduledEnd: new Date(today.setHours(11, 30, 0, 0)),
      estimateMinutes: 30,
      actualMinutes: 0,
      userId: testUser.id,
    },
    {
      title: "Documentation",
      description: "Update API documentation",
      priority: "LOW",
      status: "BACKLOG",
      plannedDate: tomorrow,
      estimateMinutes: 60,
      actualMinutes: 0,
      userId: testUser.id,
    },
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: task,
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })