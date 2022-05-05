import { Context } from 'koa'
import { Controller, Ctx, Get } from 'koa-ts-controllers'

@Controller('/apple')
export default class AppleController {
  @Get('/')
  firefoxBug(@Ctx() ctx: Context) {
    ctx.redirect(`https://todorant.com/apple_firefox_error`)
    return 'Success!'
  }
}
