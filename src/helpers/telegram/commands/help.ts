import { Context, Extra } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

export function sendHelp(ctx: Context) {
  return ctx.reply(ctx.i18n.t('help'), Extra.HTML(true) as ExtraReplyMessage)
}
