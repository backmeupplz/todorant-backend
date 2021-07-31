import { UserModel } from '@/models/user'
import { bot } from '@/helpers/telegram'
import { sendBouncerMessage } from '@/helpers/sendEmail'

async function sendMessageToBouncers() {
  if (process.env.DEBUG || process.env.NODE_ENV === 'test') {
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
  let sentMessagesCountTelegram = 0
  for (const bouncer of telegramBouncers) {
    const telegramId = parseInt(bouncer.telegramId, 10)
    if (!telegramId) {
      continue
    }
    try {
      await bot.telegram.sendMessage(
        telegramId,
        `Hi there! It's Nikita, the creator of Todorant. Can you please spend just 2 minutes and answer a couple of questions about why you don't use Todorant anymore? You can answer them here: https://forms.gle/nJ6JoASKQc1Juv1j7. Just a couple of minutes — but a massive help to anyone who still uses Todorant. All questions are optional, and the answers are anonymous. I appreciate any help you can provide!

I also gift you another free month of Todorant! Enter the code <code>1MOREMONTH</code> when subscribing at todorant.com (only works if you subscribe on the web) — and you will get $5 off.

If you have any additional questions, please contact me directly — @borodutch. Thank you!

***

Привет! Это Никита, создатель Тудуранта. Можете, пожалуйста, потратить 2 минуты и ответить на несколько вопросов, почему вы больше не пользуетесь Тудурантом? Ответить можно по ссылке вот тут: https://forms.gle/nmP1RozzvAZmEUhw6. Всего пара минут — а гигантская польза всем людям, что продолжают добавлять задачи в Тудурант. Все вопросы там необязательны для ответа, а опрос анонимен. Спасибо огромное заранее!

За заполнение этой короткой формы я дарю вам бесплатный месяц Тудуранта! Просто введите код <code>1MOREMONTH</code> при оформлении подписки на todorant.com (работает только при оформлении подписки на вебсайте) — и вы получите скидку в $5.

Если у вас есть какие-либо дополнительные вопросы, пожалуйста, напишите мне напрямую — @borodutch. Спасибо!`,
        { disable_web_page_preview: true, parse_mode: 'HTML' }
      )
      sentMessagesCountTelegram++
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
  await bot.telegram.sendMessage(
    76104711,
    `Sent bouncer mesages to ${sentMessagesCountTelegram} telegram bouncers`
  )
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
        `Failed sending bouncer user message to ${email}: ${err.message || err}`
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
  return new Promise<void>((res) => {
    setTimeout(() => {
      res()
    }, s * 1000)
  })
}
