import { Controller, Ctx, Flow, Get, Post } from 'koa-ts-controllers'
import { Context } from 'koa'
import { authenticate } from '@/middlewares/authenticate'
import { path } from 'temp'
import { writeFileSync, unlinkSync } from 'fs'
import { bot } from '@/helpers/report'
import { _d } from '@/helpers/encryption'
import { getTodos } from '@/controllers/todo'
import { admins } from '@/helpers/telegram/admins'

@Controller('/data')
export default class DataController {
  @Post('/')
  @Flow(authenticate)
  async postData(@Ctx() ctx: Context) {
    const tempPath = path({ suffix: '.json' })
    writeFileSync(tempPath, JSON.stringify(ctx.request.body, undefined, 2))
    await bot.telegram.sendMessage(
      admins[0],
      `${ctx.state.user._id} ${ctx.state.user.name}`
    )
    await bot.telegram.sendDocument(admins[0], { source: tempPath })
    unlinkSync(tempPath)
    ctx.status = 200
  }

  @Get('/')
  @Flow(authenticate)
  async get(@Ctx() ctx: Context) {
    const password = ctx.headers.password
    const incompleteTodos = await getTodos(ctx.state.user, false, '')
    const completeTodos = await getTodos(ctx.state.user, true, '')
    const allTodos = [...completeTodos, ...incompleteTodos]
      .filter((todo) => !todo.deleted)
      .map((todo) => {
        if (todo.encrypted && password) {
          todo.text = _d(todo.text, password)
        }
        return todo
      })
    let string = ''
    for (const todo of allTodos) {
      const dateCreated = `${new Date(todo.createdAt).toISOString()}`.substring(
        0,
        10
      )
      let dateDue = `${todo.monthAndYear}`
      if (todo.date) {
        dateDue += `-${todo.date}`
      }
      if (todo.completed) {
        string += `x ${dateDue} ${dateCreated} ${todo.text} due:${dateDue}\n`
      } else {
        string += `${todo.text} due:${dateDue}\n`
      }
    }

    ctx.status = 200
    return string
  }
}
