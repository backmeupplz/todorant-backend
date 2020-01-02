import { ContextMessageUpdate } from 'telegraf'
import * as moment from 'moment'

export async function handleTimezone(ctx: ContextMessageUpdate) {
  // Get and check timezone
  const timezone = ctx.message.text.substr(10).replace('+', '')
  if (
    isNaN(+timezone) ||
    timezone === '' ||
    +timezone > 12 ||
    +timezone < -12
  ) {
    return ctx.reply(ctx.i18n.t('timezone_help'))
  }
  // Set timezone
  ctx.dbuser.timezone = +timezone
  await ctx.dbuser.save()
  // Respond
  const now = new Date()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  return ctx.reply(
    ctx.i18n.t('timezone_success', {
      timezone: timezone === '0' ? '+0' : timezone,
      time: moment(new Date(utc.getTime() + 3600000 * +timezone)).format(
        'YYYY-MM-DD HH:mm:ss'
      ),
    })
  )
}
