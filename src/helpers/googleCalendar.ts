import { Todo } from '@/models/todo'
import { google, calendar_v3 } from 'googleapis'
import { report } from '@/helpers/report'
import moment = require('moment')
import { _d } from '@/helpers/encryption'

export interface GoogleCalendarCredentials {
  refresh_token?: string | null
  expiry_date?: number | null
  access_token?: string | null
  token_type?: string | null
  id_token?: string | null
}
export async function getGoogleEvents(api, calendar) {
  const date = new Date()
  date.setMinutes(date.getMinutes() - 1)
  const req = await api.events.list({
    calendarId: calendar.id,
    updatedMin: date,
  })
  return req.data.items
}

const BASE_URL = process.env.BASE_URL

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_SECRET,
  `${BASE_URL}/google_calendar_setup`
)

const webOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_SECRET,
  `${BASE_URL}/google_calendar_setup_web`
)

export function getGoogleCalendarOAuthURL(web = false) {
  return web
    ? webOauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/calendar',
        prompt: 'consent select_account',
      })
    : oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/calendar',
        prompt: 'consent select_account',
      })
}

export async function getGoogleCalendarToken(code: string, web = false) {
  const data = web
    ? await webOauth2Client.getToken(code)
    : await oauth2Client.getToken(code)
  return data.tokens
}

export async function updateTodos(
  todos: Todo[],
  credentials?: GoogleCalendarCredentials,
  password?: string,
  removeCompleted?: boolean
) {
  if (!credentials) {
    return
  }
  try {
    const api = getGoogleCalendarApi(credentials)
    const todorantCalendar = await getTodorantCalendar(api)
    for (let todo of todos) {
      if (todo.encrypted && !password) {
        continue
      }
      if (todo.encrypted && password) {
        const decrypted = _d(todo.text, password)
        if (decrypted) {
          todo = { ...todo._doc } as Todo
          todo.text = decrypted
        }
      }
      let todoEvent = await getTodoEvent(api, todorantCalendar, todo)
      if (
        (todo.deleted ||
          (removeCompleted && todo.completed) ||
          !todo.time ||
          !todo.date) &&
        todoEvent
      ) {
        try {
          // Can fail
          await api.events.delete({
            calendarId: todorantCalendar.id,
            eventId: todo._id.toString(),
          })
        } catch (err) {
          report(err)
        }
      } else if (!todo.deleted && !todo.completed && todo.time && todo.date) {
        const startDate = moment(
          `${todo.monthAndYear}-${todo.date} ${todo.time}`,
          'YYYY-MM-DD HH:mm'
        )
        const endDate = moment(
          `${todo.monthAndYear}-${todo.date} ${todo.time}`,
          'YYYY-MM-DD HH:mm'
        ).add(15, 'minutes')
        if (!todoEvent) {
          todoEvent = (
            await api.events.insert({
              calendarId: todorantCalendar.id,
              requestBody: {
                id: todo._id.toString(),
                summary: todo.frog ? `🐸 ${todo.text}` : todo.text,
                start: {
                  dateTime: startDate.format().substr(0, 19),
                  timeZone: todorantCalendar.timeZone,
                },
                end: {
                  dateTime: endDate.format().substr(0, 19),
                  timeZone: todorantCalendar.timeZone,
                },
                reminders: {
                  useDefault: true,
                },
              },
            })
          ).data
        }
        await api.events.update({
          calendarId: todorantCalendar.id,
          eventId: todo._id.toString(),
          requestBody: {
            summary: todo.frog ? `🐸 ${todo.text}` : todo.text,
            start: {
              dateTime: startDate.format().substr(0, 19),
              timeZone: todorantCalendar.timeZone,
            },
            end: {
              dateTime: endDate.format().substr(0, 19),
              timeZone: todorantCalendar.timeZone,
            },
            reminders: {
              useDefault: true,
            },
            colorId: todoEvent.colorId,
          },
        })
      }
    }
  } catch (err) {
    report(err)
  }
}

export async function getTodorantCalendar(api: calendar_v3.Calendar) {
  const calendarList = (await api.calendarList.list()).data
  let primaryTimezone = ''
  for (const calendar of calendarList.items) {
    if (calendar.primary) {
      primaryTimezone = calendar.timeZone
    }
    if (
      calendar.summary.toLowerCase().includes('todorant') ||
      calendar.summary.toLowerCase().includes('тудурант')
    ) {
      return calendar
    }
  }
  return (
    await api.calendars.insert({
      requestBody: {
        summary: 'Todorant',
        timeZone: primaryTimezone,
      },
    })
  ).data
}

async function getTodoEvent(
  api: calendar_v3.Calendar,
  calendar: calendar_v3.Schema$Calendar,
  todo: Todo
) {
  try {
    return (
      await api.events.get({
        calendarId: calendar.id,
        eventId: todo._id.toString(),
      })
    ).data
  } catch (err) {
    return undefined
  }
}

export function getGoogleCalendarApi(credentials: GoogleCalendarCredentials) {
  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_SECRET,
    `${BASE_URL}/google_calendar_setup`
  )
  oauth.setCredentials(credentials)
  const api = google.calendar({ version: 'v3', auth: oauth })
  return api
}
