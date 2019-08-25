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

  @Put('/:id/skip', authenticate)
  async skip(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.skipped = true
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

  @Get('/current', authenticate)
  async getCurrent(ctx: Context) {
    // Parameters
    const date = ctx.query.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      ctx.throw(403, errors.invalidFormat)
    }
    // Find todos
    const day = date.substr(8)
    const monthAndYear = date.substr(0, 7)
    const todos = (await UserModel.findById(ctx.state.user.id).populate(
      'todos'
    )).todos
      .filter((todo: Todo) => {
        return todo.date === day && todo.monthAndYear === monthAndYear
      })
      .map((todo: Todo) => todo.stripped())
    const incompleteTodos = todos
      .filter(t => !t.completed)
      .sort((a, b) => {
        if (a.frog) {
          return -1
        }
        if (b.frog) {
          return 1
        }
        if (a.skipped) {
          return 1
        }
        if (b.skipped) {
          return -1
        }
        return 0
      })
    // Respond
    ctx.body = {
      todosCount: todos.length,
      incompleteTodosCount: incompleteTodos.length,
      todo: incompleteTodos.length ? incompleteTodos[0] : undefined,
    }
  }

  @Get('/planning', authenticate)
  async getPlanning(ctx: Context) {
    // Parameters
    const date = ctx.query.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      ctx.throw(403, errors.invalidFormat)
    }
    const day = date.substr(8)
    const monthAndYear = date.substr(0, 7)
    // Find todos
    let planning = false
    const todos = (await UserModel.findById(ctx.state.user.id).populate(
      'todos'
    )).todos as Todo[]
    for (const todo of todos) {
      if (!todo.date && todo.monthAndYear === monthAndYear) {
        planning = true
        break
      }
      if (todo.monthAndYear === monthAndYear && +todo.date < +day) {
        planning = true
        break
      }
    }
    // Respond
    ctx.body = { planning }
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
      .sort((a, b) => {
        if (a.frog) {
          return -1
        }
        if (b.frog) {
          return 1
        }
        if (a.skipped) {
          return 1
        }
        if (b.skipped) {
          return -1
        }
        return 0
      })
    // Respond
    ctx.body = todos
  }
}
