import { Context } from 'telegraf'
import { sendLanguage } from '@/helpers/telegram/commands/language'

export function checkLanguage(ctx: Context, next) {
  if (ctx.dbuser.telegramLanguage) {
    return next()
  }
  return sendLanguage(ctx)
}
