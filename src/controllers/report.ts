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
    let todos = await TodoModel.find({ user: user._id, completed: true })
    todos = todos.filter(todo => !!todo.date)
    const completedTodosMap = {} as { [index: string]: number }
    for (const todo of todos) {
      const key = `${todo.monthAndYear}-${todo.date}`
      if (completedTodosMap[key]) {
        completedTodosMap[key] = completedTodosMap[key] + 1
      } else {
        completedTodosMap[key] = 1
      }
    }
    ctx.body = {
      completedTodosMap,
    }
  }
}
