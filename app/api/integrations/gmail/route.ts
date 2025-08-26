import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { listThreads, searchGmail } from '@/services/integrations/google/gmail'

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
    const label = searchParams.get('label') || 'INBOX'
    const query = searchParams.get('q')
    const maxResults = parseInt(searchParams.get('max') || '50')

    let threads
    
    if (query) {
      // Search Gmail
      threads = await searchGmail(userId, query, maxResults)
    } else {
      // List threads by label
      const labelIds = label.split(',').map(l => l.toUpperCase())
      threads = await listThreads(userId, labelIds, maxResults)
    }

    // Transform to the expected format
    const items = threads.map(thread => ({
      id: thread.id,
      title: thread.subject,
      description: `From: ${thread.from}`,
      dueDate: thread.date,
      priority: thread.unread ? 'high' : 'medium',
      metadata: {
        url: thread.url,
        snippet: thread.snippet,
        labels: thread.labels,
        unread: thread.unread,
      },
    }))

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error fetching Gmail items:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Google account with Gmail permissions.' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('Missing required permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch Gmail items' },
      { status: 500 }
    )
  }
}