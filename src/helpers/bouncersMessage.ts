import { UserModel } from '@/models/user'
import { bot } from '@/helpers/telegram'
import { sendBouncerMessage } from '@/helpers/sendEmail'

async function sendMessageToBouncers() {
  if (process.env.DEBUG) {
    return
  }
  // Send to telegram
  const telegramBouncers = await UserModel.find({
    createdAt: {
      $lt: new Date().setDate(new Date().getDate() - 31),
      $gt: new Date().setDate(new Date().getDate() - 60),
    },
    bouncerNotified: false,
    telegramId: { $exists: true },
    subscriptionStatus: 'inactive',
  })
  await bot.telegram.sendMessage(
    76104711,
    `Sending bouncer mesages to ${telegramBouncers.length} Telegram bouncers`
  )
  for (const bouncer of telegramBouncers) {
    const telegramId = parseInt(bouncer.telegramId, 10)
    if (!telegramId) {
      continue
    }
    try {
      await bot.telegram.sendMessage(
        telegramId,
        `Привет! Это @borodutch, создатель Тудуранта. Можете, пожалуйста, потратить 2 минуты и ответить на несколько вопросов, почему вы больше не пользуетесь Тудурантом? Ответить можно по ссылке вот тут: https://forms.gle/nmP1RozzvAZmEUhw6. Всего пара минут — а гигантская польза всем людям, что продолжают добавлять задачи в Тудурант. Все вопросы там необязательны для ответа, а опрос анонимен. Спасибо огромное заранее!

Если у вас есть какие-либо дополнительные вопросы, пожалуйста, напишите мне напрямую — @borodutch. Спасибо!

***

Hi there! It's @borodutch, the creator of Todorant. Can you please spend just 2 minutes and answer couple of questions why you don't use Todorant anymore? You can answer them here: https://forms.gle/nJ6JoASKQc1Juv1j7. Just a couple of minutes — but huge help to anyone who still uses Todorant. All questions are optional and the answers are anonymous. Thank you a lot in advance!

If you have any additional questions please contact me directly — @borodutch. Thank you!`,
        { disable_web_page_preview: true }
      )
    } catch (err) {
      console.error(err)
      bot.telegram.sendMessage(
        76104711,
        `Failed sending bouncer message to ${telegramId}: ${err.message || err}`
      )
    }
    bouncer.bouncerNotified = true
    await bouncer.save()
  }
  // Send to email
  const emailBouncers = await UserModel.find({
    createdAt: {
      $lt: new Date().setDate(new Date().getDate() - 31),
      $gt: new Date().setDate(new Date().getDate() - 60),
    },
    bouncerNotified: false,
    telegramId: { $exists: false },
    email: { $exists: true },
    subscriptionStatus: 'inactive',
  })
  await bot.telegram.sendMessage(
    76104711,
    `Sending bouncer mesages to ${emailBouncers.length} email bouncers`
  )
  let sentMessagesCount = 0
  for (const bouncer of emailBouncers) {
    const email = bouncer.email
    if (!email) {
      continue
    }
    try {
      await sendBouncerMessage(email)
      await delay(5)
      sentMessagesCount++
    } catch (err) {
      console.error(err)
      if (err.message.includes('SPAM')) {
        break
      }
      bot.telegram.sendMessage(
        76104711,
        `Failed sending power user message to ${email}: ${err.message || err}`
      )
    }
    bouncer.bouncerNotified = true
    await bouncer.save()
  }
  await bot.telegram.sendMessage(
    76104711,
    `Sent bouncer mesages to ${sentMessagesCount} email bouncers`
  )
}

sendMessageToBouncers()
setInterval(sendMessageToBouncers, 24 * 60 * 60 * 1000) // once per day

function delay(s: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res()
    }, s * 1000)
  })
}
