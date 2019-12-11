// Dependencies
import { Context } from 'koa'
import { Controller, Post, Put, Get, Delete } from 'koa-router-ts'
import { Todo, TodoModel } from '../models/todo'
import { authenticate } from '../middlewares/authenticate'
import { errors } from '../helpers/errors'
import { UserModel, User } from '../models'
import { InstanceType } from 'typegoose'
import { isTodoOld } from '../helpers/isTodoOld'
import { checkSubscription } from '../middlewares/checkSubscription'

@Controller('/todo')
export default class {
  @Post('/', authenticate, checkSubscription)
  async create(ctx: Context) {
    if (ctx.request.body.todos) {
      ctx.request.body = ctx.request.body.todos
    }
    if (!Array.isArray(ctx.request.body)) {
      ctx.request.body = [ctx.request.body]
    }
    const addedToTopTodoIds = []
    const addedToBottomTodoIds = []
    for (const todo of ctx.request.body) {
      if (typeof todo.frog === 'string' || todo.frog instanceof String) {
        todo.frog = todo.frog === '1'
      }
      if (
        typeof todo.completed === 'string' ||
        todo.completed instanceof String
      ) {
        todo.completed = todo.completed === '1'
      }
      if (
        (ctx.state.user.settings.newTodosGoFirst &&
          todo.goFirst === undefined) ||
        todo.goFirst === true
      ) {
        // Create and save
        addedToTopTodoIds.push(
          (await new TodoModel({ ...todo, user: ctx.state.user._id }).save())
            ._id
        )
      } else {
        // Create and save
        addedToBottomTodoIds.push(
          (await new TodoModel({ ...todo, user: ctx.state.user._id }).save())
            ._id
        )
      }
    }
    // Add todos to user
    ctx.state.user.todos = addedToTopTodoIds.concat(ctx.state.user.todos)
    ctx.state.user.todos = ctx.state.user.todos.concat(addedToBottomTodoIds)
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
    if (typeof frog === 'string' || frog instanceof String) {
      todo.frog = frog === '1'
    } else {
      todo.frog = frog
    }
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
    if (typeof completed === 'string' || completed instanceof String) {
      todo.completed = completed === '1'
    } else {
      todo.completed = completed
    }
    todo.monthAndYear = monthAndYear
    todo.date = date || undefined
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
    // Remove from user
    ctx.state.user.todos = ctx.state.user.todos.filter(
      todoId => todoId.toString() !== id
    )
    await ctx.state.user.save()
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
    const incompleteTodos = (await getTodos(ctx.state.user, false, '')).filter(
      todo => {
        return todo.date === day && todo.monthAndYear === monthAndYear
      }
    )
    const completeTodos = (await getTodos(ctx.state.user, true, '')).filter(
      todo => {
        return todo.date === day && todo.monthAndYear === monthAndYear
      }
    )
    // Respond
    ctx.body = {
      todosCount: completeTodos.length + incompleteTodos.length,
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
    let todos = await getTodos(ctx.state.user, completed, hash)
    if (
      !ctx.request.query.calendarView ||
      ctx.request.query.calendarView === 'false' ||
      !ctx.request.query.today ||
      ctx.request.query.today === 'false'
    ) {
      if (
        ctx.request.query.skip !== undefined &&
        ctx.request.query.limit !== undefined
      ) {
        todos = todos.slice(
          +ctx.request.query.skip,
          +ctx.request.query.skip + +ctx.request.query.limit
        )
      }
    } else {
      const monthAndYear = ctx.request.query.today.substr(0, 7)
      todos = todos.filter(todo => todo.monthAndYear === monthAndYear)
    }
    // Respond
    ctx.body = todos
  }

  @Post('/rearrange', authenticate)
  async rearrange(ctx: Context) {
    // Find user and populate todos
    const user = await UserModel.findById(ctx.state.user.id).populate('todos')
    // Get todos
    const todos = user.todos as InstanceType<Todo>[]
    // Split completed and uncompleted todos
    const completed = todos.filter(todo => todo.completed)
    const uncompleted = todos.filter(todo => !todo.completed)
    const uncompletedMap = uncompleted.reduce((prev, cur) => {
      prev[cur._id] = cur
      return prev
    }, {})
    // Sort uncompleted
    const tempUncompleted = []
    const todoSections = ctx.request.body.todos as {
      title: String
      todos: InstanceType<Todo>[]
    }[]
    for (const todoSection of todoSections) {
      const monthAndYear = todoSection.title.substr(0, 7)
      const date = todoSection.title.substr(8) || undefined
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

export async function getTodos(
  user: InstanceType<User>,
  completed: Boolean,
  hash: string
) {
  // Get priorities
  const priorities = user.todos.reduce((prev, cur, i) => {
    prev[cur.toString()] = i
    return prev
  }, {}) as { [index: string]: number }
  return (await TodoModel.find({ user: user._id }))
    .filter(todo => todo.completed === completed)
    .filter(
      todo => !hash || todo.text.toLowerCase().includes(hash.toLowerCase())
    )
    .map(todo => todo.stripped())
    .sort(compareTodos(completed, priorities))
}

function compareTodos(
  completed: Boolean,
  priorities: { [index: string]: number }
) {
  return (a: InstanceType<Todo>, b: InstanceType<Todo>) => {
    if (a.date === b.date && a.monthAndYear === b.monthAndYear) {
      if (a.frog && b.frog) {
        return (priorities[a._id] || 0) < (priorities[b._id] || 0) ? -1 : 1
      }
      if (a.frog) {
        return -1
      }
      if (b.frog) {
        return 1
      }
      if (a.skipped && b.skipped) {
        return (priorities[a._id] || 0) < (priorities[b._id] || 0) ? -1 : 1
      }
      if (a.skipped) {
        return 1
      }
      if (b.skipped) {
        return -1
      }
      return (priorities[a._id] || 0) < (priorities[b._id] || 0) ? -1 : 1
    } else {
      if (!a.date && b.date && a.monthAndYear === b.monthAndYear) {
        return -1
      } else if (!a.date && b.date && a.monthAndYear === b.monthAndYear) {
        return 1
      } else if (!a.date || !b.date) {
        if (a.monthAndYear < b.monthAndYear) {
          return completed ? 1 : -1
        } else {
          return completed ? -1 : 1
        }
      } else {
        if (`${a.monthAndYear}-${a.date}` < `${b.monthAndYear}-${b.date}`) {
          return completed ? 1 : -1
        } else {
          return completed ? -1 : 1
        }
      }
    }
  }
}
