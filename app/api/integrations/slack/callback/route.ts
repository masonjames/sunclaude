import { NextRequest, NextResponse } from 'next/server'
import { storeSlackTokens } from '@/services/integrations/slack'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Slack OAuth error:', error)
      return NextResponse.redirect(
        `/settings?error=${encodeURIComponent('Failed to connect Slack: ' + error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        '/settings?error=' + encodeURIComponent('Invalid OAuth callback')
      )
    }

    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const userId = stateData.userId

    if (!userId) {
      return NextResponse.redirect(
        '/settings?error=' + encodeURIComponent('Invalid session')
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI ||
          `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Failed to exchange Slack code:', error)
      return NextResponse.redirect(
        '/settings?error=' + encodeURIComponent('Failed to connect Slack')
      )
    }

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData.error)
      return NextResponse.redirect(
        '/settings?error=' + encodeURIComponent('Failed to connect Slack: ' + tokenData.error)
      )
    }

    // Store the tokens
    await storeSlackTokens(
      userId,
      tokenData.access_token,
      tokenData.team.id,
      tokenData.team.name,
      tokenData.scope
    )

    // Redirect to settings page with success
    return NextResponse.redirect(
      '/settings?success=' + encodeURIComponent('Slack connected successfully')
    )
  } catch (error) {
    console.error('Error in Slack callback:', error)
    return NextResponse.redirect(
      '/settings?error=' + encodeURIComponent('Failed to connect Slack')
    )
  }
}