import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'
import { listDatabases, listDatabaseItems } from '@/services/integrations/notion'

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
    const databaseId = searchParams.get('databaseId')

    if (databaseId) {
      // List items from a specific database
      const items = await listDatabaseItems(userId, databaseId)
      
      // Transform to the expected format
      const formattedItems = items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        dueDate: item.createdTime,
        priority: 'medium',
        metadata: {
          url: item.url,
          type: item.type,
          lastEditedTime: item.lastEditedTime,
        },
      }))

      return NextResponse.json({ items: formattedItems })
    } else {
      // List available databases
      const databases = await listDatabases(userId)
      return NextResponse.json({ databases })
    }
  } catch (error: any) {
    console.error('Error fetching Notion items:', error)
    
    if (error.message?.includes('not connected')) {
      return NextResponse.json(
        { error: 'Notion not connected. Please connect your Notion account first.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch Notion items' },
      { status: 500 }
    )
  }
}