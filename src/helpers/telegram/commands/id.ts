import { Context, Extra } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

export async function handleId(ctx: Context) {
  return ctx.reply(
    `<code>${ctx.from.id}</code>`,
    Extra.HTML(true) as ExtraReplyMessage
  )
}
