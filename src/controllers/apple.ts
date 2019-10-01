// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'

@Controller('/apple')
export default class {
  @Post('/')
  docs(ctx: Context) {
    ctx.redirect('https://todorant.com')
    console.log(ctx.request.body)
  }
}
