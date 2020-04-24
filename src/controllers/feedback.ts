// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { bot } from '../helpers/report'

@Controller('/feedback')
export default class {
  @Post('/', authenticate)
  async feedback(ctx: Context) {
    bot.telegram.sendMessage(
      process.env.TELEGRAM_ADMIN,
      `#feedback
${ctx.state.user._id}, ${ctx.state.user.name}

${JSON.stringify(ctx.request.body.state)}`
    )
    ctx.status = 200
  }
}
