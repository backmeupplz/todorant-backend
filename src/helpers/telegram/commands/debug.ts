import { ContextMessageUpdate } from 'telegraf'

export async function sendDebug(ctx: ContextMessageUpdate) {
  if (ctx.from.id !== parseInt(process.env.ADMIN, 10)) {
    return
  }
  return ctx.reply('noice')
}
