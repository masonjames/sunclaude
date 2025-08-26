import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getNotionItems } from '@/services/notion'
import { prisma } from '@/lib/db'
import { mockNotionItems } from '@/services/mock-data'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for Notion integration connection
    const notionConnection = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'notion'
        }
      },
    })

    if (!notionConnection?.accessToken) {
      console.log('No Notion access token found, using mock data')
      return NextResponse.json(mockNotionItems)
    }

    // Use real Notion API
    const notionItems = await getNotionItems(notionConnection.accessToken)
    return NextResponse.json(notionItems)
  } catch (error) {
    console.error('Error fetching Notion items:', error)
    // Fallback to mock data on error
    return NextResponse.json(mockNotionItems)
  }
}
