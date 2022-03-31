import I18N from 'telegraf-i18n'
import Telegraf, { Context } from 'telegraf'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dirtyI18N = require('telegraf-i18n')

const i18n = new dirtyI18N({
  directory: `${__dirname}/../../../../locales`,
  defaultLanguage: 'en',
  sessionName: 'session',
  useSession: false,
  allowMissing: true,
  defaultLanguageOnMissing: true,
}) as I18N

export function setupI18N(bot: Telegraf<Context>) {
  bot.use(i18n.middleware())
  bot.use((ctx, next) => {
    const anyI18N = ctx.i18n as any
    anyI18N.locale(ctx.dbuser.telegramLanguage)
    next()
  })
}
