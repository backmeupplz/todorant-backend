import { ContextMessageUpdate, Extra } from 'telegraf'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

export async function handleId(ctx: ContextMessageUpdate) {
  return ctx.reply(
    `<code>${ctx.from.id}</code>`,
    Extra.HTML(true) as ExtraReplyMessage
  )
}
