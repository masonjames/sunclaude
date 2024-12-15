import { Client } from '@notionhq/client'

export interface NotionItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

export async function getNotionItems(accessToken: string): Promise<NotionItem[]> {
  try {
    const notion = new Client({
      auth: accessToken,
    })

    // Query for all pages in databases that have a due date property
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    })

    const items: NotionItem[] = []
    
    for (const page of response.results) {
      if ('properties' in page) {
        const title = page.properties.Name?.title?.[0]?.plain_text || 
                     page.properties.Title?.title?.[0]?.plain_text || 
                     'Untitled'
        
        const dueDate = page.properties.Due?.date?.start ||
                       page.properties['Due Date']?.date?.start

        const priority = page.properties.Priority?.select?.name?.toLowerCase()

        items.push({
          id: page.id,
          title,
          description: page.properties.Description?.rich_text?.[0]?.plain_text,
          dueDate,
          priority: priority === 'high' ? 'high' :
                   priority === 'low' ? 'low' : 'medium'
        })
      }
    }

    return items
  } catch (error) {
    console.error('Error fetching Notion items:', error)
    return []
  }
}
