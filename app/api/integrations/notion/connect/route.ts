import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/oauth/helpers'

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

    // Build Notion OAuth URL
    const clientId = process.env.NOTION_CLIENT_ID
    const redirectUri = process.env.NOTION_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Notion OAuth not configured' },
        { status: 500 }
      )
    }

    // Create state parameter for security
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64')

    const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `owner=user&` +
      `state=${state}`

    // Redirect to Notion OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error connecting Notion:', error)
    return NextResponse.json(
      { error: 'Failed to connect Notion' },
      { status: 500 }
    )
  }
}