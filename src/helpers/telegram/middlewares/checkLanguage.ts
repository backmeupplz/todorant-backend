import { ContextMessageUpdate } from 'telegraf'
import { sendLanguage } from '@helpers/telegram/commands/language'

export function checkLanguage(ctx: ContextMessageUpdate, next) {
  if (ctx.dbuser.telegramLanguage) {
    return next()
  }
  return sendLanguage(ctx)
}
