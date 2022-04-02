import { DocumentType } from '@typegoose/typegoose'
import { User, UserModel } from '@/models/user'
import {
  getGoogleCalendarApi,
  getTodorantCalendar,
} from '@/helpers/googleCalendar'

const BACKEND_URL = process.env.BACKEND_URL

const oneHour = 3600000

export let googleSyncTimeout: NodeJS.Timeout
if (process.env.ENVIRONMENT !== 'staging') {
  googleSync()
  googleSyncTimeout = setInterval(googleSync, oneHour)
}

async function googleSync() {
  const usersWithCalendar = await UserModel.find({
    'settings.googleCalendarCredentials': { $exists: true, $ne: undefined },
  })
  usersWithCalendar.forEach((user) => {
    const credentials = user.settings.googleCalendarCredentials
    startWatch(credentials, user)
  })
}

export const startWatch = async (
  credentials: any,
  user: DocumentType<User>
) => {
  const channelLivingTime = '7776000'
  try {
    const api = getGoogleCalendarApi(credentials)
    const todorantCalendar = await getTodorantCalendar(api)
    const channel = await api.events.watch({
      calendarId: todorantCalendar.id,
      requestBody: {
        id: user._id,
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
      { _id: user._id },
      { googleCalendarResourceId: resourceId }
    )
  } catch (err) {
    // Invalid Google Calendar credentials, remove them from the user
    if (`${err.message}`.indexOf('invalid_grant') > -1) {
      await UserModel.findOneAndUpdate(
        { _id: user._id },
        {
          $unset: {
            googleCalendarResourceId: 1,
            'settings.googleCalendarCredentials': 1,
          },
        }
      )
    }
  }
}
