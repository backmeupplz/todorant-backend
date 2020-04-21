import { ContextMessageUpdate, Markup } from 'telegraf'
import { findCurrentForUser } from '../helpers/findCurrent'
import { User, TodoModel, getTitle } from '../../../models'
import { InstanceType } from 'typegoose'
import { compareTodos } from '../../../controllers/todo'
import { fixOrder } from '../../../helpers/fixOrder'
import { requestSync } from '../../../sockets'

export async function handleCurrent(ctx: ContextMessageUpdate) {
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

export async function handleDone(ctx: ContextMessageUpdate) {
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

export async function handleSkip(ctx: ContextMessageUpdate) {
  // Get user
  const user = ctx.dbuser
  // Get current
  const todo = (await findCurrentForUser(user)).todo
  if (todo) {
    // Find all neighbouring todos
    const neighbours = (
      await TodoModel.find({
        monthAndYear: todo.monthAndYear,
        date: todo.date,
        completed: todo.completed,
      })
    ).sort(compareTodos(false))
    let startOffseting = false
    let offset = 0
    const todosToSave = [todo]
    for (const t of neighbours) {
      if (t._id.toString() === todo._id.toString()) {
        startOffseting = true
        continue
      }
      if (startOffseting) {
        offset++
        t.order -= 1
        todosToSave.push(t)
        if (!t.skipped) {
          break
        }
      }
    }
    todo.order += offset
    // Edit and save
    todo.skipped = true
    todo.order++
    await TodoModel.create(todosToSave)
    // Fix order
    await fixOrder(user, [getTitle(todo)])
    // Trigger sync
    requestSync(user._id)
  }
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
}

export async function handleRefresh(ctx: ContextMessageUpdate) {
  // Get user
  const user = ctx.dbuser
  // Respond
  ctx.answerCbQuery()
  // Update message
  return update(ctx, user)
}

async function update(ctx: ContextMessageUpdate, user: InstanceType<User>) {
  // Get current
  const { todo, count } = await findCurrentForUser(user)
  const current = todo
  // Update message
  if (current) {
    ctx.editMessageText(
      current.frog ? `🐸 ${current.text}` : current.text,
      Markup.inlineKeyboard([
        Markup.callbackButton('✅', 'done'),
        Markup.callbackButton(
          '⏩',
          'skip',
          current.skipped || current.frog || !!current.text || count <= 1
        ),
        Markup.callbackButton('🔄', 'refresh'),
      ]).extra()
    )
  } else {
    ctx.editMessageText(ctx.i18n.t('all_done'))
  }
}
