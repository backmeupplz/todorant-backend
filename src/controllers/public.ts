import { Context } from 'koa'
import { Controller, Ctx, Get } from 'koa-ts-controllers'
import showdown = require('showdown')

showdown.setFlavor('github')

@Controller('/')
export default class PublicController {
  @Get('/')
  docs(@Ctx() ctx: Context) {
    try {
      ctx.redirect("docs/")
      return 200
    } catch (err) {
      ctx.throw(500)
    }
  }
}
