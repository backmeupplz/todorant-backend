import { Context, Markup } from 'telegraf'

export function sendLogin(ctx: Context) {
  return ctx.reply(
    ctx.dbuser && ctx.i18n
      ? ctx.i18n.t('login')
      : `Please, login to todorant.com with the button below first and then come back.

Пожалуйста, зайдите на todorant.com при помощи кнопки ниже, а потом возвращайтесь.`,
    {
      reply_markup: Markup.inlineKeyboard(loginKeyboard()),
    }
  )
}

function loginKeyboard(): any {
  return [
    {
      text: 'Todorant.com login',
      url: process.env.DEBUG ? 'https://todorant.com' : undefined,
      login_url: process.env.DEBUG
        ? undefined
        : {
            url: 'https://todorant.com',
          },
    },
    {
      text: 'Todorant.org login',
      url: process.env.DEBUG ? 'https://todorant.org' : undefined,
      login_url: process.env.DEBUG
        ? undefined
        : {
            url: 'https://todorant.org',
          },
    },
  ]
}
