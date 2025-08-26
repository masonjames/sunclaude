import { Octokit } from '@octokit/rest'
import { prisma } from '@/lib/db'
import { Task, ExternalItem } from '@prisma/client'

export interface GithubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: string
  html_url: string
  created_at: string
  updated_at: string
  user: {
    login: string
    avatar_url: string
  } | null
  labels: Array<{
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
  }>
  repository?: {
    owner: string
    repo: string
  }
}

/**
 * Get GitHub client for a user
 */
async function getGithubClient(userId: string): Promise<Octokit> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'github',
    },
  })

  if (!account || !account.access_token) {
    throw new Error('GitHub account not connected. Please sign in with GitHub first.')
  }

  return new Octokit({
    auth: account.access_token,
  })
}

/**
 * List issues from a GitHub repository
 */
export async function listIssues(
  userId: string,
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all'
    labels?: string
    sort?: 'created' | 'updated' | 'comments'
    direction?: 'asc' | 'desc'
    per_page?: number
  }
): Promise<GithubIssue[]> {
  const octokit = await getGithubClient(userId)

  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state: options?.state || 'open',
    labels: options?.labels,
    sort: options?.sort || 'created',
    direction: options?.direction || 'desc',
    per_page: options?.per_page || 30,
  })

  return response.data.map(issue => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    html_url: issue.html_url,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    user: issue.user,
    labels: issue.labels.map(label => 
      typeof label === 'string' 
        ? { name: label, color: '000000' }
        : { name: label.name || '', color: label.color || '000000' }
    ),
    assignees: issue.assignees || [],
    repository: { owner, repo },
  }))
}

/**
 * Search for issues across repositories
 */
export async function searchIssues(
  userId: string,
  query: string,
  options?: {
    sort?: 'created' | 'updated' | 'comments' | 'reactions'
    order?: 'asc' | 'desc'
    per_page?: number
  }
): Promise<GithubIssue[]> {
  const octokit = await getGithubClient(userId)

  const response = await octokit.search.issuesAndPullRequests({
    q: query,
    sort: options?.sort,
    order: options?.order || 'desc',
    per_page: options?.per_page || 30,
  })

  return response.data.items.map(issue => {
    // Parse repository info from the URL
    const urlParts = issue.html_url.split('/')
    const owner = urlParts[3]
    const repo = urlParts[4]

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      html_url: issue.html_url,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      user: issue.user,
      labels: issue.labels.map(label => 
        typeof label === 'string' 
          ? { name: label, color: '000000' }
          : { name: label.name || '', color: label.color || '000000' }
      ),
      assignees: issue.assignees || [],
      repository: { owner, repo },
    }
  })
}

/**
 * Get a single issue
 */
export async function getIssue(
  userId: string,
  owner: string,
  repo: string,
  issue_number: number
): Promise<GithubIssue> {
  const octokit = await getGithubClient(userId)

  const response = await octokit.issues.get({
    owner,
    repo,
    issue_number,
  })

  return {
    id: response.data.id,
    number: response.data.number,
    title: response.data.title,
    body: response.data.body,
    state: response.data.state,
    html_url: response.data.html_url,
    created_at: response.data.created_at,
    updated_at: response.data.updated_at,
    user: response.data.user,
    labels: response.data.labels.map(label => 
      typeof label === 'string' 
        ? { name: label, color: '000000' }
        : { name: label.name || '', color: label.color || '000000' }
    ),
    assignees: response.data.assignees || [],
    repository: { owner, repo },
  }
}

/**
 * Create a task from a GitHub issue
 */
export async function createTaskFromIssue(
  userId: string,
  issueId: string
): Promise<Task> {
  // Parse issue ID (format: owner/repo/number)
  const [owner, repo, numberStr] = issueId.split('/')
  const issue_number = parseInt(numberStr)

  if (!owner || !repo || !issue_number) {
    throw new Error('Invalid issue ID format. Expected: owner/repo/number')
  }

  // Get issue details
  const issue = await getIssue(userId, owner, repo, issue_number)

  // Check if we already have an external item for this issue
  const externalId = `${owner}/${repo}#${issue.number}`
  const existingItem = await prisma.externalItem.findUnique({
    where: {
      provider_externalId: {
        provider: 'github',
        externalId,
      },
    },
    include: {
      task: true,
    },
  })

  if (existingItem?.task) {
    return existingItem.task
  }

  // Determine priority based on labels
  let priority: string = 'medium'
  const labelNames = issue.labels.map(l => l.name.toLowerCase())
  if (labelNames.includes('critical') || labelNames.includes('urgent')) {
    priority = 'high'
  } else if (labelNames.includes('low') || labelNames.includes('minor')) {
    priority = 'low'
  }

  // Create the task
  const createdDate = new Date(issue.created_at)
  const task = await prisma.task.create({
    data: {
      userId,
      title: `[${owner}/${repo}#${issue.number}] ${issue.title}`,
      description: issue.body || undefined,
      date: createdDate.toISOString().split('T')[0],
      priority,
    },
  })

  // Create the external item link
  await prisma.externalItem.create({
    data: {
      userId,
      taskId: task.id,
      provider: 'github',
      externalId,
      title: issue.title,
      description: issue.body || undefined,
      url: issue.html_url,
      metadata: JSON.stringify({
        owner,
        repo,
        number: issue.number,
        state: issue.state,
        labels: issue.labels,
        user: issue.user?.login,
      }),
    },
  })

  return task
}

/**
 * Update a GitHub issue from a task (optional)
 */
export async function updateIssueFromTask(
  userId: string,
  taskId: string,
  updates: {
    state?: 'open' | 'closed'
    labels?: string[]
  }
): Promise<void> {
  // Find the external item
  const externalItem = await prisma.externalItem.findFirst({
    where: {
      taskId,
      provider: 'github',
    },
  })

  if (!externalItem || !externalItem.metadata) {
    throw new Error('No GitHub issue linked to this task')
  }

  const metadata = JSON.parse(externalItem.metadata)
  const { owner, repo, number } = metadata

  const octokit = await getGithubClient(userId)

  await octokit.issues.update({
    owner,
    repo,
    issue_number: number,
    state: updates.state,
    labels: updates.labels,
  })
}

/**
 * List user's repositories
 */
export async function listRepositories(
  userId: string,
  options?: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member'
    sort?: 'created' | 'updated' | 'pushed' | 'full_name'
    per_page?: number
  }
) {
  const octokit = await getGithubClient(userId)

  const response = await octokit.repos.listForAuthenticatedUser({
    type: options?.type || 'all',
    sort: options?.sort || 'updated',
    per_page: options?.per_page || 30,
  })

  return response.data.map(repo => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    html_url: repo.html_url,
    description: repo.description,
    owner: repo.owner.login,
    open_issues_count: repo.open_issues_count,
    updated_at: repo.updated_at,
  }))
}