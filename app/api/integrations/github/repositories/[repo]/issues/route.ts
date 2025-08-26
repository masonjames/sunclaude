import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock issues and pull requests for demonstration
const generateMockIssues = (repoName: string) => [
  {
    id: 1,
    number: 42,
    title: 'Add dark mode support',
    body: 'Users are requesting dark mode support for better accessibility and user experience. This should include:\n\n- [ ] Dark theme colors\n- [ ] System preference detection\n- [ ] Theme toggle component\n- [ ] Persist user preference',
    state: 'open',
    labels: [
      { id: 1, name: 'enhancement', color: '84d6ff', description: 'New feature or request' },
      { id: 2, name: 'good first issue', color: 'good-first-issue', description: 'Good for newcomers' }
    ],
    assignee: {
      login: 'developer1',
      avatar_url: 'https://github.com/developer1.png'
    },
    milestone: {
      title: 'v2.0.0',
      due_on: '2024-12-31T23:59:59Z'
    },
    created_at: '2024-08-20T10:30:00Z',
    updated_at: '2024-08-25T14:22:00Z',
    html_url: `https://github.com/${repoName}/issues/42`,
    repository: {
      id: 1,
      name: repoName.split('/')[1],
      full_name: repoName,
      description: 'Task management application',
      language: 'TypeScript',
      stargazers_count: 42,
      watchers_count: 12,
      open_issues_count: 8,
      private: false,
      html_url: `https://github.com/${repoName}`
    }
  },
  {
    id: 2,
    number: 38,
    title: 'Fix: Memory leak in task synchronization',
    body: 'There appears to be a memory leak when synchronizing tasks with external services. Memory usage grows over time and doesn\'t get garbage collected properly.\n\n**Steps to reproduce:**\n1. Enable all integrations\n2. Let app run for 2+ hours\n3. Observe memory usage in dev tools\n\n**Expected:** Memory usage should stabilize\n**Actual:** Memory usage continuously grows',
    state: 'open',
    labels: [
      { id: 3, name: 'bug', color: 'ee0701', description: 'Something isn\'t working' },
      { id: 4, name: 'priority: high', color: 'b60205', description: 'High priority issue' }
    ],
    assignee: {
      login: 'senior-dev',
      avatar_url: 'https://github.com/senior-dev.png'
    },
    created_at: '2024-08-18T09:15:00Z',
    updated_at: '2024-08-24T16:45:00Z',
    html_url: `https://github.com/${repoName}/issues/38`,
    repository: {
      id: 1,
      name: repoName.split('/')[1],
      full_name: repoName,
      description: 'Task management application',
      language: 'TypeScript',
      stargazers_count: 42,
      watchers_count: 12,
      open_issues_count: 8,
      private: false,
      html_url: `https://github.com/${repoName}`
    }
  },
  {
    id: 3,
    number: 35,
    title: 'feat: Add calendar integration with time blocking',
    body: 'This PR adds comprehensive calendar integration features:\n\n- ✅ Bi-directional sync with Google Calendar\n- ✅ Time blocking for focus sessions  \n- ✅ Event creation from tasks\n- ✅ Smart conflict detection\n- ⏳ Outlook integration (coming next)\n\nCloses #28, #31, #33',
    state: 'open',
    labels: [
      { id: 1, name: 'enhancement', color: '84d6ff', description: 'New feature or request' },
      { id: 5, name: 'integration', color: '0075ca', description: 'External service integration' }
    ],
    assignee: {
      login: 'feature-dev',
      avatar_url: 'https://github.com/feature-dev.png'
    },
    created_at: '2024-08-15T11:20:00Z',
    updated_at: '2024-08-25T12:30:00Z',
    html_url: `https://github.com/${repoName}/pull/35`,
    repository: {
      id: 1,
      name: repoName.split('/')[1],
      full_name: repoName,
      description: 'Task management application',
      language: 'TypeScript',
      stargazers_count: 42,
      watchers_count: 12,
      open_issues_count: 8,
      private: false,
      html_url: `https://github.com/${repoName}`
    },
    pull_request: {
      url: `https://api.github.com/repos/${repoName}/pulls/35`,
      merged_at: null,
      draft: false
    }
  },
  {
    id: 4,
    number: 32,
    title: 'docs: Update API documentation',
    body: 'Updated API documentation to reflect recent changes in task management endpoints.',
    state: 'closed',
    labels: [
      { id: 6, name: 'documentation', color: '0075ca', description: 'Improvements or additions to documentation' }
    ],
    assignee: null,
    created_at: '2024-08-10T14:00:00Z',
    updated_at: '2024-08-22T10:15:00Z',
    html_url: `https://github.com/${repoName}/pull/32`,
    repository: {
      id: 1,
      name: repoName.split('/')[1],
      full_name: repoName,
      description: 'Task management application',
      language: 'TypeScript',
      stargazers_count: 42,
      watchers_count: 12,
      open_issues_count: 8,
      private: false,
      html_url: `https://github.com/${repoName}`
    },
    pull_request: {
      url: `https://api.github.com/repos/${repoName}/pulls/32`,
      merged_at: '2024-08-22T10:15:00Z',
      draft: false
    }
  }
]

export async function GET(request: NextRequest, { params }: { params: { repo: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repo } = params
    const decodedRepo = decodeURIComponent(repo)
    const { searchParams } = new URL(request.url)
    
    const state = searchParams.get('state') || 'open'
    const sort = searchParams.get('sort') || 'updated'
    const direction = searchParams.get('direction') || 'desc'
    const assignee = searchParams.get('assignee')
    const labels = searchParams.get('labels')

    // In a real implementation, this would fetch from GitHub API
    const USE_MOCK_DATA = true

    if (USE_MOCK_DATA) {
      let issues = generateMockIssues(decodedRepo)
      
      // Apply filters
      if (state !== 'all') {
        issues = issues.filter(issue => issue.state === state)
      }
      
      if (assignee) {
        issues = issues.filter(issue => 
          issue.assignee?.login.toLowerCase().includes(assignee.toLowerCase())
        )
      }
      
      if (labels) {
        const labelFilters = labels.split(',').map(l => l.trim().toLowerCase())
        issues = issues.filter(issue =>
          issue.labels.some(label => 
            labelFilters.some(filter => label.name.toLowerCase().includes(filter))
          )
        )
      }
      
      // Apply sorting
      issues.sort((a, b) => {
        let aValue, bValue
        
        switch (sort) {
          case 'created':
            aValue = new Date(a.created_at).getTime()
            bValue = new Date(b.created_at).getTime()
            break
          case 'updated':
            aValue = new Date(a.updated_at).getTime()
            bValue = new Date(b.updated_at).getTime()
            break
          case 'comments':
            // Mock comment sorting
            aValue = a.number % 5
            bValue = b.number % 5
            break
          default:
            return 0
        }
        
        return direction === 'desc' ? bValue - aValue : aValue - bValue
      })

      return NextResponse.json({ issues })
    }

    // Real GitHub implementation would go here
    // const octokit = new Octokit({ auth: accessToken })
    // const { data } = await octokit.rest.issues.listForRepo({
    //   owner: decodedRepo.split('/')[0],
    //   repo: decodedRepo.split('/')[1],
    //   state: state as any,
    //   sort: sort as any,
    //   direction: direction as any,
    //   assignee,
    //   labels,
    //   per_page: 100
    // })

    return NextResponse.json({ issues: [] })
  } catch (error) {
    console.error('Error fetching GitHub issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}