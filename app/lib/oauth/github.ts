import { Octokit } from '@octokit/rest'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function withGitHubClient<T>(
  userId: string,
  fn: (octokit: Octokit) => Promise<T>
): Promise<T> {
  // Get the user's GitHub account from NextAuth
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'github'
    }
  })

  if (!account?.access_token) {
    throw new Error('No GitHub access token found. Please reconnect your GitHub account.')
  }

  const octokit = new Octokit({
    auth: account.access_token,
  })

  return await fn(octokit)
}

export async function getCurrentUserGitHubClient(): Promise<Octokit | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }

  try {
    return await withGitHubClient(session.user.id, async (octokit) => octokit)
  } catch {
    return null
  }
}