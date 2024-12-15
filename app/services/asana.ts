import { Client } from 'asana'

export interface AsanaItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

export async function getAsanaItems(accessToken: string): Promise<AsanaItem[]> {
  try {
    const client = Client.create({
      defaultHeaders: { 'Authorization': `Bearer ${accessToken}` }
    })

    // Get user's workspace
    const me = await client.users.me()
    const workspaceId = me.workspaces[0].gid

    // Get tasks assigned to the user
    const tasks = await client.tasks.findAll({
      assignee: me.gid,
      workspace: workspaceId,
      completed_since: 'now',
      opt_fields: ['name', 'notes', 'due_on', 'priority']
    })

    const items: AsanaItem[] = []
    for await (const task of tasks) {
      items.push({
        id: task.gid,
        title: task.name,
        description: task.notes,
        dueDate: task.due_on,
        priority: task.priority === 'high' ? 'high' : 
                 task.priority === 'low' ? 'low' : 'medium'
      })
    }

    return items
  } catch (error) {
    console.error('Error fetching Asana items:', error)
    return []
  }
}
