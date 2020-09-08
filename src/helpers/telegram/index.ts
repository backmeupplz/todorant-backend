import Telegraf from 'telegraf'
import { checkIfPrivate } from './middlewares/checkIfPrivate'
import { checkTime } from './middlewares/checkTime'
import { checkAndAttachUser } from './middlewares/checkAndAttachUser'
import { sendHelp } from './commands/help'
import { setupI18N } from './helpers/i18n'
import { localesFiles, handleLanguage, sendLanguage } from './commands/language'
import { checkLanguage } from './middlewares/checkLanguage'
import { sendLogin } from './commands/login'
import { addTodo } from './commands/todo'
import { handleText } from './helpers/handleText'
import { handleVoice } from './helpers/handleVoice'
import { handleZen } from './commands/zen'
import { handleTimezone } from './commands/timezone'
import {
  handleCurrent,
  handleDone,
  handleSkip,
  handleRefresh,
} from './commands/current'
import { handleId } from './commands/id'
import { sendDebug } from './commands/debug'
import { sendQR } from './commands/qr'
import { checkSuperAdmin } from './middlewares/checkSuperAdmin'
import { sendSubscriptions } from './commands/subscriptions'

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
bot.on('voice', handleVoice)
// Error catch
bot.catch(console.error)
// Start bot
bot.launch().then(() => console.log('@todorant_bot launched'))
