import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get OAuth connections (Google, GitHub)
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        provider: true,
        access_token: true,
        expires_at: true,
      },
    })

    // Get integration connections (Slack, Notion)
    const integrationConnections = await prisma.integrationConnection.findMany({
      where: { userId: session.user.id },
      select: {
        provider: true,
        expiresAt: true,
      },
    })

    // Format status for each provider
    const integrationStatus = {
      google: {
        connected: accounts.some(acc => acc.provider === 'google'),
        hasCalendar: accounts.some(acc => acc.provider === 'google' && acc.access_token),
        hasGmail: accounts.some(acc => acc.provider === 'google' && acc.access_token),
      },
      github: {
        connected: accounts.some(acc => acc.provider === 'github'),
      },
      notion: {
        connected: integrationConnections.some(conn => conn.provider === 'notion'),
      },
      slack: {
        connected: integrationConnections.some(conn => conn.provider === 'slack'),
      },
    }

    return NextResponse.json({ integrationStatus })
  } catch (error) {
    console.error('Error fetching integration status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration status' },
      { status: 500 }
    )
  }
}