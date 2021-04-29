import { Context } from 'telegraf'

export function checkIfPrivate(ctx: Context, next) {
  if (ctx.chat?.type === 'private') {
    return next()
  }
}
