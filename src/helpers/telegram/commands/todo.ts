import { DocumentType } from '@typegoose/typegoose'
import { linkify } from '@/helpers/linkify'
import { Context } from 'telegraf'
import { isUserSubscribed } from '@/helpers/isUserSubscribed'
import { TodoModel, getTitle, Todo } from '@/models/todo'
import { addTags } from '@/models/tag'
import { fixOrder } from '@/helpers/fixOrder'
import { requestSync } from '@/sockets/index'
import { Message } from 'telegraf/typings/telegram-types'
const dehumanize = require('dehumanize-date')

export function addTodo(ctx: Context) {
  let todoText = ctx.message.text.substr(6).trim()
  if (todoText.length > 1500) {
    return ctx.reply(ctx.i18n.t('text_too_long'))
  }
  return addTodoWithText(todoText, ctx)
}

export async function addTodoWithText(
  todoText: string,
  ctx: Context,
  sentMessage?: Message,
  voice?: boolean
) {
  // Check if it has timestamp
  const full = todoText.substr(0, 10) // 2018-08-31
  const short = todoText.substr(0, 7) // 2018-08
  const shorter = todoText.substr(0, 5) // 08-31
  const noDashWithoutDate = todoText.substr(0, 6) // 201808
  const noDash = todoText.substr(0, 8) // 20180831
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
  } else if (/^\d{2}-\d{2}$/.test(shorter)) {
    monthAndYear = `${new Date().getFullYear()}-${shorter.substr(0, 2)}`
    date = shorter.substr(3, 2)
    todoText = todoText.substr(5).trim()
  } else if (/^\d{8}$/.test(noDash)) {
    monthAndYear = `${noDash.substr(0, 4)}-${noDash.substr(4, 2)}`
    date = noDash.substr(6, 2)
    todoText = todoText.substr(8).trim()
  } else if (/^\d{6}$/.test(noDashWithoutDate)) {
    monthAndYear = `${noDashWithoutDate.substr(
      0,
      4
    )}-${noDashWithoutDate.substr(4, 2)}`
    todoText = todoText.substr(6).trim()
  }
  // Check for the dehumanizable date
  const components = todoText.split(':')
  if (components.length > 1) {
    const datePart = components[0]
    const dateString = dehumanize(datePart.toLowerCase())
    if (dateString) {
      todoText = todoText.substr(datePart.length + 1).trim()
      const components = dateString.split('-')
      monthAndYear = `${components[0]}-${components[1]}`
      date = components[2]
    }
  }
  // Check text
  if (!todoText) {
    return ctx.reply(ctx.i18n.t('no_todo_text'))
  }
  // Get user
  const user = ctx.dbuser
  // Check subscription
  if (!isUserSubscribed(user) && !voice) {
    return ctx.reply(ctx.i18n.t('subscribe_error'))
  } else if (!isUserSubscribed(user) && voice) {
    return await ctx.telegram.editMessageText(
      sentMessage.chat.id,
      sentMessage.message_id,
      null,
      ctx.i18n.t('subscribe_error')
    )
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
      const pastError = ctx.i18n.t('past_date_error')
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
      if (month > 12) {
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
      frog: ctx.message.text ? ctx.message.text.substr(1, 4) === 'frog' : false,
      completed: ctx.message.text
        ? ctx.message.text.substr(1, 4) === 'done'
        : false,
    }
    const dbtodo = (await new TodoModel({
      ...todo,
      user: user._id,
    }).save()) as DocumentType<Todo>
    // Fix order
    fixOrder(
      user,
      [getTitle(dbtodo)],
      user.settings.newTodosGoFirst ? [dbtodo] : [],
      user.settings.newTodosGoFirst ? [] : [dbtodo]
    )
    // Add tag
    addTags(
      user,
      [todo]
        .map((todo) => linkify.match(todo.text) || [])
        .reduce((p, c) => p.concat(c), [])
        .filter((m) => /^#[\u0400-\u04FFa-zA-Z_0-9/]+$/u.test(m.url))
        .map((m) => m.url.substr(1))
    )
    // Respond
    if (!voice) {
      ctx.reply('👍', {
        reply_to_message_id: ctx.message.message_id,
      })
    } else {
      // Edit message
      await ctx.telegram.editMessageText(
        sentMessage.chat.id,
        sentMessage.message_id,
        null,
        `👍 ${todoText}`
      )
    }
    // Trigger sync
    requestSync(user._id)
  } catch (err) {
    ctx.reply(`${ctx.i18n.t('add_todo_error')}

${err.message}`)
  }
}
