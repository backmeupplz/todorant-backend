import { linkify } from '../helpers/linkify'
import { Context } from 'koa'
import { Controller, Post, Put, Get, Delete } from 'koa-router-ts'
import { Todo, TodoModel, getTitle } from '../models/todo'
import { authenticate } from '../middlewares/authenticate'
import { errors } from '../helpers/errors'
import { UserModel, User, addTags, HeroModel, TagModel } from '../models'
import { InstanceType } from 'typegoose'
import { isTodoOld } from '../helpers/isTodoOld'
import { checkSubscription } from '../middlewares/checkSubscription'
import { requestSync } from '../sockets'
import { fixOrder } from '../helpers/fixOrder'
import { getStateBody } from './state'
import { getTagsBody } from './tag'
import { getPoints } from './hero'
import { updateTodos } from '../helpers/googleCalendar'
import { _d } from '../helpers/encryption'
import { getTags } from '../helpers/getTags'
const fuzzysort = require('fuzzysort')

@Controller('/todo')
export default class {
  @Post('/', authenticate, checkSubscription)
  async create(ctx: Context) {
    if (ctx.request.body.todos) {
      ctx.request.body = ctx.request.body.todos
    }
    // Check the password
    const password = ctx.headers.password
    if (password) {
      const todos = await TodoModel.find({
        user: ctx.state.user._id,
        encrypted: true,
      }).limit(1)
      if (todos.length) {
        const todo = todos[0]
        const decrypted = _d(todo.text, password)
        if (!decrypted) {
          return ctx.throw(errors.wrongDecryptionPassword)
        }
      }
    }
    if (!Array.isArray(ctx.request.body)) {
      ctx.request.body = [ctx.request.body]
    }
    const todosGoingOnTop: Todo[] = []
    const todosGoingToBottom: Todo[] = []
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
      if (todo.completed) {
        await HeroModel.findOneAndUpdate(
          { user: ctx.state.user.id },
          { $inc: { points: 1 } }
        )
        const tagsArray = getTags(ctx.request.body, password)
        await addEpicPoints(ctx.state.user, tagsArray)
      }
      const goingOnTop =
        (ctx.state.user.settings.newTodosGoFirst &&
          todo.goFirst === undefined) ||
        todo.goFirst === true
      if (goingOnTop) {
        todosGoingOnTop.push(
          await new TodoModel({ ...todo, user: ctx.state.user._id }).save()
        )
      } else {
        todosGoingToBottom.push(
          await new TodoModel({ ...todo, user: ctx.state.user._id }).save()
        )
      }
    }
    // Fix order
    const titlesInvolved = Array.from(
      todosGoingOnTop.concat(todosGoingToBottom).reduce((prev, cur) => {
        prev.add(getTitle(cur))
        return prev
      }, new Set<string>())
    )
    await fixOrder(
      ctx.state.user,
      titlesInvolved,
      todosGoingOnTop,
      todosGoingToBottom,
      [...todosGoingOnTop, ...todosGoingToBottom]
    )
    // Add tags
    const tagsArray = getTags(ctx.request.body, password)
    await addTags(ctx.state.user, tagsArray)
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      todosGoingOnTop.concat(todosGoingToBottom),
      ctx.state.user.settings.googleCalendarCredentials,
      password
    )
  }

  @Delete('/all', authenticate)
  async deleteAll(ctx: Context) {
    // Find user and populate todos
    const user = await UserModel.findById(ctx.state.user.id)
    // Get todos
    const todos = await TodoModel.find({ user: user._id })
    // Remove todos from user
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
    // Get password
    const password = ctx.headers.password
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    // Note previous title
    const prevTitle = getTitle(todo)
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
    if (completed) {
      await HeroModel.findOneAndUpdate(
        { user: ctx.state.user.id },
        { $inc: { points: 1 } }
      )
      const tagsArray = getTags(ctx.request.body, password)
      await addEpicPoints(ctx.state.user, tagsArray)
    }
    if (typeof completed === 'string' || completed instanceof String) {
      todo.completed = completed === '1'
    } else {
      todo.completed = completed
    }
    todo.monthAndYear = monthAndYear
    todo.date = date || undefined
    todo.time = time || undefined
    await todo.save()
    // Fix order
    await fixOrder(
      ctx.state.user,
      [prevTitle, getTitle(todo)],
      undefined,
      undefined,
      [todo]
    )
    // Add tags
    const tagsArray = getTags([todo], password)
    await addTags(ctx.state.user, tagsArray)
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      [todo],
      ctx.state.user.settings.googleCalendarCredentials,
      password
    )
  }

  @Put('/:id/done', authenticate)
  async done(ctx: Context) {
    // Parameters
    const id = ctx.params.id
    const password = ctx.headers.password
    // Find todo
    const todo = await TodoModel.findById(id)
    // Check ownership
    if (!todo || todo.user.toString() !== ctx.state.user._id.toString()) {
      return ctx.throw(404, errors.noTodo)
    }
    //Add hero point
    await HeroModel.findOneAndUpdate(
      { user: ctx.state.user.id },
      { $inc: { points: 1 } }
    )
    const tagsArray = getTags([todo], password)
    await addEpicPoints(ctx.state.user, tagsArray)
    // Edit and save
    todo.completed = true
    await todo.save()
    // Fix order
    await fixOrder(ctx.state.user, [getTitle(todo)])
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      [todo],
      ctx.state.user.settings.googleCalendarCredentials,
      ctx.headers.password
    )
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
    if (!todo.date || todo.completed) {
      return ctx.throw(403)
    }
    // Find all neighbouring todos
    const neighbours = (
      await TodoModel.find({
        user: todo.user,
        monthAndYear: todo.monthAndYear,
        date: todo.date,
        completed: todo.completed,
        deleted: false,
      })
    ).sort(compareTodos(false))
    let startOffseting = false
    let offset = 0
    let foundValidNeighbour = false
    const todosToSave = [todo]
    for (const t of neighbours) {
      if (t._id.toString() === todo._id.toString()) {
        startOffseting = true
        continue
      }
      if (startOffseting) {
        offset++
        if (!t.skipped) {
          t.order -= offset
          todosToSave.push(t)
          foundValidNeighbour = true
          break
        }
      }
    }
    if (!foundValidNeighbour) {
      neighbours.forEach((n, i) => {
        if (i > 0) {
          n.order--
          todosToSave.push(n)
        }
      })
    }
    todo.order += offset
    // Edit and save
    todo.skipped = true
    await TodoModel.create(todosToSave)
    // Fix order
    await fixOrder(ctx.state.user, [getTitle(todo)], undefined, undefined, [
      todo,
    ])
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
    // Fix order
    await fixOrder(ctx.state.user, [getTitle(todo)], undefined, undefined, [
      todo,
    ])
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      [todo],
      ctx.state.user.settings.googleCalendarCredentials,
      ctx.headers.password
    )
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
    // Fix order
    await fixOrder(ctx.state.user, [getTitle(todo)])
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      [todo],
      ctx.state.user.settings.googleCalendarCredentials,
      ctx.headers.password
    )
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
      (todo) => {
        return todo.date === day && todo.monthAndYear === monthAndYear
      }
    )
    const completeTodos = (await getTodos(ctx.state.user, true, '')).filter(
      (todo) => {
        return todo.date === day && todo.monthAndYear === monthAndYear
      }
    )
    // Respond
    ctx.body = {
      todosCount: completeTodos.length + incompleteTodos.length,
      incompleteTodosCount: incompleteTodos.length,
      todo: incompleteTodos.length ? incompleteTodos[0] : undefined,
      state: await getStateBody(ctx),
      tags: await getTagsBody(ctx),
      points: await getPoints(ctx),
    }
  }

  @Get('/', authenticate)
  async get(ctx: Context) {
    // Parameters
    const completed = ctx.query.completed === 'true'
    const hash = decodeURI(ctx.query.hash || '')
    const queryString = decodeURI(ctx.query.queryString || '')
    const password = ctx.headers.password
    // Find todos
    let todos = await getTodos(
      ctx.state.user,
      completed,
      hash,
      queryString,
      password
    )
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
      const monthAndYearMinusOne = monthAndYearPlus(monthAndYear, -1)
      const monthAndYearPlusOne = monthAndYearPlus(monthAndYear, 1)
      todos = todos.filter((todo) =>
        [monthAndYear, monthAndYearMinusOne, monthAndYearPlusOne].includes(
          todo.monthAndYear
        )
      )
    }
    // Respond
    ctx.body = {
      todos,
      state: await getStateBody(ctx),
      tags: await getTagsBody(ctx),
      points: await getPoints(ctx),
    }
  }

  @Post('/rearrange', authenticate)
  async rearrange(ctx: Context) {
    const today = ctx.request.body.today
    if (!today) {
      return ctx.throw(403)
    }
    // Get old todo sections
    const oldTodos = (
      await TodoModel.find({ user: ctx.state.user._id })
    ).filter((todo) => !todo.deleted)
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
      title: string
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
        const newTodoTitle = section.title
        const oldTodo = oldTodoMap[newTodo._id]
        if (!oldTodo) {
          i++
          continue
        }
        titlesToReorder.add(oldTodo.title)
        titlesToReorder.add(newTodoTitle)
        if (oldTodo.title !== newTodoTitle) {
          if (isTodoOld(oldTodo.todo, today)) {
            oldTodo.todo.frogFails += 1
            if (oldTodo.todo.frogFails >= 2) {
              oldTodo.todo.frog = true
            }
          }
          oldTodo.todo.date =
            newTodoTitle.length === 7 ? undefined : newTodoTitle.substr(8)
          oldTodo.todo.monthAndYear = newTodoTitle.substr(0, 7)
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
      .map((t) => t._id)
      .reduce((prev, cur) => {
        prev[cur] = true
        return prev
      }, {} as { [index: string]: boolean })
    for (const title of titlesToReorder) {
      const todos = oldTodoSections[title]
      if (!todos) {
        continue
      }
      const newTodos = todos.filter((t) => !!newTodoIdsMap[t._id])
      const oldTodos = todos.filter((t) => !newTodoIdsMap[t._id])
      let i = newTodos.length
      for (const todo of oldTodos) {
        if (todo.order !== i) {
          todo.order = i
          modifiedTodos.add(todo)
        }
      }
    }
    // Save
    const savedTodos = await TodoModel.create(
      Array.from(modifiedTodos.values())
    )
    // Reorder if required
    if (ctx.state.user.settings.preserveOrderByTime) {
      fixOrder(ctx.state.user, Array.from(titlesToReorder))
    }
    // Respond
    ctx.status = 200
    // Trigger sync
    requestSync(ctx.state.user._id)
    // Update calendar
    updateTodos(
      savedTodos,
      ctx.state.user.settings.googleCalendarCredentials,
      ctx.headers.password
    )
  }
}

