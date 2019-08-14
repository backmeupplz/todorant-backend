// Dependencies
import axios from 'axios'
import { Context } from 'koa'
import { Controller, Post, Put, Get } from 'koa-router-ts'
import { Todo, TodoModel } from '../models/todo'
import { InstanceType } from 'typegoose'
import { authenticate } from '../middlewares/authenticate'
import { errors } from '../helpers/errors'
import { UserModel } from '../models'

@Controller('/todo')
export default class {
  @Post('/', authenticate)
  async create(ctx: Context) {
    // Parameters
    const { text, completed, frog, monthAndYear, date } = ctx.request.body
    // Create and save
    const todo = new Todo() as InstanceType<Todo>
    todo.user = ctx.state.user
    todo.text = text
    todo.completed = completed
    todo.frog = frog
    todo.monthAndYear = monthAndYear
    todo.date = date
    await todo.save()
    // Respond
    ctx.status = 200
  }

  @Put('/:id', authenticate)
  async edit(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    const { text, completed, frog, monthAndYear, date } = ctx.request.body
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user !== ctx.state.user.id) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.user = ctx.state.user
    todo.text = text
    todo.completed = completed
    todo.frog = frog
    todo.monthAndYear = monthAndYear
    todo.date = date
    await todo.save()
    // Respond
    ctx.status = 200
  }

  @Put('/:id/done', authenticate)
  async done(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user !== ctx.state.user.id) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.completed = true
    await todo.save()
    // Respond
    ctx.status = 200
  }

  @Get('/', authenticate)
  async get(ctx: Context) {
    // Parameters
    const completed = ctx.params.completed || false
    // Find todos
    const todos = (await UserModel.findById(ctx.state.user.id).populate(
      'todos'
    )).todos
      .filter((todo: Todo) => todo.completed === completed)
      .map((todo: Todo) => todo.stripped())
    // Respond
    ctx.body = todos
  }
}
