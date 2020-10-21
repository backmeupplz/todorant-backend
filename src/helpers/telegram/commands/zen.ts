import { Context, Extra } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

export async function handleZen(ctx: Context) {
  ctx.dbuser.telegramZen = !ctx.dbuser.telegramZen
  await ctx.dbuser.save()
  // Respond
  ctx.reply(
    ctx.i18n.t(ctx.dbuser.telegramZen ? 'zen_on' : 'zen_off'),
    Extra.HTML(true) as ExtraReplyMessage
  )
}
