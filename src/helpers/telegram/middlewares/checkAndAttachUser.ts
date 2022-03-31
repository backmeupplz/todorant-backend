import { Context } from 'telegraf'
import { UserModel } from '@/models/user'
import { sendLogin } from '@/helpers/telegram/commands/login'

export async function checkAndAttachUser(ctx: Context, next) {
  const dbuser = await UserModel.findOne({ telegramId: `${ctx.from.id}` })
  if (!dbuser) {
    return sendLogin(ctx)
  }
  ctx.dbuser = dbuser
  next()
}
