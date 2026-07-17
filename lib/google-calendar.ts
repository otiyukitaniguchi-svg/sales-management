import { google } from 'googleapis'

export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID
  )
}

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  // Vercelの環境変数はマルチライン値を \n エスケープ済み文字列として保存するため復元する
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
}

export interface CreateEventParams {
  title: string
  description?: string
  location?: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
}

export async function createCalendarEvent(params: CreateEventParams): Promise<{ htmlLink?: string }> {
  const auth = getAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID!
  const timeZone = 'Asia/Tokyo'

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.title,
      description: params.description,
      location: params.location,
      start: { dateTime: `${params.date}T${params.startTime}:00`, timeZone },
      end: { dateTime: `${params.date}T${params.endTime}:00`, timeZone },
    },
  })

  return { htmlLink: response.data.htmlLink || undefined }
}
