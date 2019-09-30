// Dependencies
import { Controller, Post, Put } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'

@Controller('/settings')
export default class {
  @Post('/', authenticate)
  async post(ctx: Context) {
    // Set settings
    ctx.state.user.settings = ctx.request.body
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
  }

  @Put('/', authenticate)
  async put(ctx: Context) {
    // Set settings
    ctx.state.user.settings = {
      ...ctx.state.user.settings,
      ...ctx.request.body,
    }
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
  }
}
