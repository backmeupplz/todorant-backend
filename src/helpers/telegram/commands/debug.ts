import { Context } from 'telegraf'

export async function sendDebug(ctx: Context) {
  return ctx.reply('noice')
}
