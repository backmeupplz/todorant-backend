// Dependencies
import { Controller, Post, Put } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate, getUserFromToken } from '../middlewares/authenticate'
import { requestSync } from '../sockets'
import { google } from 'googleapis'

const BASE_URL = process.env.BASE_URL

@Controller('/settings')
export default class {
  @Post('/', authenticate)
  async post(ctx: Context) {
    // Set settings
    ctx.state.user.settings = {
      ...(ctx.state.user.settings || {}),
      ...(ctx.request.body || {}),
      ...{ updatedAt: new Date() },
    }
    if (ctx.request.body.googleCalendarCredentials === null) {
      const oauth = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_SECRET,
        `${BASE_URL}/google_calendar_setup`
      )
      const api = google.calendar({ version: 'v3', auth: oauth })
      const resourceId = ctx.state.user.resourceId
      const googleCredentials = (await getUserFromToken(ctx.headers.token))
        .settings.googleCalendarCredentials
      oauth.setCredentials(googleCredentials)
      await api.channels.stop({
        requestBody: {
          id: ctx.state.user._id,
          resourceId: resourceId,
        },
      })
      ctx.state.user.settings.googleCalendarCredentials = undefined
    }
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Put('/', authenticate)
  async put(ctx: Context) {
    // Set settings
    if (
      typeof ctx.request.body.showTodayOnAddTodo === 'string' ||
      ctx.request.body.showTodayOnAddTodo instanceof String
    ) {
      ctx.request.body.showTodayOnAddTodo =
        ctx.request.body.showTodayOnAddTodo === '1'
    }
    if (
      typeof ctx.request.body.newTodosGoFirst === 'string' ||
      ctx.request.body.newTodosGoFirst instanceof String
    ) {
      ctx.request.body.newTodosGoFirst =
        ctx.request.body.newTodosGoFirst === '1'
    }
    ctx.state.user.settings = {
      ...(ctx.state.user.settings || {}),
      ...(ctx.request.body || {}),
      ...{ updatedAt: new Date() },
    }
    if (ctx.request.body.googleCalendarCredentials === null) {
      const oauth = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_SECRET,
        `${BASE_URL}/google_calendar_setup`
      )
      const api = google.calendar({ version: 'v3', auth: oauth })
      const resourceId = ctx.state.user.resourceId
      const googleCredentials = (await getUserFromToken(ctx.headers.token))
        .settings.googleCalendarCredentials
      oauth.setCredentials(googleCredentials)
      await api.channels.stop({
        requestBody: {
          id: ctx.state.user._id,
          resourceId: resourceId,
        },
      })
      ctx.state.user.settings.googleCalendarCredentials = undefined
    }
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }
}
