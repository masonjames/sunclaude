import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock repositories for demonstration
const mockRepositories = [
  {
    id: 1,
    name: 'sunclaude',
    full_name: 'user/sunclaude',
    description: 'Task management application with integrations',
    language: 'TypeScript',
    stargazers_count: 42,
    watchers_count: 12,
    open_issues_count: 8,
    private: false,
    html_url: 'https://github.com/user/sunclaude'
  },
  {
    id: 2,
    name: 'web-components',
    full_name: 'user/web-components',
    description: 'Reusable React components library',
    language: 'JavaScript',
    stargazers_count: 156,
    watchers_count: 23,
    open_issues_count: 3,
    private: false,
    html_url: 'https://github.com/user/web-components'
  },
  {
    id: 3,
    name: 'api-gateway',
    full_name: 'company/api-gateway',
    description: 'Microservices API gateway with authentication',
    language: 'Go',
    stargazers_count: 89,
    watchers_count: 15,
    open_issues_count: 12,
    private: true,
    html_url: 'https://github.com/company/api-gateway'
  }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In a real implementation, this would fetch from GitHub API
    const USE_MOCK_DATA = true

    if (USE_MOCK_DATA) {
      return NextResponse.json({ repositories: mockRepositories })
    }

    // Real GitHub implementation would go here
    // const octokit = new Octokit({ auth: accessToken })
    // const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    //   sort: 'updated',
    //   direction: 'desc',
    //   per_page: 100
    // })

    return NextResponse.json({ repositories: [] })
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}