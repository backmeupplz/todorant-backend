// Dependencies
import { UserModel } from '../../../models'
import { ContextMessageUpdate } from 'telegraf'
import { sendLogin } from '../commands/login'

export async function checkAndAttachUser(ctx: ContextMessageUpdate, next) {
  const dbuser = await UserModel.findOne({ telegramId: `${ctx.from.id}` })
  if (!dbuser) {
    return sendLogin(ctx)
  }
  ctx.dbuser = dbuser
  next()
}
