import { InstanceType } from 'typegoose'
import { UserModel, User } from '../models/user'
import { getTodorantCalendar, getGoogleCalendarApi } from './googleCalendar'

const BACKEND_URL = process.env.BACKEND_URL

const oneHour = 3600000

if (process.env.ENVIRONMENT !== 'staging') {
  googleSync()
  setInterval(googleSync, oneHour)
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
  user: InstanceType<User>
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
    if (err.message !== `Channel id ${user._id} is not unique`) {
      console.log(err.message)
    }
    // Invalid Google Calendar credentials, remove them from the user
    if (err.message === 'invalid_grant') {
      user.googleCalendarResourceId = undefined
      user.settings.googleCalendarCredentials = undefined
      await user.save()
    }
  }
}
