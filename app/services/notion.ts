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
        // Type guard helper for title properties
        const getTitleFromProperty = (prop: any) => {
          return prop && 'title' in prop ? prop.title?.[0]?.plain_text : undefined
        }
        
        const getDateFromProperty = (prop: any) => {
          return prop && 'date' in prop ? prop.date?.start : undefined
        }
        
        const getSelectFromProperty = (prop: any) => {
          return prop && 'select' in prop ? prop.select?.name : undefined
        }
        
        const getRichTextFromProperty = (prop: any) => {
          return prop && 'rich_text' in prop ? prop.rich_text?.[0]?.plain_text : undefined
        }

        const title = getTitleFromProperty(page.properties.Name) || 
                     getTitleFromProperty(page.properties.Title) || 
                     'Untitled'
        
        const dueDate = getDateFromProperty(page.properties.Due) ||
                       getDateFromProperty(page.properties['Due Date'])

        const priorityName = getSelectFromProperty(page.properties.Priority)?.toLowerCase()

        items.push({
          id: page.id,
          title,
          description: getRichTextFromProperty(page.properties.Description),
          dueDate,
          priority: priorityName === 'high' ? 'high' :
                   priorityName === 'low' ? 'low' : 'medium'
        })
      }
    }

    return items
  } catch (error) {
    console.error('Error fetching Notion items:', error)
    return []
  }
}
