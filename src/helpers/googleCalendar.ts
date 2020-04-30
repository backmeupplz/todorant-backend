import { google } from 'googleapis'

export interface Credentials {
  refresh_token?: string | null
  expiry_date?: number | null
  access_token?: string | null
  token_type?: string | null
  id_token?: string | null
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_SECRET,
  'https://todorant.com/google_calendar_setup'
)

export function getGoogleCalendarOAuthURL() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/calendar',
  })
}

export async function getGoogleCalendarToken(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}
