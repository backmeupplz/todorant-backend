import { ContextMessageUpdate } from 'telegraf'
import { addTodoWithText } from '../commands/todo'

export function handleText(ctx: ContextMessageUpdate) {
  // Check if it's zen
  if (!ctx.dbuser.telegramZen) {
    return
  }
  // Check if not a command
  if (/^\//.test(ctx.message.text)) {
    return
  }
  // Add todo
  return addTodoWithText(ctx.message.text, ctx)
}
