import I18N from 'telegraf-i18n'
import Telegraf, { ContextMessageUpdate } from 'telegraf'
const dirtyI18N = require('telegraf-i18n')

const i18n = new dirtyI18N({
  directory: `${__dirname}/../../../../locales`,
  defaultLanguage: 'en',
  sessionName: 'session',
  useSession: false,
  allowMissing: true,
  defaultLanguageOnMissing: 'en',
}) as I18N

export function setupI18N(bot: Telegraf<ContextMessageUpdate>) {
  bot.use(i18n.middleware())
  bot.use((ctx, next) => {
    const anyI18N = ctx.i18n as any
    anyI18N.locale(ctx.dbuser.telegramLanguage)
    next()
  })
}
