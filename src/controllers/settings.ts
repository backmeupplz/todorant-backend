// Dependencies
import { Controller, Post, Put } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { requestSync } from '../sockets'

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
    if (!ctx.request.body.googleCalendarCredentials) {
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
    if (!ctx.request.body.googleCalendarCredentials) {
      ctx.state.user.settings.googleCalendarCredentials = undefined
    }
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }
}
