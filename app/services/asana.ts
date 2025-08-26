const Asana = require('asana')

export interface AsanaItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

export async function getAsanaItems(accessToken: string): Promise<AsanaItem[]> {
  try {
    const client = Asana.ApiClient.instance
    const token = client.authentications['token']
    token.accessToken = accessToken

    const usersApiInstance = new Asana.UsersApi()
    const tasksApiInstance = new Asana.TasksApi()

    // Get user info
    const meResponse = await usersApiInstance.getUser('me')
    const me = meResponse.data
    const workspaceGid = me.workspaces?.[0]?.gid

    if (!workspaceGid) {
      console.error('No workspace found')
      return []
    }

    // Get tasks assigned to the user
    const tasksResponse = await tasksApiInstance.getTasks({
      assignee: me.gid,
      workspace: workspaceGid,
      completed_since: 'now',
      opt_fields: 'name,notes,due_on,priority'
    })

    const items: AsanaItem[] = tasksResponse.data.map((task: any) => ({
      id: task.gid,
      title: task.name,
      description: task.notes,
      dueDate: task.due_on,
      priority: task.priority === 'high' ? 'high' : 
               task.priority === 'low' ? 'low' : 'medium'
    }))

    return items
  } catch (error) {
    console.error('Error fetching Asana items:', error)
    return []
  }
}
