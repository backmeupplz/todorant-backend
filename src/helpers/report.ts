import Telegraf from 'telegraf'
import { admins } from '@/helpers/telegram/admins'

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

export async function report(err: Error, extra?: string) {
  const dismissableErrors = [
    'No authentication token provided',
    'invalid_grant',
    'Resource has been deleted',
    'not found for project',
    'Old API version',
  ]
  try {
    const text = `Todorant Error:\n${err.message || JSON.stringify(err)}${
      err.stack ? `\n\n${err.stack}` : ''
    }${extra ? `\n\n${extra}` : ''}`
    for (const errorText of dismissableErrors) {
      if (text.indexOf(errorText) > -1) {
        return
      }
    }
    if (admins[0] && process.env.TELEGRAM_LOGIN_TOKEN) {
      await bot.telegram.sendMessage(admins[0], text)
    }
  } catch (error) {
    console.error(err)
    console.error(error)
  }
}
