// Dependencies
import { ContextMessageUpdate } from 'telegraf'

export function checkIfPrivate(ctx: ContextMessageUpdate, next) {
  if (ctx.chat.type === 'private') {
    return next()
  }
}
