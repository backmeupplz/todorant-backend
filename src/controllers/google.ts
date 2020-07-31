// Dependencies
import { Controller, Post, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { SubscriptionStatus, UserModel, TodoModel } from '../models'
import {
  getGoogleCalendarOAuthURL,
  getGoogleCalendarToken,
  getTodorantCalendar,
  getGoogleEvents,
} from '../helpers/googleCalendar'
import { google } from 'googleapis'
const Verifier = require('google-play-billing-validator')

const googleCredentials = require('../../assets/api-4987639842126744234-562450-c85efe0aadfc.json')

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
    ctx.body = await getGoogleCalendarToken(code, !!ctx.request.body.web)
  }
  @Post('/notifications')
  async post(ctx: Context) {
    try {
      const oauth = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_SECRET,
        'http://127.0.0.1:8080/google_calendar_setup'
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
}
