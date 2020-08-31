import { ContextMessageUpdate } from 'telegraf'
import { sendLanguage } from '../commands/language'
import { updateWitLanguage } from '../helpers/witLanguage'

export function checkLanguage(ctx: ContextMessageUpdate, next) {
  if (ctx.dbuser.telegramLanguage) {
    updateWitLanguage(ctx, ctx.dbuser.telegramLanguage)
    return next()
  }
  return sendLanguage(ctx)
}
