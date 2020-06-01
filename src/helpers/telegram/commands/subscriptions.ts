import { ContextMessageUpdate } from 'telegraf'

export async function sendSubscriptions(ctx: ContextMessageUpdate) {
  return ctx.reply('noice')
}
