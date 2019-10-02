// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'

@Controller('/apple')
export default class {
  @Post('/')
  docs(ctx: Context) {
    if (ctx.request.body.error) {
      ctx.redirect(`https://todorant.com?appleError=${ctx.request.body.error}`)
    }
    ctx.redirect(
      `https://todorant.com?apple=${JSON.stringify(ctx.request.body)}`
    )
  }
}
