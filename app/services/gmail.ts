import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export interface GmailItem {
  id: string
  title: string
  description?: string
  dueDate?: string
  priority?: "low" | "medium" | "high"
}

export async function getGmailItems(accessToken: string): Promise<GmailItem[]> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox is:unread',
      maxResults: 10
    })

    if (!response.data.messages) {
      return []
    }

    const messages = await Promise.all(
      response.data.messages.map(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        })

        const subject = msg.data.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject'
        const from = msg.data.payload?.headers?.find(h => h.name === 'From')?.value || ''
        const date = msg.data.payload?.headers?.find(h => h.name === 'Date')?.value

        return {
          id: message.id!,
          title: subject,
          description: `From: ${from}`,
          dueDate: date ? new Date(date).toISOString() : undefined,
          priority: "medium"
        }
      })
    )

    return messages
  } catch (error) {
    console.error('Error fetching Gmail items:', error)
    return []
  }
}
