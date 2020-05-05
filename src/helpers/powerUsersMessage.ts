import { UserModel, User, TodoModel } from '../models'
import { bot } from './telegram'
import { sendPowerUserMessage } from './sendEmail'
import { InstanceType } from 'typegoose'

async function sendMessageToPowerUsers() {
  if (process.env.DEBUG) {
    return
  }
  // Send to telegram
  const telegramPowerUsers = await UserModel.find({
    createdAt: {
      $lt: new Date().setDate(new Date().getDate() - 41),
    },
    $and: [
      {
        $or: [
          { powerUserNotified: false },
          { powerUserNotified: { $exists: false } },
        ],
      },
      {
        $or: [
          { subscriptionStatus: 'earlyAdopter' },
          { subscriptionStatus: 'active' },
        ],
      },
    ],
    telegramId: { $exists: true },
  })
  console.log(
    `Sending message to ${telegramPowerUsers.length} telegram power users`
  )
  let numberOfValidPowerUsers = 0
  for (const powerUser of telegramPowerUsers) {
    const telegramId = parseInt(powerUser.telegramId, 10)
    if (!telegramId) {
      continue
    }
    try {
      const todoCount = await countTodos(powerUser)
      if (todoCount < 1001) {
        continue
      }
      numberOfValidPowerUsers++
      await bot.telegram.sendMessage(
        telegramId,
        `Вот это да! Больше 1000 задач! 🎉💪🔥

Это @borodutch, создатель Тудуранта. Можете, пожалуйста, потратить 2 минуты и ответить на несколько вопросов, что вам больше всего нравится и не нравится в Тудуранте? Ответить можно по ссылке вот тут: https://forms.gle/hNgYMpQyMyJQwiuDA. Всего пара минут — а гигантская польза всем людям, что пользуются Тудурантом! Все вопросы там необязательны для ответа, а опрос анонимен. Спасибо огромное заранее!

Если у вас есть какие-либо дополнительные вопросы, пожалуйста, напишите мне напрямую — @borodutch. Спасибо!

***

Woah! Over 1000 tasks! 🎉💪🔥

Hi there! It's @borodutch, the creator of Todorant. Can you please spend just 2 minutes and answer couple of questions what you like and what you don't like about Todorant? You can answer them here: https://forms.gle/C4Byzcypkd7KsXJHA. Just a couple of minutes — but huge help to anyone who uses Todorant! All questions are optional and the answers are anonymous. Thank you a lot in advance!

If you have any additional questions please contact me directly — @borodutch. Thank you!`,
        { disable_web_page_preview: true }
      )
      await bot.telegram.sendMessage(
        76104711,
        `Sent power user message to ${telegramId}`
      )
    } catch (err) {
      console.error(err)
    }
    powerUser.powerUserNotified = true
    await powerUser.save()
  }
  console.log(`Sent message to ${numberOfValidPowerUsers} telegram power users`)
  // Send to email
  const emailPowerUsers = await UserModel.find({
    createdAt: {
      $lt: new Date().setDate(new Date().getDate() - 41),
    },
    $and: [
      {
        $or: [
          { powerUserNotified: false },
          { powerUserNotified: { $exists: false } },
        ],
      },
      {
        $or: [
          { subscriptionStatus: 'earlyAdopter' },
          { subscriptionStatus: 'active' },
        ],
      },
    ],
    email: { $exists: true },
    telegramId: { $exists: false },
  })
  console.log(`Sending message to ${emailPowerUsers.length} email power users`)
  numberOfValidPowerUsers = 0
  for (const powerUser of emailPowerUsers) {
    const email = powerUser.email
    if (!email) {
      continue
    }
    const todoCount = await countTodos(powerUser)
    if (todoCount < 1001) {
      continue
    }
    numberOfValidPowerUsers++
    try {
      await sendPowerUserMessage(email)
      await bot.telegram.sendMessage(
        76104711,
        `Sent power user message to ${email}`
      )
    } catch (err) {
      console.error(err)
    }
    powerUser.powerUserNotified = true
    await powerUser.save()
  }
  console.log(`Sent message to ${numberOfValidPowerUsers} email power users`)
}

async function countTodos(user: InstanceType<User>) {
  const todoCount = await TodoModel.countDocuments({ user: user._id })
  return todoCount
}

sendMessageToPowerUsers()
setInterval(sendMessageToPowerUsers, 24 * 60 * 60 * 1000) // once per day
