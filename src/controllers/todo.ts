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
import { requestSync } from '../sockets'

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
      if (!todo.time) {
        todo.time = undefined
      }
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
    // Trigger sync
    requestSync(ctx.state.user._id)
  }

  @Delete('/all', authenticate)
  async deleteAll(ctx: Context) {
    // Find user and populate todos
    const user = await UserModel.findById(ctx.state.user.id)
    // Get todos
    const todos = await TodoModel.find({ user: user._id })
    // Remove todos from user
    user.todos = []
    await user.save()
    // Remove all todos
    for (const todo of todos) {
      await TodoModel.findByIdAndRemove(todo._id)
    }
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
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
      time,
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
    todo.time = time || undefined
    await todo.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
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
    // Trigger sync
    requestSync(ctx.state.user._id)
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
    // Trigger sync
    requestSync(ctx.state.user._id)
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
    // Trigger sync
    requestSync(ctx.state.user._id)
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
    todo.deleted = true
    await todo.save()
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
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
    // Get old todo sections
    const oldTodos = (
      await TodoModel.find({ user: ctx.state.user._id })
    ).filter(todo => !todo.deleted)
    const oldTodoSections = oldTodos.reduce((prev, cur) => {
      const title = cur.date
        ? `${cur.monthAndYear}-${cur.date}`
        : cur.monthAndYear
      prev[title] = (prev[title] || []).concat([cur])
      return prev
    }, {} as { [index: string]: InstanceType<Todo>[] })
    const oldTodoMap = oldTodos.reduce((prev, cur) => {
      const title = cur.date
        ? `${cur.monthAndYear}-${cur.date}`
        : cur.monthAndYear
      prev[cur.id] = {
        title,
        todo: cur,
      }
      return prev
    }, {} as { [index: string]: { title: string; todo: InstanceType<Todo> } })
    // Get new todo sections
    const newTodoSections = ctx.request.body.todos as {
      title: String
      todos: InstanceType<Todo>[]
    }[]
    // Placeholder for modified todos
    const modifiedTodos = new Set<Todo>()
    // Placeholder for titles in need of reordering
    const titlesToReorder = new Set<string>()
    // Loop through new todo sections
    for (const section of newTodoSections) {
      let i = 0
      for (const newTodo of section.todos) {
        const newTodoTitle = newTodo.date
          ? `${newTodo.monthAndYear}-${newTodo.date}`
          : newTodo.monthAndYear
        const oldTodo = oldTodoMap[newTodo.id]
        if (!oldTodo) {
          i++
          continue
        }
        titlesToReorder.add(oldTodo.title)
        titlesToReorder.add(newTodoTitle)
        if (oldTodo.title !== newTodoTitle) {
          oldTodo.todo.date = newTodo.date
          oldTodo.todo.time = newTodo.time
          modifiedTodos.add(oldTodo.todo)
        }
        if (oldTodo.todo.order !== i) {
          oldTodo.todo.order = i
          modifiedTodos.add(oldTodo.todo)
        }
        i++
      }
    }
    // Reorder
    const newTodoIdsMap = newTodoSections
      .reduce((prev, cur) => prev.concat(cur.todos), [] as Todo[])
      .map(t => t._id)
      .reduce((prev, cur) => {
        prev[cur] = true
        return prev
      }, {} as { [index: string]: boolean })
    for (const title of titlesToReorder) {
      const todos = oldTodoSections[title]
      const newTodos = todos.filter(t => !!newTodoIdsMap[t._id])
      const oldTodos = todos.filter(t => !newTodoIdsMap[t._id])
      let i = newTodos.length
      for (const todo of oldTodos) {
        if (todo.order !== i) {
          todo.order = i
          modifiedTodos.add(todo)
        }
      }
    }
    // Save
    await TodoModel.create(modifiedTodos)
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
  }
}

export async function getTodos(
  user: InstanceType<User>,
  completed: Boolean,
  hash: string
) {
  return (await TodoModel.find({ user: user._id }))
    .filter(todo => !todo.deleted)
    .filter(todo => todo.completed === completed)
    .filter(
      todo => !hash || todo.text.toLowerCase().includes(hash.toLowerCase())
    )
    .map(todo => todo.stripped())
    .sort(compareTodos(completed))
}

function compareTodos(completed: Boolean) {
  return (a: InstanceType<Todo>, b: InstanceType<Todo>) => {
    if (a.date === b.date && a.monthAndYear === b.monthAndYear) {
      if (a.frog && b.frog) {
        return a.order < b.order ? -1 : 1
      }
      if (a.frog) {
        return -1
      }
      if (b.frog) {
        return 1
      }
      if (a.skipped && b.skipped) {
        return a.order < b.order ? -1 : 1
      }
      if (a.skipped) {
        return 1
      }
      if (b.skipped) {
        return -1
      }
      return a.order < b.order ? -1 : 1
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
