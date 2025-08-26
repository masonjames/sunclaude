import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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

  const tasks = [
    {
      title: "Design Review",
      description: "Review new homepage design",
      priority: "HIGH",
      status: "PLANNED",
      plannedDate: new Date(today),
      dueDate: new Date(today),
      estimateMinutes: 60,
      userId: testUser.id,
    },
    {
      title: "Team Meeting",
      description: "Weekly sync with the team",
      priority: "MEDIUM",
      status: "SCHEDULED",
      plannedDate: new Date(today),
      estimateMinutes: 30,
      userId: testUser.id,
    },
    {
      title: "Documentation",
      description: "Update API documentation",
      priority: "LOW",
      status: "BACKLOG",
      plannedDate: new Date(tomorrow),
      estimateMinutes: 120,
      userId: testUser.id,
    },
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: task,
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
