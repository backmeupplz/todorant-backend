import { Context } from 'telegraf'
import { addTodoWithText } from '@/helpers/telegram/commands/todo'

export function handleText(ctx: Context) {
  // Check if it's zen
  if (!ctx.dbuser.telegramZen) {
    return
  }
  // Check if not a command
  if (/^\//.test(ctx.message.text || ctx.message.caption)) {
    return
  }
  // Check if text is too long
  if (ctx.message.text.length > 1500) {
    return ctx.reply(ctx.i18n.t('text_too_long'))
  }
  // Add todo
  return addTodoWithText(ctx.message.text || ctx.message.caption, ctx)
}
