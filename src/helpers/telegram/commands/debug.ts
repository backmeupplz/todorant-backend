import { ContextMessageUpdate } from 'telegraf'

export async function sendDebug(ctx: ContextMessageUpdate) {
  return ctx.reply('noice')
}
