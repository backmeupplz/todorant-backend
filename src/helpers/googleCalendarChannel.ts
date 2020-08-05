import { UserModel } from '../models/user'
import { getTodorantCalendar, getGoogleCalendarApi } from './googleCalendar'

const BACKEND_URL = process.env.BACKEND_URL

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
    const api = getGoogleCalendarApi(credentials)
    const todorantCalendar = await getTodorantCalendar(api)
    const channel = await api.events.watch({
      calendarId: todorantCalendar.id,
      requestBody: {
        id: userId,
        token: credentials.access_token,
        type: 'web_hook',
        address: `${BACKEND_URL}/google/notifications`,
        params: {
          ttl: channelLivingTime,
        },
      },
    })
    const resourceId = channel.data.resourceId
    await UserModel.findOneAndUpdate(
      { _id: userId },
      { googleCalendarResourceId: resourceId }
    )
  } catch (err) {
    if (err.message !== `Channel id ${userId} not unique`) {
      console.log(err.message)
    }
  }
}
