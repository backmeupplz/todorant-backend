// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'
import { getUserFromToken } from '../middlewares/authenticate'
import { bot } from '../helpers/report'

@Controller('/feedback')
export default class {
  @Post('/')
  async feedback(ctx: Context) {
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
      process.env.ADMIN,
      `#feedback ${name}

${JSON.stringify(ctx.request.body.state)}`
    )
    ctx.status = 200
  }
}
