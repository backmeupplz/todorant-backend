import { Context } from 'telegraf'
import { admins } from '@/helpers/telegram/admins'

export function checkSuperAdmin(ctx: Context, next) {
  if (!admins.includes(ctx.chat?.id)) {
    return
  }
  return next()
}
