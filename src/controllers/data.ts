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

    for (let todo of allTodos) {
      const dateFrom = `${new Date(todo.createdAt).toISOString()}`.substring(
        0,
        10
      )
      const dateCompleted = `${todo.monthAndYear}-${todo.date}`
      const textWithHashtags = todo.text.split(' ')
      let textWithoutHashtags = ''
      let hashtags = ''
      let priority

      if (todo.frog) {
        priority = 'A'
      }

      if (!priority) {
        priority = String.fromCharCode(65 + todo.order)
      }

      textWithHashtags.forEach((word) => {
        if (word.startsWith('#')) hashtags += `${word} `
        else textWithoutHashtags += `${word} `
      })

      if (todo.completed) {
        string += `x ${dateCompleted} ${dateFrom} ${textWithoutHashtags}${hashtags}due:${dateCompleted}\n`
      } else {
        string += `(${priority}) ${textWithoutHashtags}${hashtags}\n`
      }
    }

    ctx.status = 200
    ctx.body = string
  }
}
