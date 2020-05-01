import { Todo } from '../models/todo'
import { google, calendar_v3 } from 'googleapis'
import { report } from './report'
import moment = require('moment')

export interface GoogleCalendarCredentials {
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

const webOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_SECRET,
  'https://todorant.com/google_calendar_setup_web'
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
  credentials?: GoogleCalendarCredentials
) {
  if (!credentials) {
    return
  }
  try {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_SECRET,
      'https://todorant.com/google_calendar_setup'
    )
    oauth.setCredentials(credentials)
    const api = google.calendar({ version: 'v3', auth: oauth })
    const todorantCalendar = await getTodorantCalendar(api)
    for (const todo of todos) {
      let todoEvent = await getTodoEvent(api, todorantCalendar, todo)
      if (
        (todo.deleted || todo.completed || !todo.time || !todo.date) &&
        todoEvent
      ) {
        try {
          // Can fail
          await api.events.delete({
            calendarId: todorantCalendar.id,
            eventId: todo._id.toString(),
          })
        } catch (err) {
          console.log(err)
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
                  dateTime: startDate.format(),
                  timeZone: todorantCalendar.timeZone,
                },
                end: {
                  dateTime: endDate.format(),
                  timeZone: todorantCalendar.timeZone,
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
              dateTime: startDate.format(),
              timeZone: todorantCalendar.timeZone,
            },
            end: {
              dateTime: endDate.format(),
              timeZone: todorantCalendar.timeZone,
            },
          },
        })
      }
    }
  } catch (err) {
    report(err)
  }
}

async function getTodorantCalendar(api: calendar_v3.Calendar) {
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
