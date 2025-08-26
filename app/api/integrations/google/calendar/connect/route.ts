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

    // Generate the authorization URL with calendar scopes
    const authUrl = getGoogleAuthUrl(
      ['https://www.googleapis.com/auth/calendar'],
      JSON.stringify({ integration: 'calendar', userId })
    )

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error connecting Google Calendar:', error)
    return NextResponse.json(
      { error: 'Failed to connect Google Calendar' },
      { status: 500 }
    )
  }
}