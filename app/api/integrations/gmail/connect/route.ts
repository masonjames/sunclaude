import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/oauth/google'
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

    // Generate the authorization URL with Gmail scopes
    const authUrl = getGoogleAuthUrl(
      ['https://www.googleapis.com/auth/gmail.modify'],
      JSON.stringify({ integration: 'gmail', userId })
    )

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error connecting Gmail:', error)
    return NextResponse.json(
      { error: 'Failed to connect Gmail' },
      { status: 500 }
    )
  }
}