// Dependencies
import { Controller, Post } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { path } from 'temp'
import { writeFileSync, unlinkSync } from 'fs'
import { bot } from '../helpers/report'

@Controller('/data')
export default class {
  @Post('/', authenticate)
  async postData(ctx: Context) {
    const tempPath = path({ suffix: '.json' })
    console.log(tempPath)
    writeFileSync(tempPath, JSON.stringify(ctx.request.body, undefined, 2))
    await bot.telegram.sendMessage(
      process.env.ADMIN,
      `${ctx.state.user._id} ${ctx.state.user.name}`
    )
    await bot.telegram.sendDocument(process.env.ADMIN, { source: tempPath })
    unlinkSync(tempPath)
    ctx.status = 200
  }
}