export async function getTodos(
  user: InstanceType<User>,
  completed: Boolean,
  hash: string,
  queryString?: string,
  password?: string
) {
  const hashes = hash.toLowerCase().split(',')
  let results: Todo[] = (await TodoModel.find({ user: user._id }))
    .filter((todo) => !todo.deleted)
    .filter((todo) => todo.completed === completed)
    .map((todo) => {
      if (todo.encrypted && password) {
        const decrypted = _d(todo.text, password)
        if (decrypted) {
          ;(todo as any).decryptedText = decrypted
        }
      }
      return todo
    })
  for (const singleHash of hashes) {
    results = results.filter(
      (todo) =>
        !hash ||
        todo.text.toLowerCase().includes(singleHash) ||
        ((todo as any).decryptedText &&
          (todo as any).decryptedText.toLowerCase().includes(singleHash))
    )
  }
  results = results.map((todo) => todo.stripped()).sort(compareTodos(completed))
  if (!queryString) {
    return results.map((todo) => {
      ;(todo as any).decryptedText = undefined
      return todo
    })
  } else {
    const filteredResults = (
      await fuzzysort.goAsync(
        queryString,
        results.map((todo) => {
          if (!(todo as any).decryptedText) {
            ;(todo as any).decryptedText = todo.text
          }
          return todo
        }),
        {
          key: 'text',
          threshold: -1000,
        }
      )
    ).map((result) => {
      result.obj.decryptedText = undefined
      return result.obj
    })
    return filteredResults
  }
}

export function compareTodos(completed: Boolean) {
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

function monthAndYearPlus(monthAndYear: string, numberOfMonths: number) {
  let year = parseInt(monthAndYear.substr(0, 4), 10)
  let month = parseInt(monthAndYear.substr(5, 2), 10)
  month += numberOfMonths
  if (month <= 0) {
    year--
    month = 12 + month
  }
  if (month > 12) {
    year++
    month = month - 12
  }
  return `${year}-${month < 10 ? `0${month}` : month}`
}

export async function addEpicPoints(user: User, tags: string[]) {
  const epics = (await TagModel.find({ user: user, deleted: false, tag: tags }))
    .filter((tag) => tag.epic)
    .filter((epic) => epic.epicPoints <= epic.epicGoal)
    .map((epic) => epic.tag)
  await TagModel.updateMany(
    { user: user, tag: epics, deleted: false },
    { $inc: { epicPoints: 1 } }
  )
}
