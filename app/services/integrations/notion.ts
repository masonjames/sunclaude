import { Client } from '@notionhq/client'
import { prisma } from '@/lib/db'
import { Task } from '@prisma/client'
import { getIntegrationConnection } from '@/lib/oauth/helpers'

export interface NotionItem {
  id: string
  title: string
  description?: string
  url: string
  type: string
  properties: Record<string, any>
  createdTime: string
  lastEditedTime: string
}

/**
 * Get Notion client for a user
 */
async function getNotionClient(userId: string): Promise<Client> {
  const connection = await getIntegrationConnection(userId, 'notion')

  if (!connection || !connection.accessToken) {
    throw new Error('Notion not connected. Please connect your Notion account first.')
  }

  return new Client({
    auth: connection.accessToken,
  })
}

/**
 * List databases accessible to the integration
 */
export async function listDatabases(userId: string) {
  const notion = await getNotionClient(userId)

  const response = await notion.search({
    filter: {
      property: 'object',
      value: 'database',
    },
    page_size: 20,
  })

  return response.results.filter(db => db.object === 'database').map((db: any) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || 'Untitled Database',
    url: db.url,
    icon: db.icon,
    cover: db.cover,
  }))
}

/**
 * List items from a Notion database
 */
export async function listDatabaseItems(
  userId: string,
  databaseId: string
): Promise<NotionItem[]> {
  const notion = await getNotionClient(userId)

  const response = await notion.databases.query({
    database_id: databaseId,
    page_size: 50,
  })

  return response.results.map((page: any) => {
    // Extract title from properties
    let title = 'Untitled'
    const titleProp = Object.values(page.properties).find(
      (prop: any) => prop.type === 'title'
    ) as any

    if (titleProp?.title?.[0]?.plain_text) {
      title = titleProp.title[0].plain_text
    }

    // Extract description if available
    let description = ''
    const richTextProps = Object.values(page.properties).filter(
      (prop: any) => prop.type === 'rich_text'
    ) as any[]

    if (richTextProps.length > 0 && richTextProps[0]?.rich_text?.[0]?.plain_text) {
      description = richTextProps[0].rich_text[0].plain_text
    }

    return {
      id: page.id,
      title,
      description,
      url: page.url,
      type: page.object,
      properties: page.properties,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    }
  })
}

/**
 * Get a single Notion page
 */
export async function getNotionPage(
  userId: string,
  pageId: string
): Promise<NotionItem> {
  const notion = await getNotionClient(userId)

  const page = await notion.pages.retrieve({
    page_id: pageId,
  }) as any

  // Extract title from properties
  let title = 'Untitled'
  const titleProp = Object.values(page.properties).find(
    (prop: any) => prop.type === 'title'
  ) as any

  if (titleProp?.title?.[0]?.plain_text) {
    title = titleProp.title[0].plain_text
  }

  // Get page content
  const blocks = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  })

  // Extract text content from blocks
  let description = ''
  for (const block of blocks.results) {
    if ('paragraph' in block && block.paragraph.rich_text) {
      description += block.paragraph.rich_text
        .map((text: any) => text.plain_text)
        .join('') + '\n'
    }
  }

  return {
    id: page.id,
    title,
    description: description.trim(),
    url: page.url,
    type: page.object,
    properties: page.properties,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  }
}

/**
 * Create a task from a Notion item
 */
export async function createTaskFromNotionItem(
  userId: string,
  itemId: string
): Promise<Task> {
  // Get the Notion page details
  const notionItem = await getNotionPage(userId, itemId)

  // Check if we already have an external item for this
  const existingItem = await prisma.externalItem.findUnique({
    where: {
      provider_externalId: {
        provider: 'notion',
        externalId: itemId,
      },
    },
    include: {
      task: true,
    },
  })

  if (existingItem?.task) {
    return existingItem.task
  }

  // Extract date if available
  const createdDate = new Date(notionItem.createdTime)
  const taskDate = createdDate.toISOString().split('T')[0]

  // Determine priority based on properties
  let priority = 'medium'
  const priorityProp = Object.values(notionItem.properties).find(
    (prop: any) => prop.type === 'select' && prop.name?.toLowerCase().includes('priority')
  ) as any

  if (priorityProp?.select?.name) {
    const priorityName = priorityProp.select.name.toLowerCase()
    if (priorityName.includes('high') || priorityName.includes('urgent')) {
      priority = 'high'
    } else if (priorityName.includes('low')) {
      priority = 'low'
    }
  }

  // Create the task
  const task = await prisma.task.create({
    data: {
      userId,
      title: notionItem.title,
      description: notionItem.description || undefined,
      date: taskDate,
      priority,
    },
  })

  // Create the external item link
  await prisma.externalItem.create({
    data: {
      userId,
      taskId: task.id,
      provider: 'notion',
      externalId: itemId,
      title: notionItem.title,
      description: notionItem.description || undefined,
      url: notionItem.url,
      metadata: JSON.stringify({
        type: notionItem.type,
        createdTime: notionItem.createdTime,
        lastEditedTime: notionItem.lastEditedTime,
      }),
    },
  })

  return task
}

/**
 * Store Notion OAuth tokens
 */
export async function storeNotionTokens(
  userId: string,
  accessToken: string,
  workspaceId: string,
  workspaceName: string
) {
  return prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: 'notion',
      },
    },
    create: {
      userId,
      provider: 'notion',
      accessToken,
      metadata: JSON.stringify({
        workspaceId,
        workspaceName,
      }),
    },
    update: {
      accessToken,
      metadata: JSON.stringify({
        workspaceId,
        workspaceName,
      }),
    },
  })
}