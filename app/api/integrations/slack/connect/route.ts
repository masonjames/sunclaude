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

    // Build Slack OAuth URL
    const clientId = process.env.SLACK_CLIENT_ID
    const redirectUri = process.env.SLACK_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Slack OAuth not configured' },
        { status: 500 }
      )
    }

    // Create state parameter for security
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64')

    // Scopes for Slack integration
    const scopes = [
      'channels:read',
      'chat:write',
      'commands',
      'users:read',
      'groups:read',
    ].join(',')

    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`

    // Redirect to Slack OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error connecting Slack:', error)
    return NextResponse.json(
      { error: 'Failed to connect Slack' },
      { status: 500 }
    )
  }
}