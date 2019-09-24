// Dependencies
import { Context } from 'koa'
import { Controller, Post, Put, Get, Delete } from 'koa-router-ts'
import { Todo, TodoModel } from '../models/todo'
import { authenticate } from '../middlewares/authenticate'
import { errors } from '../helpers/errors'
import { UserModel } from '../models'
import { InstanceType } from 'typegoose'
import { isTodoOld } from '../helpers/isTodoOld'
import { checkSubscription } from '../middlewares/checkSubscription'

@Controller('/todo')
export default class {
  @Post('/', authenticate, checkSubscription)
  async create(ctx: Context) {
    const addedTodoIds = []
    for (const todo of ctx.request.body) {
      // Create and save
      addedTodoIds.push(
        (await new TodoModel({ ...todo, user: ctx.state.user._id }).save())._id
      )
    }
    // Add todos to user
    if (ctx.state.user.settings.newTodosGoFirst) {
      ctx.state.user.todos = addedTodoIds.concat(ctx.state.user.todos)
    } else {
      ctx.state.user.todos = ctx.state.user.todos.concat(addedTodoIds)
    }
    await ctx.state.user.save()
    // Respond
    ctx.status = 200
  }

  @Put('/:id', authenticate)
  async edit(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    const {
      text,
      completed,
      frog,
      monthAndYear,
      date,
      today,
    } = ctx.request.body
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Edit and save
    todo.frog = frog
    if (isTodoOld(todo, today)) {
      todo.frogFails += 1
      if (todo.frogFails >= 2) {
        todo.frog = true
      }
    }
    if (todo.monthAndYear !== monthAndYear && todo.date !== date) {
      todo.skipped = false
    }
    todo.text = text
    todo.completed = completed
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
        if (a.frog && b.frog) {
          return 0
        }
        if (a.frog) {
          return -1
        }
        if (b.frog) {
          return 1
        }
        if (a.skipped && b.skipped) {
          return 0
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

  @Get('/', authenticate)
  async get(ctx: Context) {
    // Parameters
    const completed = ctx.query.completed === 'true'
    const hash = decodeURI(ctx.query.hash)
    // Find todos
    const todos = (await UserModel.findById(ctx.state.user.id).populate(
      'todos'
    )).todos
      .filter((todo: Todo) => todo.completed === completed)
      .filter(
        (todo: Todo) =>
          !hash || todo.text.toLowerCase().includes(hash.toLowerCase())
      )
      .map((todo: Todo) => todo.stripped())
      .sort((a, b) => {
        if (a.frog && b.frog) {
          return 0
        }
        if (a.frog) {
          return -1
        }
        if (b.frog) {
          return 1
        }
        if (a.skipped && b.skipped) {
          return 0
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

  @Post('/rearrange', authenticate)
  async rearrange(ctx: Context) {
    // Find user and populate todos
    const user = await UserModel.findById(ctx.state.user.id).populate('todos')
    // Split completed and uncompleted todos
    const completed = user.todos.filter(
      (todo: InstanceType<Todo>) => todo.completed
    )
    const uncompleted = user.todos.filter(
      (todo: InstanceType<Todo>) => !todo.completed
    )
    const uncompletedMap = uncompleted.reduce(
      (prev: any, cur: InstanceType<Todo>) => {
        prev[cur.id.toString()] = cur
        return prev
      },
      {}
    )
    // Sort uncompleted
    const tempUncompleted = []
    const todoSections = ctx.request.body.todos as {
      title: String
      todos: InstanceType<Todo>[]
    }[]
    for (const todoSection of todoSections) {
      const monthAndYear = todoSection.title.substr(0, 7)
      let date = todoSection.title.substr(8)
      if (!date) {
        date = undefined
      }
      for (const todo of todoSection.todos) {
        const userTodo = uncompletedMap[todo._id]
        uncompletedMap[todo._id] = undefined
        if (!userTodo) {
          continue
        }
        if (todo.monthAndYear !== monthAndYear || todo.date !== date) {
          userTodo.monthAndYear = monthAndYear
          userTodo.date = date
          userTodo.skipped = false
          await userTodo.save()
        }
        tempUncompleted.push(todo._id)
      }
    }
    // Merge the completed and uncompleted toods
    const merged = tempUncompleted
      .concat(
        Object.values(uncompletedMap)
          .filter(v => !!v)
          .map((v: InstanceType<Todo>) => v._id)
      )
      .concat(completed.map((v: InstanceType<Todo>) => v._id))
    // Save the todos
    user.todos = merged
    await user.save()
    // Respond
    ctx.status = 200
  }
}
