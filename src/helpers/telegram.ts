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

bot.command('todo', async ctx => {
  // Check text
  const todoText = ctx.message.text.substr(5).trim()
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
      monthAndYear: `${new Date().getFullYear()}-${
        month > 9 ? month : `0${month}`
      }`,
      date: `${new Date().getDate()}`,
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

bot.command('done', async ctx => {
  // Check text
  const todoText = ctx.message.text.substr(5).trim()
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
      monthAndYear: `${new Date().getFullYear()}-${
        month > 9 ? month : `0${month}`
      }`,
      date: `${new Date().getDate()}`,
      completed: true,
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

bot.command('frog', async ctx => {
  // Check text
  const todoText = ctx.message.text.substr(5).trim()
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
      monthAndYear: `${new Date().getFullYear()}-${
        month > 9 ? month : `0${month}`
      }`,
      date: `${new Date().getDate()}`,
      frog: true,
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
