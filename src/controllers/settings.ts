// Dependencies
import { Controller, Post, Put } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { requestSync } from '../sockets'
import { getGoogleCalendarApi } from '../helpers/googleCalendar'

@Controller('/settings')
export default class {
  @Post('/', authenticate)
  async post(ctx: Context) {
    if (ctx.request.body.googleCalendarCredentials === null) {
      const googleCredentials =
        ctx.state.user.settings.googleCalendarCredentials
      const resourceId = ctx.state.user.googleCalendarResourceId
      const api = getGoogleCalendarApi(googleCredentials)
      await api.channels.stop({
        requestBody: {
          id: ctx.state.user._id,
          resourceId: resourceId,
        },
      })
      ctx.request.body.googleCalendarCredentials = undefined
    }
    // Set settings
    ctx.state.user.settings = {
      ...(ctx.state.user.settings || {}),
      ...(ctx.request.body || {}),
      ...{ updatedAt: new Date() },
    }
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Put('/', authenticate)
  async put(ctx: Context) {
    if (ctx.request.body.googleCalendarCredentials === null) {
      const googleCredentials =
        ctx.state.user.settings.googleCalendarCredentials
      const resourceId = ctx.state.user.googleCalendarResourceId
      const api = getGoogleCalendarApi(googleCredentials)
      await api.channels.stop({
        requestBody: {
          id: ctx.state.user._id,
          resourceId: resourceId,
        },
      })
      ctx.request.body.googleCalendarCredentials = undefined
    }
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
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }
}
