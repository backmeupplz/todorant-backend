// Dependencies
import { Controller, Post, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate, getUserFromToken } from '../middlewares/authenticate'
import { SubscriptionStatus, UserModel, TodoModel } from '../models'
import {
  getGoogleCalendarOAuthURL,
  getGoogleCalendarToken,
  getTodorantCalendar,
  getGoogleEvents,
} from '../helpers/googleCalendar'
import { google } from 'googleapis'
import { startWatch } from '../helpers/googleCalendarChannel'
const Verifier = require('google-play-billing-validator')

const googleCredentials = require('../../assets/api-4987639842126744234-562450-c85efe0aadfc.json')

const BASE_URL = process.env.BASE_URL

const verifier = new Verifier({
  email: googleCredentials.client_email,
  key: googleCredentials.private_key,
})

@Controller('/google')
export default class {
  @Post('/subscription', authenticate)
  async subscription(ctx: Context) {
    await verifier.verifySub(ctx.request.body)
    ctx.state.user.subscriptionStatus = SubscriptionStatus.active
    ctx.state.user.googleReceipt = ctx.request.body.purchaseToken
    await ctx.state.user.save()
    ctx.status = 200
  }

  @Get('/calendarAuthenticationURL', authenticate)
  async calendarAuthenticationURL(ctx: Context) {
    ctx.body = await getGoogleCalendarOAuthURL(!!ctx.query.web)
  }

  @Post('/calendarAuthorize', authenticate)
  async calendarAuthorize(ctx: Context) {
    const code = ctx.request.body.code
    if (!code) {
      return ctx.throw(403)
    }
    const credentials = await getGoogleCalendarToken(
      code,
      !!ctx.request.body.web
    )
    const token = ctx.headers.token
    const { _id } = await getUserFromToken(token)
    startWatch(credentials, _id)
    ctx.body = credentials
  }

  @Post('/notifications')
  async post(ctx: Context) {
    try {
      const oauth = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_SECRET,
        `${BASE_URL}/google_calendar_setup`
      )
      const id = ctx.request.header['x-goog-channel-id']
      const user = await UserModel.findOne({
        _id: id,
      })
      const api = google.calendar({ version: 'v3', auth: oauth })
      const credentials = user.settings.googleCalendarCredentials
      oauth.setCredentials(credentials)

      const todorantCalendar = await getTodorantCalendar(api)
      const events = await getGoogleEvents(api, todorantCalendar)
      const deletedEvents = events.filter((event) => {
        return event.status === 'cancelled'
      })
      const timedEvents = events.filter((event) => {
        if (!event.start) {
          return false
        }
        return event.start.dateTime
      })
      deletedEvents.forEach(async (event) => {
        await TodoModel.findOneAndUpdate(
          {
            _id: event.id,
          },
          { completed: true }
        )
      })
      timedEvents.forEach(async (event) => {
        const eventDate = event.start.dateTime
        const todo = await TodoModel.findOne({
          _id: event.id,
        })
        const monthAndYearInEvent = eventDate.substr(0, 7)
        const timeInEvent = eventDate.substr(11, 5)
        const dateInEvent = eventDate.substr(8, 2)
        if (timeInEvent !== todo.time) {
          todo.time = timeInEvent
        }
        if (dateInEvent !== todo.date) {
          todo.date = dateInEvent
        }
        if (monthAndYearInEvent !== todo.monthAndYear) {
          todo.monthAndYear = monthAndYearInEvent
        }
        todo.save()
      })
      ctx.status = 200
    } catch (err) {
      console.log(err.message)
      ctx.status = 500
    }
  }

  @Post('/closeChannel', authenticate)
  async closeChannel(ctx: Context) {
    try {
      const token = ctx.headers.token
      const { _id } = await getUserFromToken(token)
      const oauth = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_SECRET,
        `${BASE_URL}/google_calendar_setup`
      )
      const api = google.calendar({ version: 'v3', auth: oauth })
      const user = await UserModel.findOne({
        _id: _id,
      })
      const resourceId = user.resourceId
      const credentials = user.settings.googleCalendarCredentials
      oauth.setCredentials(credentials)
      await api.channels.stop({
        requestBody: {
          id: _id,
          resourceId: resourceId,
        },
      })
      user.resourceId = undefined
      user.save()
      ctx.status = 200
    } catch (err) {
      console.log(err)
      ctx.status = 500
    }
  }
}
