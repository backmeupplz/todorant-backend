// Dependencies
import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { User, TodoModel } from '../models'
import { InstanceType } from 'typegoose'

@Controller('/report')
export default class {
  @Get('/', authenticate)
  async docs(ctx: Context) {
    const user = ctx.state.user as InstanceType<User>
    const hash = ctx.query.hash
    let todos = await TodoModel.find({
      user: user._id,
      completed: true,
      date: { $exists: true },
    })
    if (!!hash) {
      todos = todos.filter(t => t.text.includes(`#${hash}`))
    }
    const completedTodosMap = {} as { [index: string]: number }
    for (const todo of todos) {
      const key = `${todo.monthAndYear}-${todo.date}`
      if (completedTodosMap[key]) {
        completedTodosMap[key] = completedTodosMap[key] + 1
      } else {
        completedTodosMap[key] = 1
      }
    }
    let frogs = await TodoModel.find({
      user: user._id,
      completed: true,
      frog: true,
      date: { $exists: true },
    })
    if (!!hash) {
      frogs = frogs.filter(t => t.text.includes(`#${hash}`))
    }
    const completedFrogsMap = {} as { [index: string]: number }
    for (const todo of frogs) {
      const key = `${todo.monthAndYear}-${todo.date}`
      if (completedFrogsMap[key]) {
        completedFrogsMap[key] = completedFrogsMap[key] + 1
      } else {
        completedFrogsMap[key] = 1
      }
    }
    ctx.body = {
      completedTodosMap,
      completedFrogsMap,
    }
  }
}
