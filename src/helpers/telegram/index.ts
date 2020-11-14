import Telegraf from 'telegraf'
import { checkIfPrivate } from '@/helpers/telegram/middlewares/checkIfPrivate'
import { checkTime } from '@/helpers/telegram/middlewares/checkTime'
import { checkAndAttachUser } from '@/helpers/telegram/middlewares/checkAndAttachUser'
import { sendHelp } from '@/helpers/telegram/commands/help'
import { setupI18N } from '@/helpers/telegram/helpers/i18n'
import {
  localesFiles,
  handleLanguage,
  sendLanguage,
} from '@/helpers/telegram/commands/language'
import { checkLanguage } from '@/helpers/telegram/middlewares/checkLanguage'
import { sendLogin } from '@/helpers/telegram/commands/login'
import { addTodo } from '@/helpers/telegram/commands/todo'
import { handleText } from '@/helpers/telegram/helpers/handleText'
import { handleVoice } from '@/helpers/telegram/helpers/handleVoice'
import { handleZen } from '@/helpers/telegram/commands/zen'
import { handleTimezone } from '@/helpers/telegram/commands/timezone'
import {
  handleCurrent,
  handleDone,
  handleSkip,
  handleRefresh,
} from '@/helpers/telegram/commands/current'
import { handleId } from '@/helpers/telegram/commands/id'
import { sendDebug } from '@/helpers/telegram/commands/debug'
import { sendQR } from '@/helpers/telegram/commands/qr'
import { checkSuperAdmin } from '@/helpers/telegram/middlewares/checkSuperAdmin'
import { sendSubscriptions } from '@/helpers/telegram/commands/subscriptions'

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
bot.command('debug', checkSuperAdmin, sendDebug)
bot.command('subscriptions', checkSuperAdmin, sendSubscriptions)
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
