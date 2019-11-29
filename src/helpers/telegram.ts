// Dependencies
import Telegraf, { Markup, Extra, ContextMessageUpdate } from 'telegraf'
import { UserModel, TodoModel, Todo, User } from '../models'
import * as moment from 'moment'
import { InstanceType } from 'typegoose'
import { isUserSubscribed } from './isUserSubscribed'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'

export const bot = new Telegraf(process.env.TELEGRAM_LOGIN_TOKEN)

bot.command(['start', 'help'], ctx => {
  ctx.replyWithHTML(
    `Hi there! You can use this bot to quickly add new todos to todorant.com with /todo or /done commands. Make sure you login with the button below and set your timezone with /timezone command. Use /current to see your current task and complete it. Use /zen command to enter the zen mode. Find the commands examples at the end of this message. Cheers!

Привет! Используйте этого бота для быстрого добавления задач в todorant.com при помощи команд /todo и /done. Обязательно убедитесь, что вы вошли на сайт при помощи кнопки ниже и что вы установили свой часовой пояс при помощи команды /timezone. Используйте команду /current для того, чтобы увидеть и завершить текущую задачу. Используйте команду /zen, чтобы войти в дзен-режим. Примеры использования команд в конце этого сообщения. Удачи!

/frog Answer the gym membership email
/todo Buy milk
/todo 2025-01 Celebrate New Year on my private island
/todo 2020-04-20 Buy cookies
/done Procrastinate for 20 minutes
/timezone +3
/timezone -8
/timezone 0`,
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

bot.use(attachUser)

bot.command(['todo', 'frog', 'done'], ctx => {
  // Get text
  let todoText = ctx.message.text.substr(6).trim()
  return addTodo(todoText, ctx)
})

bot.command('timezone', async ctx => {
  // Get and check timezone
  const timezone = ctx.message.text.substr(10).replace('+', '')
  if (
    isNaN(+timezone) ||
    timezone === '' ||
    +timezone > 12 ||
    +timezone < -12
  ) {
    return ctx.reply(`Please, use this command like shown below. Thank you!

Пожалуйста, используйте эту команду, как показано ниже. Спасибо!

/timezone +3
/timezone -8
/timezone 0`)
  }
  // Get user
  const user = ctx.dbuser
  // Set timezone
  user.timezone = +timezone
  await user.save()
  // Respond
  const now = new Date()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)

  return ctx.reply(`Your timezone was set to UTC${
    timezone === '0' ? '+0' : timezone
  }. Please, check if the time below is your current time.

Ваш часовой пояс был установлен на UTC${
    timezone === '0' ? '+0' : timezone
  }. Пожалуйста, проверьте, что время ниже — это ваше текущее время.

${moment(new Date(utc.getTime() + 3600000 * +timezone)).format(
  'YYYY-MM-DD HH:mm:ss'
)}`)
})

bot.command('zen', async ctx => {
  // Get user
  const user = ctx.dbuser
  user.telegramZen = !user.telegramZen
  await user.save()
  // Respond
  ctx.reply(
    user.telegramZen
      ? `Welcome to the zen mode! Anything you send me will be handled as if you had <code>/todo</code> command prepended. So don't bother sending <code>/todo Clean fridge</code> or <code>/todo 2020 Watch all of the House MD</code>, just do <code>Clean fridge</code> and <code>2020 Watch all of the House MD</code>. Use /zen to turn this mode off.
  
Добро пожаловать в дзен-режим! Все, что вы мне пошлете, будет обрабатываться, как будто вы написали перед этим <code>/todo</code>. Не нужно присылать <code>/todo Почистить холодильник</code> или <code>/todo 2020 Посмотреть всего Доктора Хауса</code>, просто пришлите <code>Почистить холодильник</code> или <code>2020 Посмотреть всего Доктора Хауса</code>. Воспользуйтесь командой /zen, чтобы отключить этот режим.`
      : `You turned off zen mode.
  
Вы выключили дзен-режим.`,
    Extra.HTML(true) as ExtraReplyMessage
  )
})

bot.command('current', async ctx => {
  // Get user
  const user = ctx.dbuser
  // Get current
  const current = await findCurrentForUser(user)
  // Respond
  if (current) {
    ctx.reply(
      current.frog ? `🐸 ${current.text}` : current.text,
      Markup.inlineKeyboard([
        Markup.callbackButton('✅', 'done'),
        Markup.callbackButton('⏩', 'skip', current.skipped || current.frog),
        Markup.callbackButton('🔄', 'refresh'),
      ]).extra()
    )
  } else {
    ctx.reply(
      `👍 You did it! All the tasks for today are done, go get rest or maybe dance a little 💃
      
👍 Вы это сделали! Все задачи на сегодня выполнены, идите отдохните — ну или потанцуйте немного 💃`
    )
  }
})

bot.action('done', async ctx => {
  // Get user
  const user = ctx.dbuser
  // Get current
  const current = await findCurrentForUser(user)
  if (current) {
    current.completed = true
    await current.save()
  }
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
})

bot.action('skip', async ctx => {
  // Get user
  const user = ctx.dbuser
  // Get current
  const current = await findCurrentForUser(user)
  if (current) {
    current.skipped = true
    await current.save()
  }
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
})

bot.action('refresh', async ctx => {
  // Get user
  const user = ctx.dbuser
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
})

bot.on('text', attachUser, ctx => {
  // Check if it's zen
  if (!ctx.dbuser.telegramZen) {
    return
  }
  // Check if not a command
  if (/^\//.test(ctx.message.text)) {
    return
  }
  // Add todo
  return addTodo(ctx.message.text, ctx)
})

async function addTodo(todoText: string, ctx: ContextMessageUpdate) {
  // Check if it has timestamp
  const full = todoText.substr(0, 10) // 2018-08-31
  const short = todoText.substr(0, 7) // 2018-08
  let monthAndYear = undefined
  let date = undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(full)) {
    const components = full.split('-')
    monthAndYear = `${components[0]}-${components[1]}`
    date = components[2]
    todoText = todoText.substr(11).trim()
  } else if (/^\d{4}-\d{2}$/.test(short)) {
    monthAndYear = short
    todoText = todoText.substr(8).trim()
  }
  // Check text
  if (!todoText) {
    return ctx.reply(`Please, provide text for this todo as shown below.

Пожалуйста, добавьте к этой задаче текст, как показано ниже.

/todo Buy milk`)
  }
  // Get user
  const user = ctx.dbuser
  // Check subscription
  if (!isUserSubscribed(user)) {
    return ctx.reply(`Please, subscribe at todorant.com to keep using the service.
    
Пожалуйста, подпишитесь на todorant.com, чтобы продолжить пользование сервисом.`)
  }
  // Add todo to user
  try {
    // Get todo date
    const now = new Date()
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
    const nowWithOffset = new Date(
      utc.getTime() + 3600000 * (user.timezone || 0)
    )
    const month = nowWithOffset.getMonth() + 1
    // Check dates
    if (monthAndYear) {
      const pastError = `Date cannot be in the past.

Дата не может быть в прошлом.`
      const components = monthAndYear.split('-')
      const year = +components[0]
      const month = +components[1]

      const yearNow = nowWithOffset.getFullYear()
      if (year < yearNow) {
        return ctx.reply(pastError)
      }
      const monthNow = nowWithOffset.getMonth() + 1
      if (year === yearNow && month < monthNow) {
        return ctx.reply(pastError)
      }
      if (year === yearNow && !date && month === monthNow) {
        return ctx.reply(pastError)
      }
      const dateNow = nowWithOffset.getDate()
      if (year === yearNow && month === monthNow && date && +date < dateNow) {
        return ctx.reply(pastError)
      }
    }
    // Create todo
    const todo = {
      text: todoText,
      monthAndYear: monthAndYear
        ? monthAndYear
        : `${nowWithOffset.getFullYear()}-${month > 9 ? month : `0${month}`}`,
      date: monthAndYear
        ? date
        : `${
            nowWithOffset.getDate() > 9
              ? nowWithOffset.getDate()
              : `0${nowWithOffset.getDate()}`
          }`,
      frog: ctx.message.text.substr(1, 4) === 'frog',
      completed: ctx.message.text.substr(1, 4) === 'done',
    }
    if (user.settings.newTodosGoFirst) {
      user.todos = [
        (await new TodoModel({ ...todo, user: user._id }).save())._id,
      ].concat(user.todos)
    } else {
      user.todos = user.todos.concat([
        (await new TodoModel({ ...todo, user: user._id }).save())._id,
      ])
    }
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
}

async function update(ctx: ContextMessageUpdate, user: InstanceType<User>) {
  // Get current
  const current = await findCurrentForUser(user)
  // Update message
  if (current) {
    ctx.editMessageText(
      current.frog ? `🐸 ${current.text}` : current.text,
      Markup.inlineKeyboard([
        Markup.callbackButton('✅', 'done'),
        Markup.callbackButton('⏩', 'skip', current.skipped || current.frog),
        Markup.callbackButton('🔄', 'refresh'),
      ]).extra()
    )
  } else {
    ctx.editMessageText(`👍 You did it! All the tasks for today are done, go get rest or maybe dance a little 💃
      
👍 Вы это сделали! Все задачи на сегодня выполнены, идите отдохните — ну или потанцуйте немного 💃`)
  }
}

async function attachUser(ctx: ContextMessageUpdate, next: Function) {
  // Get user
  const user = await UserModel.findOne({ telegramId: `${ctx.from.id}` })
  if (!user) {
    await ctx.replyWithHTML(
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
  // Attach user and continue
  ctx.dbuser = user
  return next()
}

async function findCurrentForUser(
  user: InstanceType<User>
): Promise<InstanceType<Todo>> {
  // Get date
  const now = new Date()
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  const nowWithOffset = new Date(utc.getTime() + 3600000 * (user.timezone || 0))
  const month = nowWithOffset.getMonth() + 1
  const monthAndYear = `${nowWithOffset.getFullYear()}-${
    month > 9 ? month : `0${month}`
  }`
  const day =
    nowWithOffset.getDate() < 10
      ? `0${nowWithOffset.getDate()}`
      : nowWithOffset.getDate()
  // Find todos
  const todos = (
    await UserModel.findById(user.id).populate('todos')
  ).todos.filter((todo: Todo) => {
    return +todo.date === +day && todo.monthAndYear === monthAndYear
  }) as InstanceType<Todo>[]
  const incompleteTodos = todos
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (a.frog && b.frog) {
        return 0
      }
      if (a.frog) {
        return -1
      }
      if (b.frog) {
        return 1
      }
      if (a.skipped && b.skipped) {
        return 0
      }
      if (a.skipped) {
        return 1
      }
      if (b.skipped) {
        return -1
      }
      return 0
    })
  // Return current
  return (incompleteTodos.length ? incompleteTodos[0] : undefined) as
    | InstanceType<Todo>
    | undefined
}

bot.catch(err => console.log(err))

bot.launch()
