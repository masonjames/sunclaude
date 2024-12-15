import { LinearClient } from '@linear/sdk'

export interface LinearItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

export async function getLinearItems(accessToken: string): Promise<LinearItem[]> {
  try {
    const client = new LinearClient({
      accessToken
    })

    // Get assigned issues
    const issues = await client.issues({
      filter: {
        assignee: { isMe: { eq: true } },
        state: { type: { neq: "completed" } }
      }
    })

    return issues.nodes.map(issue => ({
      id: issue.id,
      title: issue.title,
      description: issue.description || undefined,
      dueDate: issue.dueDate || undefined,
      priority: issue.priority === 1 ? "high" :
               issue.priority === 2 ? "medium" : "low"
    }))
  } catch (error) {
    console.error('Error fetching Linear items:', error)
    return []
  }
}
