import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Get the current user's ID from the session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

/**
 * Check if a user has connected a specific integration
 */
export async function isIntegrationConnected(
  userId: string,
  provider: string
): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider,
    },
  })

  return !!account
}

/**
 * Get integration connection for providers that don't use NextAuth
 */
export async function getIntegrationConnection(
  userId: string,
  provider: string
) {
  return prisma.integrationConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  })
}

/**
 * Store integration connection for providers that don't use NextAuth
 */
export async function storeIntegrationConnection(
  userId: string,
  provider: string,
  data: {
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    scope?: string
    metadata?: any
  }
) {
  return prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    create: {
      userId,
      provider,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      scope: data.scope,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      scope: data.scope,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  })
}

/**
 * Remove an integration connection
 */
export async function removeIntegrationConnection(
  userId: string,
  provider: string
) {
  // For NextAuth providers
  if (['google', 'github'].includes(provider)) {
    await prisma.account.deleteMany({
      where: {
        userId,
        provider,
      },
    })
  } else {
    // For custom integrations
    await prisma.integrationConnection.deleteMany({
      where: {
        userId,
        provider,
      },
    })
  }
  
  // Clean up any related data
  if (provider === 'google') {
    await prisma.googleSyncState.deleteMany({
      where: { userId },
    })
    await prisma.calendarEvent.deleteMany({
      where: { userId, provider: 'google' },
    })
  }
  
  await prisma.externalItem.deleteMany({
    where: { userId, provider },
  })
}