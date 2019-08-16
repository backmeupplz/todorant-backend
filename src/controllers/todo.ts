// Dependencies
import { Context } from 'koa'
import { Controller, Post, Put, Get, Delete } from 'koa-router-ts'
import { Todo, TodoModel } from '../models/todo'
import { authenticate } from '../middlewares/authenticate'
import { errors } from '../helpers/errors'
import { UserModel } from '../models'

@Controller('/todo')
export default class {
  @Post('/', authenticate)
  async create(ctx: Context) {
    const addedTodoIds = []
    for (const todo of ctx.request.body) {
      // Create and save
      addedTodoIds.push(
        (await new TodoModel({ ...todo, user: ctx.state.user._id }).save())._id
      )
    }
    // Add todos to user
    ctx.state.user.todos = ctx.state.user.todos.concat(addedTodoIds)
    await ctx.state.user.save()
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
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
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
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.completed = true
    await todo.save()
    // Respond
    ctx.status = 200
  }

  @Put('/:id/undone', authenticate)
  async undone(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.completed = false
    await todo.save()
    // Respond
    ctx.status = 200
  }

  @Delete('/:id', authenticate)
  async delete(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    await todo.remove()
    // Respond
    ctx.status = 200
  }

  @Get('/', authenticate)
  async get(ctx: Context) {
    // Parameters
    const completed = ctx.query.completed === 'true'
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
