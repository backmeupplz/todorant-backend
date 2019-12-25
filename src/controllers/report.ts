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
    const todos = await TodoModel.find({
      user: user._id,
      completed: true,
      date: { $exists: true },
    })
    console.log(todos.length)
    const completedTodosMap = {} as { [index: string]: number }
    for (const todo of todos) {
      const key = `${todo.monthAndYear}-${todo.date}`
      if (completedTodosMap[key]) {
        completedTodosMap[key] = completedTodosMap[key] + 1
      } else {
        completedTodosMap[key] = 1
      }
    }
    const frogs = await TodoModel.find({
      user: user._id,
      completed: true,
      frog: true,
      date: { $exists: true },
    })
    console.log(frogs.length)
    const completedFrogsMap = {} as { [index: string]: number }
    for (const todo of frogs) {
      const key = `${todo.monthAndYear}-${todo.date}`
      if (completedFrogsMap[key]) {
        completedFrogsMap[key] = completedFrogsMap[key] + 1
      } else {
        completedFrogsMap[key] = 1
      }
    }
    console.log({
      completedTodosMap,
      completedFrogsMap,
    })
    ctx.body = {
      completedTodosMap,
      completedFrogsMap,
    }
  }
}
