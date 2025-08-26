import { Octokit } from '@octokit/rest'
import { withGitHubClient } from '@/lib/oauth/github'
import { Task } from '@/types/task'
import { prisma } from '@/lib/db'

export type NormalizedItem = {
  id: string
  repo: string
  number: number
  title: string
  body?: string
  url: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate?: string
  labels?: string[]
  assignees?: string[]
}

export async function getAssignedIssues(userId: string): Promise<NormalizedItem[]> {
  return await withGitHubClient(userId, async (octokit) => {
    // Get issues assigned to the authenticated user across all repos
    const { data: issues } = await octokit.rest.issues.list({
      filter: 'assigned',
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: 100
    })

    return issues.map(issue => ({
      id: issue.id.toString(),
      repo: issue.repository?.full_name || 'unknown/repo',
      number: issue.number,
      title: issue.title,
      body: issue.body || undefined,
      url: issue.html_url,
      priority: determinePriority(issue.labels),
      dueDate: extractDueDate(issue.body),
      labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
      assignees: issue.assignees?.map(assignee => assignee.login) || []
    }))
  })
}

export async function createTaskFromIssue(userId: string, item: NormalizedItem): Promise<Task> {
  const task = await prisma.task.create({
    data: {
      id: `gh_${item.id}`,
      title: item.title,
      description: item.body,
      status: 'PLANNED',
      priority: item.priority || 'MEDIUM',
      plannedDate: item.dueDate ? new Date(item.dueDate) : new Date(),
      userId,
      order: 0 // Will be set by the client when dropped
    }
  })

  return {
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    status: task.status as any,
    priority: task.priority as any,
    date: task.plannedDate ? task.plannedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    sortOrder: task.order || undefined
  }
}

function determinePriority(labels: any[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const labelNames = labels.map(label => 
    typeof label === 'string' ? label.toLowerCase() : (label.name || '').toLowerCase()
  )

  if (labelNames.some(name => ['critical', 'urgent', 'high priority', 'p0', 'p1'].includes(name))) {
    return 'HIGH'
  }
  
  if (labelNames.some(name => ['low priority', 'p3', 'p4', 'enhancement', 'nice-to-have'].includes(name))) {
    return 'LOW'
  }

  return 'MEDIUM'
}

function extractDueDate(body?: string | null): string | undefined {
  if (!body) return undefined
  
  // Look for common due date patterns in issue body
  const datePatterns = [
    /due[:\s]*((\d{4})-(\d{2})-(\d{2}))/i,
    /deadline[:\s]*((\d{4})-(\d{2})-(\d{2}))/i,
    /target[:\s]*((\d{4})-(\d{2})-(\d{2}))/i
  ]

  for (const pattern of datePatterns) {
    const match = body.match(pattern)
    if (match) {
      return match[1] // Return the full date match
    }
  }

  return undefined
}