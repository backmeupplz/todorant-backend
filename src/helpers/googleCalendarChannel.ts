import { UserModel } from '../models/user'
import { google } from 'googleapis'
import { getTodorantCalendar } from './googleCalendar'

const oneHour = 3600000

googleSync()
setInterval(googleSync, oneHour)

async function googleSync() {
  const usersWithCalendar = await UserModel.find({
    'settings.googleCalendarCredentials': { $exists: true, $ne: undefined },
  })
  usersWithCalendar.forEach((user) => {
    const userCalendar = user.settings.googleCalendarCredentials
    const userId = user._id
    const userToken = user.settings.googleCalendarCredentials.access_token
    startWatch(userCalendar, userId, userToken)
  })
}

export const startWatch = async (credentials, userId, token) => {
  const channelLivingTime = '7776000'
  try {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_SECRET,
      'http://127.0.0.1:8080/google_calendar_setup'
    )
    oauth.setCredentials(credentials)
    const api = google.calendar({ version: 'v3', auth: oauth })
    const todorantCalendr = await getTodorantCalendar(api)
    await api.events.watch({
      calendarId: todorantCalendr.id,
      requestBody: {
        id: userId,
        token: token,
        type: 'web_hook',
        address: 'https://e607028cb5c0.ngrok.io/google/notifications',
        params: {
          ttl: channelLivingTime,
        },
      },
    })
  } catch (err) {
    console.log(err)
    if (err.message !== `Channel id ${userId} not unique`) {
      console.log(err.message)
    }
  }
}
