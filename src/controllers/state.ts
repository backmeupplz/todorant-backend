// Dependencies
import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { errors } from '../helpers/errors'
import { UserModel, Todo, SubscriptionStatus } from '../models'
import { isTodoOld } from '../helpers/isTodoOld'

enum SubscriptionType {
  none = 'none',
  apple = 'apple',
  web = 'web',
}

@Controller('/state')
export default class {
  @Get('/', authenticate)
  async getPlanning(ctx: Context) {
    // Parameters
    const date = ctx.query.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      ctx.throw(403, errors.invalidFormat)
    }
    // Find todos
    let planning = false
    const todos = (await UserModel.findById(ctx.state.user.id).populate(
      'todos'
    )).todos.filter((todo: Todo) => !todo.completed) as Todo[]
    for (const todo of todos) {
      if (todo.hasOwnProperty('text') && isTodoOld(todo, date)) {
        planning = true
        break
      }
    }
    // Respond
    const subscriptionIdExists =
      !!ctx.state.user.subscriptionId || !!ctx.state.user.appleReceipt
    ctx.body = {
      planning,
      subscriptionStatus: ctx.state.user.subscriptionStatus,
      createdAt: ctx.state.user.createdAt,
      subscriptionIdExists,
      subscriptionType: subscriptionIdExists
        ? SubscriptionType.none
        : !ctx.state.user.subscriptionId
        ? SubscriptionType.apple
        : SubscriptionType.web,
      settings: ctx.state.user.settings,
    }
  }
}
