import { addTodo } from '@/helpers/telegram/commands/todo'
import { checkAndAttachUser } from '@/helpers/telegram/middlewares/checkAndAttachUser'
import { checkIfPrivate } from '@/helpers/telegram/middlewares/checkIfPrivate'
import { checkLanguage } from '@/helpers/telegram/middlewares/checkLanguage'
import { checkTime } from '@/helpers/telegram/middlewares/checkTime'
import {
  handleCurrent,
  handleDone,
  handleRefresh,
  handleSkip,
} from '@/helpers/telegram/commands/current'
import { handleId } from '@/helpers/telegram/commands/id'
import {
  handleLanguage,
  localesFiles,
  sendLanguage,
} from '@/helpers/telegram/commands/language'
import { handleText } from '@/helpers/telegram/helpers/handleText'
import { handleTimezone } from '@/helpers/telegram/commands/timezone'
import { handleVoice } from '@/helpers/telegram/helpers/handleVoice'
import { handleZen } from '@/helpers/telegram/commands/zen'
import { sendHelp } from '@/helpers/telegram/commands/help'
import { sendLogin } from '@/helpers/telegram/commands/login'
import { sendQR } from '@/helpers/telegram/commands/qr'
import { setupI18N } from '@/helpers/telegram/helpers/i18n'
import Telegraf from 'telegraf'

// Create bot
export const bot = new Telegraf(process.env.TELEGRAM_LOGIN_TOKEN)
// Check if the message needs to be handled
bot.use(checkIfPrivate)
bot.use(checkTime)
bot.use(checkAndAttachUser)
// Setup i18n
setupI18N(bot)
// Check if the language keyboard is pressed
bot.action(
  localesFiles().map((file) => file.split('.')[0]),
  handleLanguage
)
// Check if user has set the language
bot.use(checkLanguage)
// Commands
bot.command(['start', 'help'], sendHelp)
bot.command('language', sendLanguage)
bot.command('login', sendLogin)
bot.command(['todo', 'frog', 'done'], addTodo)
bot.command('zen', handleZen)
bot.command('timezone', handleTimezone)
bot.command('current', handleCurrent)
bot.command('id', handleId)
bot.command('qr', sendQR)
// Actions
bot.action('done', handleDone)
bot.action('skip', handleSkip)
bot.action('refresh', handleRefresh)
// Check zen mode
bot.on('text', handleText)
bot.on('photo', handleText)
bot.on('video', handleText)
bot.on('document', handleText)
bot.on('voice', handleVoice)
// Error catch
bot.catch(console.error)
