// Dependencies
import Telegraf, { Markup, Extra } from 'telegraf'
import { UserModel, TodoModel } from '../models'

const bot = new Telegraf(process.env.TELEGRAM_LOGIN_TOKEN)

bot.start(ctx => {
  ctx.replyWithHTML(
    `Hi there! You can use this bot to quickly add new todos to todorant.com with /todo or /done commands. Make sure you login with the button below. Find the commands examples at the end of this message. Cheers!

Привет! Используйте этого бота для быстрого добавления задач в todorant.com при помощи команд /todo и /done. Обязательно убедитесь, что вы вошли на сайт при помощи кнопки ниже. Примеры использования команд в конце этого сообщения. Удачи!

/frog Answer the gym membership email
/todo Buy milk
/todo 2025-01 Celebrate New Year on my private island
/todo 2020-04-20 Buy cookies
/done Procrastinate for 20 minutes`,
    Extra.markdown().markup(
      Markup.inlineKeyboard([
        {
          text: 'Todorant login',
          login_url: {
            url: 'https://todorant.com',
          },
        } as any,
      ])
    )
  )
})

bot.command(['todo', 'frog', 'done'], async ctx => {
  // Get text
  let todoText = ctx.message.text.substr(6).trim()
  // Check if it has timestamp
  const full = todoText.substr(0, 10) // 2018-08-31
  const short = todoText.substr(0, 7) // 2018-08
  let monthAndYear = undefined
  let date = undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(full)) {
    const components = monthAndYear.split('-')
    monthAndYear = `${components[1]}-${components[0]}`
    date = components[2]
    todoText = todoText.substr(11).trim()
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(short)) {
    const components = monthAndYear.split('-')
    monthAndYear = `${components[1]}-${components[0]}`
    todoText = todoText.substr(8).trim()
  }
  // Check text
  if (!todoText) {
    return ctx.reply(`Please, provide text for this todo as shown below.

Пожалуйста, добавьте к этой задаче текст, как показано ниже.

/todo Buy milk`)
  }
  // Get user
  const user = await UserModel.findOne({ telegramId: `${ctx.from.id}` })
  if (!user) {
    return ctx.replyWithHTML(
      `Please, login with the button below first.

Пожалуйста, сначала войдите на сайт, используя кнопку ниже.`,
      Extra.markdown().markup(
        Markup.inlineKeyboard([
          {
            text: 'Todorant login',
            login_url: {
              url: 'https://todorant.com',
            },
          } as any,
        ])
      )
    )
  }
  // Add todos to user
  try {
    const month = new Date().getMonth() + 1

    const todo = {
      text: todoText,
      monthAndYear: monthAndYear
        ? monthAndYear
        : `${new Date().getFullYear()}-${month > 9 ? month : `0${month}`}`,
      date: date ? date : `${new Date().getDate()}`,
      frog: ctx.message.text.substr(1, 4) === 'frog',
      completed: ctx.message.text.substr(1, 4) === 'done',
    }
    user.todos = user.todos.concat([
      (await new TodoModel({ ...todo, user: user._id }).save())._id,
    ])
    await user.save()
    // Respond
    ctx.reply('👍', {
      reply_to_message_id: ctx.message.message_id,
    })
  } catch (err) {
    ctx.reply(`Oopsie, something went wrong!
    
Упс! Что-то пошло не так.

${err.message}`)
  }
})

bot.launch()
