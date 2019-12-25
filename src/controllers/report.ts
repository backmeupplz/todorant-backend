// Dependencies
import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { User, TodoModel, ReportModel } from '../models'
import { InstanceType } from 'typegoose'
import * as randToken from 'rand-token'

@Controller('/report')
export default class {
  @Get('/', authenticate)
  async docs(ctx: Context) {
    const report = await getReport(ctx)
    ctx.body = report
  }

  @Get('/share', authenticate)
  async share(ctx: Context) {
    const report = await getReport(ctx)
    const dbreport = await new ReportModel({
      meta: report,
      user: ctx.state.user,
      uuid: randToken.generate(16),
      hash: ctx.query.hash ? ctx.query.hash : undefined,
    }).save()
    ctx.body = {
      uuid: dbreport.uuid,
    }
  }
}
async function getReport(ctx: Context) {
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
  return {
    completedTodosMap,
    completedFrogsMap,
  }
}
