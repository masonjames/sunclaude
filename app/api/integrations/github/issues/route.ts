import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { listIssues, searchIssues } from '@/services/integrations/github'

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    const query = searchParams.get('q')
    const state = (searchParams.get('state') as 'open' | 'closed' | 'all') || 'open'
    const labels = searchParams.get('labels') || undefined
    const sort = (searchParams.get('sort') as 'created' | 'updated' | 'comments') || 'created'

    let issues
    
    if (query) {
      // Search across repositories
      issues = await searchIssues(userId, query, { sort })
    } else if (owner && repo) {
      // List issues from specific repository
      issues = await listIssues(userId, owner, repo, {
        state,
        labels,
        sort,
      })
    } else {
      return NextResponse.json(
        { error: 'Either provide owner & repo, or a search query' },
        { status: 400 }
      )
    }

    // Transform to the expected format
    const items = issues.map(issue => ({
      id: issue.repository 
        ? `${issue.repository.owner}/${issue.repository.repo}/${issue.number}`
        : issue.id.toString(),
      title: issue.title,
      description: issue.body || 'No description',
      dueDate: issue.created_at,
      priority: issue.labels.some(l => 
        ['critical', 'urgent'].includes(l.name.toLowerCase())
      ) ? 'high' : 'medium',
      metadata: {
        number: issue.number,
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels,
        author: issue.user?.login,
        repository: issue.repository,
      },
    }))

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error fetching GitHub issues:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please sign in with GitHub first.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch GitHub issues' },
      { status: 500 }
    )
  }
}