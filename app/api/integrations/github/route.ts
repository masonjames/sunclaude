import { NextResponse } from 'next/server'

// Mock GitHub issues data
const mockGithubItems = [
  {
    id: 'github-1',
    title: 'Add dark mode toggle',
    description: 'Implement dark/light mode switching functionality',
    dueDate: '2024-12-15',
    priority: 'HIGH'
  },
  {
    id: 'github-2', 
    title: 'Fix mobile responsive layout',
    description: 'Kanban board should work on mobile devices',
    dueDate: '2024-12-16',
    priority: 'MEDIUM'
  },
  {
    id: 'github-3',
    title: 'Update README documentation', 
    description: 'Add setup instructions for new developers',
    dueDate: '2024-12-18',
    priority: 'LOW'
  }
]

export async function GET() {
  try {
    // In a real implementation, we would check for environment variables and tokens here
    const USE_MOCK_DATA = true // Toggle this based on environment variables or configuration

    if (USE_MOCK_DATA) {
      return NextResponse.json(mockGithubItems)
    }

    // Real implementation would go here
    throw new Error('GitHub integration not configured')
  } catch (error) {
    console.error('Error fetching GitHub items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub items' },
      { status: 500 }
    )
  }
}