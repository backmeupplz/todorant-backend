import { ContextMessageUpdate } from 'telegraf'

export const witLanguages = JSON.parse(process.env.WIT_LANGUAGES)

const witCodes = {
  English: 'en',
  Italian: 'it',
  Russian: 'ru',
  Ukrainian: 'ua',
}

function languageForCode(code) {
  let language
  Object.keys(witCodes).forEach((key) => {
    const value = witCodes[key]
    if (value.includes(code)) {
      language = key
    }
  })
  return language
}

export async function updateWitLanguage(
  ctx: ContextMessageUpdate,
  telegramLanguage
) {
  ctx.dbuser.witLanguage = languageForCode(telegramLanguage)
  ctx.dbuser = await ctx.dbuser.save()
}
