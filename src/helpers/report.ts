import Telegraf from 'telegraf'

export const bot = new Telegraf(process.env.TELEGRAM_LOGIN_TOKEN)

export async function tryReport<T>(fun: (() => T) | Promise<T>) {
  try {
    const result = await (fun instanceof Function ? fun() : fun)
    return result
  } catch (err) {
    await report(err)
    return undefined
  }
}

export async function report(err: Error) {
  const dismissableErrors = [
    'No authentication token provided',
    'invalid_grant',
  ]
  try {
    let text = `Todorant Error:\n${err.message || JSON.stringify(err)}${
      err.stack ? `\n\n${err.stack}` : ''
    }`
    if (err.stack) {
      text = `${text}`
    }
    for (const errorText of dismissableErrors) {
      if (text.indexOf(errorText) > -1) {
        return
      }
    }
    await bot.telegram.sendMessage(process.env.ADMIN, text)
  } catch (error) {
    console.error(err)
    console.error(error)
  }
}
