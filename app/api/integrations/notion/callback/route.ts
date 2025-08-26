import { NextRequest, NextResponse } from 'next/server'
import { storeNotionTokens } from '@/services/integrations/notion'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Notion OAuth error:', error)
      return NextResponse.redirect(
        `/settings?error=${encodeURIComponent('Failed to connect Notion: ' + error)}`
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
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI ||
          `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Failed to exchange Notion code:', error)
      return NextResponse.redirect(
        '/settings?error=' + encodeURIComponent('Failed to connect Notion')
      )
    }

    const tokenData = await tokenResponse.json()
    
    // Store the tokens
    await storeNotionTokens(
      userId,
      tokenData.access_token,
      tokenData.workspace_id,
      tokenData.workspace_name || 'Unknown Workspace'
    )

    // Redirect to settings page with success
    return NextResponse.redirect(
      '/settings?success=' + encodeURIComponent('Notion connected successfully')
    )
  } catch (error) {
    console.error('Error in Notion callback:', error)
    return NextResponse.redirect(
      '/settings?error=' + encodeURIComponent('Failed to connect Notion')
    )
  }
}