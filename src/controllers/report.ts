import { Controller, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '@middlewares/authenticate'
import { User } from '@models/user'
import { TodoModel } from '@models/todo'
import { DocumentType } from '@typegoose/typegoose'
import * as randToken from 'rand-token'
import { _d } from '@helpers/encryption'
import { ReportModel } from '@models/report'

@Controller('/report')
export default class {
  @Get('/public/:uuid')
  async publicReport(ctx: Context) {
    const uuid = ctx.params.uuid
    const report = await ReportModel.findOne({ uuid })
    if (!report) {
      return ctx.throw(404)
    }
    ctx.body = await report.strippedAndFilled()
  }

  @Get('/', authenticate)
  async report(ctx: Context) {
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
  const user = ctx.state.user as DocumentType<User>
  const hash = ctx.query.hash
  const startDate = ctx.query.startDate || undefined
  const endDate = ctx.query.endDate || undefined
  const password = ctx.headers.password
  let todos = await TodoModel.find({
    user: user._id,
    completed: true,
    date: { $exists: true },
    deleted: false,
  })
  todos = todos.filter((t) => !!t.date)
  todos.forEach((todo) => {
    if (todo.encrypted && password) {
      const decrypted = _d(todo.text, password)
      if (decrypted) {
        todo.text = decrypted
      }
    }
  })
  if (hash) {
    todos = todos.filter((t) =>
      t.text.toLowerCase().includes(`#${hash}`.toLowerCase())
    )
  }
  if (startDate) {
    todos = todos.filter(
      (t) =>
        new Date(`${t.monthAndYear}-${t.date}`).getTime() >=
        new Date(startDate).getTime()
    )
  }
  if (endDate) {
    todos = todos.filter(
      (t) =>
        new Date(`${t.monthAndYear}-${t.date}`).getTime() <=
        new Date(endDate).getTime()
    )
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
  if (hash) {
    frogs = frogs.filter((t) => t.text.includes(`#${hash}`))
  }
  if (startDate) {
    frogs = frogs.filter(
      (t) =>
        new Date(`${t.monthAndYear}-${t.date}`).getTime() >=
        new Date(startDate).getTime()
    )
  }
  if (endDate) {
    frogs = frogs.filter(
      (t) =>
        new Date(`${t.monthAndYear}-${t.date}`).getTime() <=
        new Date(endDate).getTime()
    )
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
