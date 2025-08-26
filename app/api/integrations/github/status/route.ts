import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has GitHub access token
    // In a real implementation, this would check the database for stored tokens
    const hasGitHubToken = !!process.env.GITHUB_ACCESS_TOKEN

    // For demo purposes, simulate connection status
    const USE_MOCK_DATA = true
    
    if (USE_MOCK_DATA) {
      return NextResponse.json({
        connected: true,
        username: 'demo-user',
        avatar_url: 'https://github.com/demo-user.png',
        scopes: ['repo', 'read:user']
      })
    }

    return NextResponse.json({
      connected: hasGitHubToken,
      username: session.user.name || null,
      avatar_url: session.user.image || null,
      scopes: []
    })
  } catch (error) {
    console.error('Error checking GitHub status:', error)
    return NextResponse.json(
      { error: 'Failed to check GitHub connection status' },
      { status: 500 }
    )
  }
}