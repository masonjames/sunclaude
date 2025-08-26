import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { listRepositories } from '@/services/integrations/github'

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
    const type = (searchParams.get('type') as 'all' | 'owner' | 'public' | 'private' | 'member') || 'all'
    const sort = (searchParams.get('sort') as 'created' | 'updated' | 'pushed' | 'full_name') || 'updated'

    // List repositories
    const repos = await listRepositories(userId, { type, sort })

    return NextResponse.json({ repositories: repos })
  } catch (error: any) {
    console.error('Error fetching GitHub repositories:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please sign in with GitHub first.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch GitHub repositories' },
      { status: 500 }
    )
  }
}