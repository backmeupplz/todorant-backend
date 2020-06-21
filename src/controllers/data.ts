// Dependencies
import { Controller, Post, Get } from 'koa-router-ts'
import { Context } from 'koa'
import { authenticate } from '../middlewares/authenticate'
import { path } from 'temp'
import { writeFileSync, unlinkSync } from 'fs'
import { bot } from '../helpers/report'
import { getTodos } from './todo'

@Controller('/data')
export default class {
  @Post('/', authenticate)
  async postData(ctx: Context) {
    const tempPath = path({ suffix: '.json' })
    console.log(tempPath)
    writeFileSync(tempPath, JSON.stringify(ctx.request.body, undefined, 2))
    await bot.telegram.sendMessage(
      process.env.ADMIN,
      `${ctx.state.user._id} ${ctx.state.user.name}`
    )
    await bot.telegram.sendDocument(process.env.ADMIN, { source: tempPath })
    unlinkSync(tempPath)
    ctx.status = 200
  }

  @Get('/', authenticate)
  async get(ctx: Context) {
    const incompleteTodos = await getTodos(ctx.state.user, false, '')
    const completeTodos = await getTodos(ctx.state.user, true, '')
    const allTodos = [...completeTodos, ...incompleteTodos].filter(
      (todo) => !todo.deleted
    )
    if (!allTodos) {
      return ''
    }
    let string = ''
    for (const todo of allTodos) {
      const dateFrom = `${new Date(todo.createdAt).toISOString()}`.substring(
        0,
        10
      )
      let dateCompleted = `${todo.monthAndYear}`
      if (todo.date) {
        dateCompleted += `-${todo.date}`
      }
      if (todo.completed) {
        string += `x ${dateCompleted} ${dateFrom} ${todo.text} due:${dateCompleted}\n`
      } else {
        string += `${todo.text} due:${dateCompleted}\n`
      }
    }

    ctx.status = 200
    ctx.body = string
  }
}
