import { TagModel } from '../models/tag'
import { Context } from 'koa'
import { Controller, Get } from 'koa-router-ts'
import { authenticate } from '../middlewares/authenticate'

@Controller('/tag')
export default class {
  @Get('/', authenticate)
  async get(ctx: Context) {
    const tags = await TagModel.find({ user: ctx.state.user._id })
    // Respond
    ctx.body = tags.map((t) => t.stripped())
  }
}
