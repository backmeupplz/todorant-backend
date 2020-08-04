import { UserModel } from '../models/user'
import { google } from 'googleapis'
import { getTodorantCalendar } from './googleCalendar'

const MAIN_URL = process.env.MAIN_URL
const BASE_URL = process.env.BASE_URL

const oneHour = 3600000

googleSync()
setInterval(googleSync, oneHour)

async function googleSync() {
  const usersWithCalendar = await UserModel.find({
    'settings.googleCalendarCredentials': { $exists: true, $ne: undefined },
  })
  usersWithCalendar.forEach((user) => {
    const credentials = user.settings.googleCalendarCredentials
    const userId = user._id
    startWatch(credentials, userId)
  })
}

export const startWatch = async (credentials: any, userId: string) => {
  const channelLivingTime = '7776000'
  try {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_SECRET,
      `${BASE_URL}/google_calendar_setup`
    )
    oauth.setCredentials(credentials)
    const api = google.calendar({ version: 'v3', auth: oauth })
    const todorantCalendar = await getTodorantCalendar(api)
    const channel = await api.events.watch({
      calendarId: todorantCalendar.id,
      requestBody: {
        id: userId,
        token: credentials.access_token,
        type: 'web_hook',
        address: `${MAIN_URL}/google/notifications`,
        params: {
          ttl: channelLivingTime,
        },
      },
    })
    const resourceId = channel.data.resourceId
    await UserModel.findOneAndUpdate(
      { _id: userId },
      { resourceId: resourceId }
    )
  } catch (err) {
    if (err.message !== `Channel id ${userId} not unique`) {
      console.log(err.message)
    }
  }
}
