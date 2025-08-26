import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getAsanaItems } from '@/services/asana'
import { prisma } from '@/lib/db'
import { mockAsanaItems } from '@/services/mock-data'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for Asana integration connection
    const asanaConnection = await prisma.integrationConnection.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: 'asana'
        }
      },
    })

    if (!asanaConnection?.accessToken) {
      console.log('No Asana access token found, using mock data')
      return NextResponse.json(mockAsanaItems)
    }

    // Use real Asana API
    const asanaItems = await getAsanaItems(asanaConnection.accessToken)
    return NextResponse.json(asanaItems)
  } catch (error) {
    console.error('Error fetching Asana items:', error)
    // Fallback to mock data on error
    return NextResponse.json(mockAsanaItems)
  }
}
