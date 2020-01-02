import { ContextMessageUpdate, Markup } from 'telegraf'
import { findCurrentForUser } from '../helpers/findCurrent'
import { User } from '../../../models'
import { InstanceType } from 'typegoose'

export async function handleCurrent(ctx: ContextMessageUpdate) {
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
    ctx.reply(ctx.i18n.t('all_done'))
  }
}

export async function handleDone(ctx: ContextMessageUpdate) {
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
}

export async function handleSkip(ctx: ContextMessageUpdate) {
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
    ctx.editMessageText(ctx.i18n.t('all_done'))
  }
}
