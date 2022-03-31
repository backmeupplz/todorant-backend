import { Context } from 'koa'
import { Controller, Ctx, Post } from 'koa-ts-controllers'
import { admins } from '@/helpers/telegram/admins'
import { bot } from '@/helpers/report'
import { getUserFromToken } from '@/middlewares/authenticate'

@Controller('/feedback')
export default class FeedbackController {
  @Post('/')
  async feedback(@Ctx() ctx: Context) {
    let name = `Not registered`
    const token =
      ctx.headers.token !== 'undefined' ? ctx.headers.token : undefined
    if (token) {
      const user = await getUserFromToken(token)
      if (user) {
        name = `${user._id}, ${user.name}`
      }
    }

    bot.telegram.sendMessage(
      admins[0],
      `#feedback ${name}

${JSON.stringify(ctx.request.body.state)}`
    )
    ctx.status = 200
  }
}
