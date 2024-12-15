import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const tasks = [
    {
      title: "Design Review",
      description: "Review new homepage design",
      priority: "high",
      dueTime: "2:00 PM",
      date: today,
    },
    {
      title: "Team Meeting",
      description: "Weekly sync with the team",
      priority: "medium",
      dueTime: "11:00 AM",
      date: today,
    },
    {
      title: "Documentation",
      description: "Update API documentation",
      priority: "low",
      dueTime: "4:00 PM",
      date: tomorrow,
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
