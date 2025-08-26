import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGmailItems } from '@/services/gmail'
import { prisma } from '@/lib/db'
import { mockGmailItems } from '@/services/mock-data'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for Google account with Gmail access
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    })

    if (!googleAccount?.access_token) {
      console.log('No Gmail access token found, using mock data')
      return NextResponse.json(mockGmailItems)
    }

    // Use real Gmail API
    const gmailItems = await getGmailItems(googleAccount.access_token)
    return NextResponse.json(gmailItems)
  } catch (error) {
    console.error('Error fetching Gmail items:', error)
    // Fallback to mock data on error
    return NextResponse.json(mockGmailItems)
  }
}
