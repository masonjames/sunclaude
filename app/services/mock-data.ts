export interface IntegrationItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high'
}

export const mockGmailItems: IntegrationItem[] = [
  {
    id: 'email-1',
    title: 'Project Update Meeting',
    description: 'Team sync to discuss Q4 progress',
    dueDate: '2024-12-15',
    priority: 'high'
  },
  {
    id: 'email-2',
    title: 'Client Proposal Review',
    description: 'Please review the attached proposal',
    dueDate: '2024-12-16',
    priority: 'medium'
  },
  {
    id: 'email-3',
    title: 'Holiday Schedule',
    description: 'Important updates to office hours',
    dueDate: '2024-12-20',
    priority: 'low'
  }
]

export const mockCalendarItems: IntegrationItem[] = [
  {
    id: 'event-1',
    title: 'Weekly Team Standup',
    description: 'Regular team sync meeting',
    dueDate: '2024-12-15T10:00:00',
    priority: 'medium'
  },
  {
    id: 'event-2',
    title: 'Client Presentation',
    description: 'Final presentation for Q4 project',
    dueDate: '2024-12-16T14:00:00',
    priority: 'high'
  }
]

export const mockAsanaItems: IntegrationItem[] = [
  {
    id: 'task-1',
    title: 'Update Documentation',
    description: 'Review and update API documentation',
    dueDate: '2024-12-17',
    priority: 'medium'
  },
  {
    id: 'task-2',
    title: 'Bug Fix: Login Flow',
    description: 'Address reported issues with login',
    dueDate: '2024-12-15',
    priority: 'high'
  }
]

export const mockNotionItems: IntegrationItem[] = [
  {
    id: 'page-1',
    title: 'Product Roadmap',
    description: 'Q1 2025 planning document',
    dueDate: '2024-12-20',
    priority: 'high'
  },
  {
    id: 'page-2',
    title: 'Meeting Notes',
    description: 'Notes from client meetings',
    dueDate: '2024-12-18',
    priority: 'low'
  }
]

export const mockLinearItems: IntegrationItem[] = [
  {
    id: 'issue-1',
    title: 'Implement Auth Flow',
    description: 'Add OAuth2 authentication',
    dueDate: '2024-12-16',
    priority: 'high'
  },
  {
    id: 'issue-2',
    title: 'Performance Optimization',
    description: 'Improve load times by 50%',
    dueDate: '2024-12-19',
    priority: 'medium'
  }
]
