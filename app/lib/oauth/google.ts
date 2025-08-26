import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/db'

/**
 * Creates an OAuth2 client with the user's stored tokens
 * Automatically refreshes tokens if they're expired
 */
export async function withGoogleClient(
  userId: string,
  requiredScopes: string[]
): Promise<OAuth2Client> {
  // Fetch the user's Google account
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  })

  if (!account) {
    throw new Error('Google account not connected. Please sign in with Google first.')
  }

  // Check if the account has the required scopes
  const accountScopes = account.scope?.split(' ') || []
  const hasRequiredScopes = requiredScopes.every(scope => 
    accountScopes.includes(scope)
  )

  if (!hasRequiredScopes) {
    throw new Error(
      `Missing required permissions. Please reconnect Google with these permissions: ${requiredScopes.join(', ')}`
    )
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  // Set credentials
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (tokens) => {
    // Update the stored tokens
    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || account.refresh_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
      },
    })
  })

  return oauth2Client
}

/**
 * Helper to check if a user has specific Google scopes
 */
export async function hasGoogleScopes(
  userId: string,
  scopes: string[]
): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  })

  if (!account || !account.scope) {
    return false
  }

  const accountScopes = account.scope.split(' ')
  return scopes.every(scope => accountScopes.includes(scope))
}

/**
 * Get the authorization URL for connecting/reconnecting Google with specific scopes
 */
export function getGoogleAuthUrl(scopes: string[], state?: string): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile', ...scopes],
    state,
  })
}