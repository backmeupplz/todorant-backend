import { Context, Markup } from 'telegraf'
import { DocumentType } from '@typegoose/typegoose'
import { TodoModel, getTitle } from '@/models/todo'
import { User } from '@/models/user'
import { compareTodos } from '@/controllers/todo'
import { findCurrentForUser } from '@/helpers/telegram/helpers/findCurrent'
import { fixOrder } from '@/helpers/fixOrder'
import { requestSync } from '@/sockets/index'

export async function handleCurrent(ctx: Context) {
  // Get user
  const user = ctx.dbuser
  // Get current
  const { todo, count } = await findCurrentForUser(user)
  const current = todo
  // Respond
  if (current) {
    ctx.reply(
      current.frog
        ? `🐸${current.time ? ` ${current.time}` : ''} ${current.text}`
        : current.text,
      Markup.inlineKeyboard([
        Markup.callbackButton('✅', 'done'),
        Markup.callbackButton(
          '⏩',
          'skip',
          current.skipped || current.frog || !!current.time || count <= 1
        ),
        Markup.callbackButton('🔄', 'refresh'),
      ]).extra()
    )
  } else {
    ctx.reply(ctx.i18n.t('all_done'))
  }
}

export async function handleDone(ctx: Context) {
  // Get user
  const user = ctx.dbuser
  // Get current
  const current = (await findCurrentForUser(user)).todo
  if (current) {
    current.completed = true
    await current.save()
    // Fix order
    await fixOrder(user, [getTitle(current)])
    // Trigger sync
    requestSync(user._id)
  }
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
}

export async function handleSkip(ctx: Context) {
  // Get user
  const user = ctx.dbuser
  // Get current
  const todo = (await findCurrentForUser(user)).todo
  if (todo) {
    // Find all neighbouring todos
    const neighbours = (
      await TodoModel.find({
        user: todo.user,
        monthAndYear: todo.monthAndYear,
        date: todo.date,
        completed: todo.completed,
        deleted: false,
      })
    ).sort(compareTodos(false))
    let startOffseting = false
    let offset = 0
    let foundValidNeighbour = false
    const todosToSave = [todo]
    for (const t of neighbours) {
      if (t._id.toString() === todo._id.toString()) {
        startOffseting = true
        continue
      }
      if (startOffseting) {
        offset++
        if (!t.skipped) {
          t.order -= offset
          todosToSave.push(t)
          foundValidNeighbour = true
          break
        }
      }
    }
    if (!foundValidNeighbour) {
      neighbours.forEach((n, i) => {
        if (i > 0) {
          n.order--
          todosToSave.push(n)
        }
      })
    }
    todo.order += offset
    // Edit and save
    todo.skipped = true
    await TodoModel.create(todosToSave)
    // Fix order
    await fixOrder(user, [getTitle(todo)], undefined, undefined, [todo])
    // Trigger sync
    requestSync(user._id)
  }
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
}

export async function handleRefresh(ctx: Context) {
  // Get user
  const user = ctx.dbuser
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
}

async function update(ctx: Context, user: DocumentType<User>) {
  // Get current
  const { todo, count } = await findCurrentForUser(user)
  const current = todo
  // Update message
  if (current) {
    ctx.editMessageText(
      current.frog
        ? `🐸${current.time ? ` ${current.time}` : ''} ${current.text}`
        : current.text,
      Markup.inlineKeyboard([
        Markup.callbackButton('✅', 'done'),
        Markup.callbackButton(
          '⏩',
          'skip',
          current.skipped || current.frog || !!current.time || count <= 1
        ),
        Markup.callbackButton('🔄', 'refresh'),
      ]).extra()
    )
  } else {
    ctx.editMessageText(ctx.i18n.t('all_done'))
  }
}
