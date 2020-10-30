import { Context, Markup as m, Extra } from 'telegraf'
import { readdirSync, readFileSync } from 'fs'
import { safeLoad } from 'js-yaml'
import { TelegramLanguage } from '@/models/user'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'

export function sendLanguage(ctx: Context) {
  return ctx.reply(
    ctx.i18n && ctx.dbuser.telegramLanguage
      ? ctx.i18n.t('language')
      : `Please, select language.

Пожалуйста, выберите язык.`,
    {
      reply_markup: languageKeyboard(),
    }
  )
}

export async function handleLanguage(ctx: Context) {
  ctx.dbuser.telegramLanguage = ctx.callbackQuery.data as TelegramLanguage
  ctx.dbuser = await ctx.dbuser.save()
  const message = ctx.callbackQuery.message
  const anyI18N = ctx.i18n as any
  anyI18N.locale(ctx.callbackQuery.data)
  return ctx.telegram.editMessageText(
    message.chat.id,
    message.message_id,
    undefined,
    ctx.i18n.t('language_selected'),
    Extra.HTML(true) as ExtraEditMessage
  )
}

function languageKeyboard() {
  const locales = localesFiles()
  const result = []
  locales.forEach((locale, index) => {
    const localeCode = locale.split('.')[0]
    const localeName = safeLoad(
      readFileSync(`${__dirname}/../../../../locales/${locale}`, 'utf8')
    ).name
    if (index % 2 == 0) {
      if (index === 0) {
        result.push([m.callbackButton(localeName, localeCode)])
      } else {
        result[result.length - 1].push(m.callbackButton(localeName, localeCode))
      }
    } else {
      result[result.length - 1].push(m.callbackButton(localeName, localeCode))
      if (index < locales.length - 1) {
        result.push([])
      }
    }
  })
  return m.inlineKeyboard(result)
}

export function localesFiles() {
  return readdirSync(`${__dirname}/../../../../locales`).filter((s) =>
    s.includes('yaml')
  )
}
