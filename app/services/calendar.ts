import { google } from 'googleapis'
import { addDays } from 'date-fns'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export interface CalendarItem {
  id: string
  title: string
  description?: string
  dueDate: string
  priority?: "low" | "medium" | "high"
}

export async function getCalendarItems(accessToken: string): Promise<CalendarItem[]> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const now = new Date()
    const timeMin = now.toISOString()
    const timeMax = addDays(now, 7).toISOString()

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    })

    return (response.data.items || []).map(event => ({
      id: event.id!,
      title: event.summary || 'Untitled Event',
      description: event.description,
      dueDate: event.start?.dateTime || event.start?.date || '',
      priority: event.colorId ? 
        parseInt(event.colorId) > 7 ? "high" : 
        parseInt(event.colorId) > 4 ? "medium" : "low"
        : "medium"
    }))
  } catch (error) {
    console.error('Error fetching Calendar items:', error)
    return []
  }
}
