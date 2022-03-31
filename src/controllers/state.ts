import { Context } from 'koa'
import { Controller, Ctx, Flow, Get } from 'koa-ts-controllers'
import { SubscriptionStatus } from '@/models/user'
import { authenticate } from '@/middlewares/authenticate'
import { errors } from '@/helpers/errors'
import { getTodos } from '@/controllers/todo'
import { isTodoOld } from '@/helpers/isTodoOld'
import { pick } from 'lodash'

enum SubscriptionType {
  none = 'none',
  apple = 'apple',
  web = 'web',
  google = 'google',
}

@Controller('/state')
export default class StateController {
  @Get('/')
  @Flow(authenticate)
  async getState(@Ctx() ctx: Context) {
    return await getStateBody(ctx)
  }
}

export async function getStateBody(ctx: Context) {
  // Parameters
  const date = ctx.query.date
  const time = ctx.query.time
  const startTimeOfDay = ctx.state.user.settings.startTimeOfDay
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    ctx.throw(403, errors.invalidFormat)
  }
  // Find todos
  let planning = false
  const todos = await getTodos(ctx.state.user, false, '')

  for (const todo of todos) {
    if (
      todo.hasOwnProperty('text') &&
      isTodoOld(todo, date, time, startTimeOfDay)
    ) {
      planning = true
      break
    }
  }
  // Respond
  const subscriptionIdExists =
    ctx.state.user.subscriptionStatus !== SubscriptionStatus.inactive &&
    !ctx.state.user.isPerpetualLicense &&
    (!!ctx.state.user.subscriptionId ||
      !!ctx.state.user.appleReceipt ||
      !!ctx.state.user.googleReceipt)
  return {
    planning,
    subscriptionStatus: ctx.state.user.subscriptionStatus,
    createdAt: ctx.state.user.createdAt,
    subscriptionIdExists,
    subscriptionType: subscriptionIdExists
      ? SubscriptionType.none
      : !ctx.state.user.subscriptionId
      ? SubscriptionType.apple
      : !ctx.state.user.googleReceipt
      ? SubscriptionType.web
      : SubscriptionType.google,
    settings: ctx.state.user.settings,
    userInfo: pick(ctx.state.user, 'name'),
  }
}
